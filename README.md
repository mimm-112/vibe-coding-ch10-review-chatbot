# 챕터 10 — 쇼핑 리뷰 분석 챗봇 (RAG)

《요즘 바이브 코딩》 **챕터 10 쇼핑 리뷰 분석 챗봇 만들기** 실습 결과물입니다.
LangChain + Pinecone + OpenAI로 만든 **RAG(검색 증강 생성)** 챗봇입니다.
학습되지 않은 상품 리뷰 100건을 벡터 데이터베이스에서 검색해, **근거와 함께** 답변합니다.

## 동작 흐름

```
CSV 리뷰 100건
   │ ① CSVLoader          (LangChain Document Loader)
   │ ② TextSplitter       (문맥 유지하며 분할)
   │ ③ PineconeEmbeddings (llama-text-embed-v2 → 1024차원 벡터)
   ▼
Pinecone 인덱스 ◀────────────┐
   │                        │ ④ 질문도 같은 모델로 임베딩
   │ ⑤ 유사도 상위 5건 검색   │
   ▼                        │
LCEL Chain ──▶ gpt-5-nano ──▶ 답변 + 참고한 리뷰 카드
   (prompt | model | parser)
```

## 기술 스택

| 요소 | 사용 기술 | 이유 |
| --- | --- | --- |
| 프런트 + 백엔드 | Next.js 16 (App Router, Route Handlers) | 별도 백엔드 서버 없이 API 제공 |
| RAG 오케스트레이션 | LangChain.js (LCEL) | 로더 · 스플리터 · 임베딩 · 리트리버 표준화 |
| 벡터 DB | Pinecone (serverless) | 관리형, 무료 요금제 |
| 임베딩 | `llama-text-embed-v2` (Pinecone Inference) | **무료** — OpenAI 임베딩은 별도 과금 |
| 답변 생성 | OpenAI `gpt-5-nano` | 가장 저렴한 모델 (실습에 $5면 충분) |
| 대화 기록 · 리뷰 원본 | Supabase (PostgreSQL) | 새로고침해도 대화가 남음 |

## 실행 방법

### 1. Pinecone 설정

1. [pinecone.io](https://www.pinecone.io) 가입 → **API keys** → 키 복사
2. 인덱스는 **직접 만들지 않아도 됩니다.** [샘플 데이터 인덱싱] 버튼을 누르면
   `ensureIndex()`가 알아서 만듭니다 (`dimension 1024`, `cosine`, AWS `us-east-1`).
3. 직접 만들 거라면 **[Custom settings]** 로 위 설정 그대로 만드세요.

> ⚠️ 인덱스를 만들 때 UI에서 **모델(llama-text-embed-v2)을 선택**하면
> "integrated embedding" 인덱스가 됩니다. 이 방식은 텍스트 레코드 전용 API를 쓰기 때문에
> LangChain `PineconeStore`의 벡터 업로드가 거부됩니다.
> 이 프로젝트는 **Pinecone Inference API로 임베딩만 따로 호출**하고
> 벡터는 일반 인덱스에 넣는 방식을 씁니다. 결과적으로 같은 모델을 무료로 사용합니다.

### 2. Supabase 설정

1. **New project** → 이름 `chat`, Region `Northeast Asia (Seoul)`
2. **[Connect → App Frameworks]** 에서 Next.js / App Router / supabase-js 선택 후 환경 변수 복사

```bash
npx supabase login
npx supabase link      # chat 프로젝트 선택
npx supabase db push   # reviews / chats / messages 테이블 + RLS 생성
```

> `db push` 후에도 테이블이 안 보이면 대시보드 **[SQL Editor]** 에
> `supabase/migrations/20251230000000_init_chat.sql` 내용을 붙여넣고 Run 하면 됩니다.

### 3. OpenAI 설정

1. [platform.openai.com](https://platform.openai.com) → **API keys** → **Create new secret key**
2. **Billing → Add to credit balance** 에서 최소 $5 충전 (API는 구독과 별개로 과금됩니다)

### 4. 환경 변수 & 실행

```bash
cp .env.example .env    # 값 채우기
npm install
npm run dev             # http://localhost:3000
```

1. 왼쪽 아래 **[샘플 데이터 인덱싱]** 클릭
   → 수파베이스 `reviews` 100행 + Pinecone 벡터 100개 생성
2. 질문 입력 → 답변 아래 **[참고한 리뷰 N건]** 을 펼쳐 근거 확인

## 프로젝트 구조

```
app/
├─ page.tsx                 서버 컴포넌트 — 초기 데이터(대화목록·요약) 조회
├─ ChatApp.tsx              'use client' — 채팅 화면 전체 상태
└─ api/
   ├─ index-data/route.ts   CSV → 수파베이스 + Pinecone 인덱싱
   ├─ search/route.ts       ★ RAG 핵심 (LCEL 체인)
   ├─ chats/route.ts        대화 목록
   ├─ chats/[id]/route.ts   대화 내역 조회 / 삭제
   └─ summary/route.ts      리뷰 요약 통계
lib/
├─ pinecone.ts              PineconeEmbeddings + PineconeStore + ensureIndex
├─ reviews.ts               CSVLoader → Document 변환
├─ summary.ts               평점·감정 분포·장단점 키워드 집계
└─ supabase/server.ts
components/                 Sidebar · MessageBubble · SourceCard · ReviewSummaryCard …
samples/review.csv          샘플 리뷰 100건 (평균 4.0점, 1~5점 고루 분포)
supabase/migrations/        테이블 + RLS
```

## RAG 핵심 코드 (`app/api/search/route.ts`)

```ts
// 1. 벡터 검색 준비 — 질문과 가장 유사한 리뷰 5건
const retriever = (await getVectorStore()).asRetriever({ k: 5 })

// 2. 역할 부여 — system 프롬프트가 가장 높은 우선순위를 가집니다
const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_TEMPLATE],      // {context} 변수 포함
  new MessagesPlaceholder('history'), // 이전 대화 (무상태 API를 상태 있게 만드는 부분)
  ['human', '{input}'],
])

// 3. LCEL — 검색 → 프롬프트 → LLM → 문자열 파싱을 파이프로 연결
const chain = RunnableSequence.from([
  { context: retrieve, input: pick('input'), history: pick('history') },
  { answer: RunnableSequence.from([format, prompt, chat, new StringOutputParser()]),
    documents: pickDocs },
])
```

**LLM 요청은 무상태(stateless)** 입니다. 이전 요청을 기억하지 못합니다.
그래서 `MessagesPlaceholder('history')` 에 지난 대화를 직접 넣어줘야
AI가 문맥을 기억하는 것처럼 동작합니다. 대신 대화가 길어지면 토큰이 늘어나므로
이 프로젝트는 **최근 6개 메시지만** 넣습니다.

## 한글 입력 시 메시지 두 번 전송되는 버그 (교재 p.233)

한글은 IME가 자음·모음을 조합하기 때문에, 조합 중 Enter는
"글자 확정"과 "전송" 두 의미를 동시에 갖습니다. `components/ChatInput.tsx`에서 이렇게 막았습니다.

```ts
if (isComposingRef.current || event.nativeEvent.isComposing) return
```

## 자주 만나는 오류

| 오류 / 증상 | 원인과 해결 |
| --- | --- |
| `PINECONE_API_KEY 를 설정하세요` | `.env` 확인 후 `npm run dev` 재시작 |
| 인덱싱 시 벡터 업로드 거부 | integrated embedding 인덱스입니다. 인덱스를 삭제하고 버튼을 다시 누르세요 |
| `수파베이스 저장 실패` | `npx supabase db push` 미실행 또는 RLS 정책 누락 |
| 답변이 리뷰와 무관 | 인덱싱을 안 했거나 Pinecone 인덱스가 비어 있음 |
| `429 insufficient_quota` | OpenAI 크레딧 충전 필요 (Billing) |
| 답변이 느림 | `gpt-5-nano`는 저렴한 대신 응답이 느릴 수 있습니다 |

## 비용 메모

- 임베딩 : **$0** (Pinecone Inference 무료 티어)
- 벡터 DB : **$0** (Pinecone Starter)
- 대화 : `gpt-5-nano` 기준 질문 1건당 수십~수백 토큰. $5면 실습 내내 충분합니다.
