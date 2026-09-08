import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'

/**
 * 답변 생성에 사용할 LLM을 고릅니다.
 *
 * 이 프로젝트에서 돈이 드는 부분은 여기 하나뿐입니다.
 * (Pinecone Starter, Pinecone 임베딩, 수파베이스는 모두 무료 요금제로 충분합니다.)
 * 그래서 LLM만 교체할 수 있게 만들어두고, 기본값을 무료인 제미나이로 두었습니다.
 *
 * .env 의 LLM_PROVIDER 값으로 선택합니다.
 *   gemini (기본) : 구글 AI 스튜디오 무료 API 키. 카드 등록 불필요.
 *   ollama        : 내 컴퓨터에서 모델을 직접 실행. 완전 무료, 인터넷도 불필요.
 *   openai        : 교재와 동일. 최소 $5 크레딧 충전 필요.
 */
export type LlmProvider = 'gemini' | 'ollama' | 'openai'

export function getLlmProvider(): LlmProvider {
  const provider = (process.env.LLM_PROVIDER ?? 'gemini').toLowerCase()

  if (provider === 'openai' || provider === 'ollama' || provider === 'gemini') {
    return provider
  }

  throw new Error(
    `LLM_PROVIDER 값이 올바르지 않습니다: ${provider} (gemini | ollama | openai 중 하나)`,
  )
}

/** 화면에 표시할 현재 모델 이름 */
export function getModelLabel(provider: LlmProvider = getLlmProvider()) {
  switch (provider) {
    case 'gemini':
      return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
    case 'ollama':
      return process.env.OLLAMA_MODEL ?? 'llama3.2'
    case 'openai':
      return process.env.OPENAI_MODEL ?? 'gpt-5-nano'
  }
}

export function createChatModel(): BaseChatModel {
  const provider = getLlmProvider()

  if (provider === 'gemini') {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(
        '.env 에 GOOGLE_API_KEY 를 설정하세요. aistudio.google.com/apikey 에서 무료로 발급할 수 있습니다.',
      )
    }

    return new ChatGoogleGenerativeAI({
      model: getModelLabel('gemini'),
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.3,
    })
  }

  if (provider === 'ollama') {
    // 사용 전에 터미널에서 모델을 한 번 내려받아야 합니다.
    //   brew install ollama && ollama serve
    //   ollama pull llama3.2
    return new ChatOllama({
      model: getModelLabel('ollama'),
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
      temperature: 0.3,
    })
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('.env 에 OPENAI_API_KEY 를 설정하세요.')
  }

  return new ChatOpenAI({
    model: getModelLabel('openai'),
    apiKey: process.env.OPENAI_API_KEY,
  })
}
