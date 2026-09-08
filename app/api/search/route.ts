import { NextResponse } from 'next/server'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages'
import type { Document } from '@langchain/core/documents'
import { createChatModel } from '@/lib/llm'
import { getVectorStore } from '@/lib/pinecone'
import { createClient } from '@/lib/supabase/server'
import type { SourceReview } from '@/types/chat'

export const runtime = 'nodejs'
export const maxDuration = 60

/** LLM에게 주는 역할(시스템 프롬프트). 모든 프롬프트 중 우선순위가 가장 높습니다. */
const SYSTEM_TEMPLATE = `당신은 쇼핑 리뷰 분석 전문가입니다.
아래 <context>에 있는 실제 구매 리뷰만 근거로 사용자의 질문에 답변하세요.

규칙:
- 모든 답변은 한국어로 작성합니다.
- 리뷰에 없는 내용은 절대 지어내지 마세요. 근거가 부족하면 "리뷰에서 확인할 수 없습니다"라고 답하세요.
- 긍정과 부정 의견이 함께 있으면 양쪽을 모두 알려주세요.
- 답변은 3~6문장으로 간결하게 쓰고, 필요하면 짧은 목록을 사용하세요.

<context>
{context}
</context>`

/** 검색된 리뷰 문서를 프롬프트에 넣을 문자열로 만듭니다. */
function formatContext(documents: Document[]) {
  return documents
    .map((document, index) => {
      const metadata = document.metadata as Record<string, unknown>
      return [
        `[리뷰 ${index + 1}]`,
        `평점: ${metadata.rating}점`,
        `제목: ${metadata.title}`,
        `내용: ${metadata.content}`,
        `작성자: ${metadata.author} / 작성일: ${metadata.date}`,
      ].join('\n')
    })
    .join('\n\n')
}

/** 화면의 "참고한 리뷰" 카드에 넘겨줄 형태로 변환합니다. */
function toSources(documents: Document[]): SourceReview[] {
  const seen = new Set<string>()
  const sources: SourceReview[] = []

  for (const document of documents) {
    const metadata = document.metadata as Record<string, unknown>
    const reviewId = String(metadata.reviewId ?? '')
    if (seen.has(reviewId)) continue
    seen.add(reviewId)

    sources.push({
      id: reviewId,
      rating: Number(metadata.rating) || 0,
      title: String(metadata.title ?? ''),
      content: String(metadata.content ?? ''),
      author: String(metadata.author ?? ''),
      date: String(metadata.date ?? ''),
      verifiedPurchase: Boolean(metadata.verifiedPurchase),
    })
  }

  return sources
}

export async function POST(request: Request) {
  try {
    const { query, chatId } = (await request.json()) as {
      query?: string
      chatId?: string | null
    }

    if (!query?.trim()) {
      return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 })
    }

    const supabase = createClient()

    // ------------------------------------------------------------
    // 1. 대화방 준비 + 사용자 메시지 저장
    //    새로고침하거나 다른 대화로 이동했다가 돌아와도 내역이 남습니다.
    // ------------------------------------------------------------
    let currentChatId = chatId ?? null

    if (!currentChatId) {
      const { data, error } = await supabase
        .from('chats')
        .insert({ title: query.trim().slice(0, 40) })
        .select('id')
        .single()

      if (error) throw new Error(`대화방 생성 실패: ${error.message}`)
      currentChatId = data.id
    }

    await supabase
      .from('messages')
      .insert({ chat_id: currentChatId, role: 'user', content: query })

    // 이전 대화 6개를 불러와 문맥을 유지합니다.
    // LLM 요청은 무상태(stateless)라서, 이렇게 직접 넣어줘야 "기억"하는 것처럼 동작합니다.
    const { data: previousMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', currentChatId)
      .order('created_at', { ascending: false })
      .limit(7)

    const history: BaseMessage[] = (previousMessages ?? [])
      .slice(1) // 방금 저장한 현재 질문은 제외
      .reverse()
      .map((message) =>
        message.role === 'user'
          ? new HumanMessage(message.content)
          : new AIMessage(message.content),
      )

    // ------------------------------------------------------------
    // 2. 벡터 검색 + LLM 설정
    // ------------------------------------------------------------
    const vectorStore = await getVectorStore()
    // 질문과 가장 유사한 리뷰 5개를 불러옵니다.
    const retriever = vectorStore.asRetriever({ k: 5 })

    // LLM은 .env 의 LLM_PROVIDER 로 교체할 수 있습니다 (기본값: 무료인 제미나이)
    const chat = createChatModel()

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_TEMPLATE],
      new MessagesPlaceholder('history'),
      ['human', '{input}'],
    ])

    // ------------------------------------------------------------
    // 3. LCEL 체인 — 검색 → 프롬프트 구성 → LLM → 문자열 파싱
    // ------------------------------------------------------------
    type ChainInput = { input: string; history: BaseMessage[] }

    const chain = RunnableSequence.from([
      {
        // 벡터 데이터베이스에서 관련 리뷰를 가져오고, 원본 문서도 함께 들고 갑니다.
        context: async (chainInput: ChainInput) => {
          const documents = await retriever.invoke(chainInput.input)
          return { documents, formatted: formatContext(documents) }
        },
        input: (chainInput: ChainInput) => chainInput.input,
        history: (chainInput: ChainInput) => chainInput.history,
      },
      {
        // 답변 생성
        answer: RunnableSequence.from([
          (step: {
            context: { formatted: string }
            input: string
            history: BaseMessage[]
          }) => ({
            context: step.context.formatted,
            input: step.input,
            history: step.history,
          }),
          prompt,
          chat,
          new StringOutputParser(),
        ]),
        // 근거로 사용한 문서 반환
        documents: (step: { context: { documents: Document[] } }) =>
          step.context.documents,
      },
    ])

    const response = (await chain.invoke({ input: query, history })) as {
      answer: string
      documents: Document[]
    }

    const sources = toSources(response.documents)

    // ------------------------------------------------------------
    // 4. AI 답변 저장
    // ------------------------------------------------------------
    await supabase.from('messages').insert({
      chat_id: currentChatId,
      role: 'assistant',
      content: response.answer,
      sources,
    })

    return NextResponse.json({
      chatId: currentChatId,
      answer: response.answer,
      sources,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: `답변 생성 실패: ${message}`,
        hint: 'Pinecone에 인덱싱을 했는지, .env 의 LLM 키(GOOGLE_API_KEY 등)가 올바른지 확인하세요.',
      },
      { status: 500 },
    )
  }
}
