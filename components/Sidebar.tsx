'use client'

import { Database, Loader2, MessageSquare, Plus, Trash2, X } from 'lucide-react'
import type { ChatRoom } from '@/types/chat'
import { PRODUCT_NAME } from '@/types/chat'

type Props = {
  chats: ChatRoom[]
  currentChatId: string | null
  indexedCount: number
  isIndexing: boolean
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onIndexSampleData: () => void
}

export default function Sidebar({
  chats,
  currentChatId,
  indexedCount,
  isIndexing,
  isOpen,
  onClose,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onIndexSampleData,
}: Props) {
  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <button
          type="button"
          aria-label="사이드바 닫기"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex flex-1 items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition hover:bg-background"
          >
            <Plus size={16} /> 새로운 채팅
          </button>
          <button
            type="button"
            aria-label="사이드바 닫기"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-background lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* 상품 선택 (현재는 샘플 상품 하나) */}
        <div className="px-3 pb-3">
          <label className="text-xs text-muted">분석 상품</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            defaultValue={PRODUCT_NAME}
          >
            <option>{PRODUCT_NAME}</option>
          </select>
        </div>

        {/* 대화 목록 */}
        <div className="thin-scrollbar flex-1 overflow-y-auto px-3">
          <p className="px-1 py-2 text-xs font-medium text-muted">최근 대화</p>

          {chats.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted">대화 기록이 없습니다.</p>
          )}

          <ul className="flex flex-col gap-0.5">
            {chats.map((chat) => (
              <li key={chat.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelectChat(chat.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 pr-8 text-left text-sm transition ${
                    chat.id === currentChatId
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted hover:bg-background hover:text-foreground'
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </button>

                <button
                  type="button"
                  aria-label="대화 삭제"
                  onClick={() => onDeleteChat(chat.id)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1.5 text-muted opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 샘플 데이터 인덱싱 */}
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onIndexSampleData}
            disabled={isIndexing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isIndexing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Database size={15} />
            )}
            {isIndexing ? '인덱싱 중…' : '샘플 데이터 인덱싱'}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">
            {indexedCount > 0
              ? `리뷰 ${indexedCount}건 인덱싱 완료`
              : '먼저 인덱싱을 실행하세요'}
          </p>
        </div>
      </aside>
    </>
  )
}
