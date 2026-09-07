import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeEmbeddings, PineconeStore } from '@langchain/pinecone'

/**
 * Pinecone(벡터 데이터베이스) + LangChain 연동 설정.
 *
 * 임베딩 모델은 엔비디아의 llama-text-embed-v2 를 사용합니다.
 * 성능 때문이 아니라, Pinecone Inference API로 **무료** 사용이 가능하기 때문입니다.
 * (OpenAI text-embedding-3-small 을 쓰면 임베딩에도 요금이 붙습니다.)
 */

export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX ?? 'review-chatbot'
export const EMBEDDING_MODEL = 'llama-text-embed-v2'
export const EMBEDDING_DIMENSION = 1024

let pineconeClient: Pinecone | null = null

export function getPineconeClient() {
  const apiKey = process.env.PINECONE_API_KEY
  if (!apiKey) {
    throw new Error('.env 파일에 PINECONE_API_KEY 를 설정하세요.')
  }

  pineconeClient ??= new Pinecone({ apiKey })
  return pineconeClient
}

/**
 * 인덱스가 없으면 만들어 줍니다.
 * 콘솔에서 직접 만들 때 설정을 틀리는 경우가 많아 코드에서 한 번 더 보장합니다.
 *   - dimension 1024 (llama-text-embed-v2 출력 차원)
 *   - metric cosine
 *   - AWS us-east-1 (무료 요금제에서 사용 가능한 리전)
 */
export async function ensureIndex() {
  const pinecone = getPineconeClient()
  const { indexes } = await pinecone.listIndexes()

  if (indexes?.some((index) => index.name === PINECONE_INDEX_NAME)) return

  await pinecone.createIndex({
    name: PINECONE_INDEX_NAME,
    dimension: EMBEDDING_DIMENSION,
    metric: 'cosine',
    spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    waitUntilReady: true,
  })
}

/** LangChain에서 사용할 임베딩 모델 */
export function getEmbeddings() {
  return new PineconeEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: process.env.PINECONE_API_KEY,
  })
}

/**
 * LangChain VectorStore.
 * PINECONE_HOST 를 넣어두면 인덱스 주소를 조회하는 요청을 한 번 아낄 수 있습니다.
 */
export async function getVectorStore() {
  const pinecone = getPineconeClient()
  const host = process.env.PINECONE_HOST

  const pineconeIndex = host
    ? pinecone.index(PINECONE_INDEX_NAME, host)
    : pinecone.index(PINECONE_INDEX_NAME)

  return PineconeStore.fromExistingIndex(getEmbeddings(), {
    pineconeIndex,
    maxConcurrency: 5,
  })
}
