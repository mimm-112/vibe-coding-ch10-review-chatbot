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
LCEL Chain ──▶   LLM     ──▶ 답변 + 참고한 리뷰 카드
   (prompt | model | parser)
```

## 기술 스택

| 요소 | 사용 기술 | 이유 |
| --- | --- | --- |
| 프런트 + 백엔드 | Next.js 16 (App Router, Route Handlers) | 별도 백엔드 서버 없이 API 제공 |
| RAG 오케스트레이션 | LangChain.js (LCEL) | 로더 · 스플리터 · 임베딩 · 리트리버 표준화 |
| 벡터 DB | Pinecone (serverless) | 관리형, 무료 요금제 |
| 임베딩 | `llama-text-embed-v2` (Pinecone Inference) | **무료** — OpenAI 임베딩은 별도 과금 |
| 답변 생성 | **Gemini / Ollama / OpenAI 선택** | 기본값은 **무료**인 제미나이 (`LLM_PROVIDER`로 교체) |
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

### 3. LLM API 키 발급 (기본값: 무료 제미나이)

[aistudio.google.com/apikey](https://aistudio.google.com/apikey) 에서 **Create API key** 를 누르면
카드 등록 없이 무료 키가 나옵니다. 이 키를 `.env` 의 `GOOGLE_API_KEY` 에 넣으세요.

유료 없이 쓰는 다른 방법(Ollama)이나 교재대로 OpenAI를 쓰는 방법은
아래 [비용 섹션](#비용--전부-무료로-돌릴-수-있습니다)을 참고하세요.

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
├─ llm.ts                   답변 생성 모델 선택 (gemini / ollama / openai)
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

## 배포 (Vercel)

이미 배포되어 있습니다 → **https://vibe-coding-ch10-review-chatbot.vercel.app**

배포된 사이트도 로컬과 **똑같은 환경 변수**가 있어야 동작합니다.
키를 채팅이나 커밋에 노출하지 않고 올리는 방법은 두 가지입니다.

### 방법 1 — 스크립트로 한 번에 (권장)

로컬 `.env` 값을 그대로 Vercel에 올립니다. 값이 화면에 출력되지 않습니다.

```bash
./scripts/push-env.sh
npx vercel --prod        # 재배포해야 반영됩니다
```

### 방법 2 — Vercel 대시보드에서 직접 입력

<https://vercel.com/yooo18/vibe-coding-ch10-review-chatbot/settings/environment-variables>

`.env.example` 에 적힌 키를 하나씩 추가한 뒤 **Redeploy** 를 누르면 됩니다.

### 깃허브 연동 (선택)

지금은 CLI로 업로드한 상태라 `git push` 해도 자동 배포되지 않습니다.
[Vercel GitHub 앱](https://github.com/apps/vercel)을 설치하고 프로젝트 설정에서
저장소를 연결하면, 이후로는 푸시할 때마다 자동 배포됩니다.

## 자주 만나는 오류

| 오류 / 증상 | 원인과 해결 |
| --- | --- |
| `PINECONE_API_KEY 를 설정하세요` | `.env` 확인 후 `npm run dev` 재시작 |
| 인덱싱 시 벡터 업로드 거부 | integrated embedding 인덱스입니다. 인덱스를 삭제하고 버튼을 다시 누르세요 |
| `수파베이스 저장 실패` | `npx supabase db push` 미실행 또는 RLS 정책 누락 |
| 답변이 리뷰와 무관 | 인덱싱을 안 했거나 Pinecone 인덱스가 비어 있음 |
| `429` (제미나이) | 무료 티어 분당 요청 제한. 잠시 후 재시도 |
| `429 insufficient_quota` (OpenAI) | 크레딧 충전 필요 (Billing) |
| `fetch failed` (Ollama) | `ollama serve` 가 실행 중인지 확인 |
| 답변이 느림 | 저렴한/로컬 모델은 응답이 느릴 수 있습니다 |

## 비용 — 전부 무료로 돌릴 수 있습니다

| 항목 | 비용 | 비고 |
| --- | --- | --- |
| 임베딩 (`llama-text-embed-v2`) | **$0** | Pinecone Inference 무료 티어 |
| 벡터 DB (Pinecone) | **$0** | Starter 요금제, 카드 등록 불필요 |
| 대화 기록 (Supabase) | **$0** | Free 요금제 |
| 답변 생성 LLM | **선택** | 아래 참고 |

돈이 드는 부분은 **답변 생성 LLM 하나뿐**이라 교체할 수 있게 만들어 두었습니다.
`.env` 의 `LLM_PROVIDER` 값만 바꾸면 됩니다.

### `LLM_PROVIDER=gemini` (기본값 · 추천)

카드 등록 없이 무료로 쓸 수 있습니다.

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) 접속 → **Create API key**
2. `.env` 에 붙여넣기

```bash
LLM_PROVIDER=gemini
GOOGLE_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

> 무료 티어에는 분당/일당 요청 수 제한이 있습니다. 실습 정도면 충분하지만
> 연속으로 빠르게 물어보면 `429` 가 날 수 있습니다. 잠시 기다렸다 다시 보내면 됩니다.

### `LLM_PROVIDER=ollama` (완전 무료 · 오프라인)

가입도 API 키도 필요 없습니다. 내 컴퓨터에서 모델이 돌아갑니다.

```bash
brew install ollama
ollama serve          # 별도 터미널에서 실행해두기
ollama pull llama3.2  # 약 2GB 다운로드
```

```bash
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

> 답변 품질과 속도는 컴퓨터 사양을 탑니다. 한국어 답변은 제미나이가 더 자연스럽습니다.

### `LLM_PROVIDER=openai` (교재와 동일)

교재 그대로 따라가고 싶을 때만 사용하세요. **최소 $5 크레딧 충전이 필요합니다.**

1. [platform.openai.com](https://platform.openai.com) → **API keys** → **Create new secret key**
2. **Billing → Add to credit balance** 에서 $5 충전

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-nano
```

현재 어떤 모델로 답변 중인지는 채팅 화면 헤더 오른쪽에 표시됩니다.
