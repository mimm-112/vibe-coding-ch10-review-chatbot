-- ============================================================
-- 챕터 10 쇼핑 리뷰 분석 챗봇 : 초기 스키마
--   reviews  : 원본 리뷰 데이터 (Pinecone에는 벡터, 여기에는 원문 보관)
--   chats    : 대화방
--   messages : 대화 메시지 (user / assistant)
--
-- 이 프로젝트는 로그인 없이 사용하므로 anon 역할에도 접근을 허용합니다.
-- 실제 서비스라면 반드시 인증을 붙이고 정책을 좁혀야 합니다.
-- ============================================================

-- ------------------------------------------------------------
-- 1) reviews : CSV 원본 리뷰
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id                text primary key,          -- CSV의 id (r001 ...)
  rating            int  not null check (rating between 1 and 5),
  title             text not null,
  content           text not null,
  author            text,
  review_date       date,
  helpful_votes     int  not null default 0,
  verified_purchase boolean not null default false,
  indexed_at        timestamptz not null default now()
);

create index if not exists reviews_rating_idx on public.reviews (rating);

-- ------------------------------------------------------------
-- 2) chats : 대화방
-- ------------------------------------------------------------
create table if not exists public.chats (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '새로운 대화',
  created_at timestamptz not null default now()
);

create index if not exists chats_created_at_idx on public.chats (created_at desc);

-- ------------------------------------------------------------
-- 3) messages : 대화 메시지
--    sources 컬럼에 RAG가 참고한 리뷰를 JSON으로 함께 저장합니다.
-- ------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  sources    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_id_idx on public.messages (chat_id, created_at);

-- ============================================================
-- RLS 정책 : 로그인하지 않은 사용자(anon)도 사용할 수 있도록 허용
-- ============================================================
alter table public.reviews  enable row level security;
alter table public.chats    enable row level security;
alter table public.messages enable row level security;

-- reviews : 누구나 조회 가능, 인덱싱을 위해 쓰기도 허용
create policy "Reviews are viewable by everyone"
  on public.reviews for select to anon, authenticated using (true);

create policy "Anyone can upsert reviews"
  on public.reviews for insert to anon, authenticated with check (true);

create policy "Anyone can update reviews"
  on public.reviews for update to anon, authenticated using (true) with check (true);

create policy "Anyone can delete reviews"
  on public.reviews for delete to anon, authenticated using (true);

-- chats
create policy "Chats are viewable by everyone"
  on public.chats for select to anon, authenticated using (true);

create policy "Anyone can create chats"
  on public.chats for insert to anon, authenticated with check (true);

create policy "Anyone can update chats"
  on public.chats for update to anon, authenticated using (true) with check (true);

create policy "Anyone can delete chats"
  on public.chats for delete to anon, authenticated using (true);

-- messages
create policy "Messages are viewable by everyone"
  on public.messages for select to anon, authenticated using (true);

create policy "Anyone can create messages"
  on public.messages for insert to anon, authenticated with check (true);

create policy "Anyone can delete messages"
  on public.messages for delete to anon, authenticated using (true);
