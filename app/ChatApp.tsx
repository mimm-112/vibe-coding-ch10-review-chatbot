'use client'

import { AlertCircle, Menu, ShoppingBag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ChatInput from '@/components/ChatInput'
import MessageBubble from '@/components/MessageBubble'
import Sidebar from '@/components/Sidebar'
import TypingIndicator from '@/components/TypingIndicator'
import WelcomeScreen from '@/components/WelcomeScreen'
import { PRODUCT_NAME, type ChatMessage, type ChatRoom, type ReviewSummary } from '@/types/chat'

type Props = {
  initialChats: ChatRoom[]
  initialSummary: ReviewSummary
  initialIndexedCount: number
  /** 서버에서 초기 데이터를 못 가져왔을 때의 안내 문구 */
  initialError: string | null
}

export default function ChatApp({
  initialChats,
  initialSummary,
  initialIndexedCount,
  initialError,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chats, setChats] = useState<ChatRoom[]>(initialChats)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [summary, setSummary] = useState<ReviewSummary | null>(initialSummary)
  const [indexedCount, setIndexedCount] = useState(initialIndexedCount)
  const [isSending, setIsSending] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  /** 대화 목록 새로고침 */
  async function refreshChats() {
    try {
      const response = await fetch('/api/chats')
      const data = await response.json()
      setChats(data.chats ?? [])
    } catch {
      // 목록 조회 실패는 화면을 막을 정도의 문제가 아니라 조용히 넘어갑니다.
    }
  }

  /** 리뷰 통계 + 인덱싱 상태 새로고침 */
  async function refreshSummary() {
    try {
      const [summaryResponse, indexResponse] = await Promise.all([
        fetch('/api/summary'),
        fetch('/api/index-data'),
      ])
      const summaryData = await summaryResponse.json()
      const indexData = await indexResponse.json()

      if (!summaryData.error) setSummary(summaryData)
      setIndexedCount(indexData.indexedCount ?? 0)
    } catch {
      // 무시
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  /** 질문 전송 → RAG API 호출 */
  async function handleSend(question: string) {
    setError(null)
    setIsSending(true)

    const optimisticMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: question,
    }
    setMessages((previous) => [...previous, optimisticMessage])

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question, chatId: currentChatId }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? '답변을 받지 못했습니다.')
        return
      }

      setCurrentChatId(data.chatId)
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ])
      refreshChats()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '네트워크 오류가 발생했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  /** 샘플 리뷰 CSV를 수파베이스 + Pinecone에 인덱싱 */
  async function handleIndexSampleData() {
    setError(null)
    setIsIndexing(true)

    try {
      const response = await fetch('/api/index-data', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        setError(`${data.error}${data.hint ? `\n${data.hint}` : ''}`)
        return
      }

      await refreshSummary()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '인덱싱에 실패했습니다.')
    } finally {
      setIsIndexing(false)
    }
  }

  async function handleSelectChat(chatId: string) {
    setIsSidebarOpen(false)
    setCurrentChatId(chatId)
    setError(null)

    const response = await fetch(`/api/chats/${chatId}`)
    const data = await response.json()
    setMessages(data.messages ?? [])
  }

  async function handleDeleteChat(chatId: string) {
    await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
    if (chatId === currentChatId) {
      setCurrentChatId(null)
      setMessages([])
    }
    refreshChats()
  }

  function handleNewChat() {
    setCurrentChatId(null)
    setMessages([])
    setError(null)
    setIsSidebarOpen(false)
  }

  return (
    <div className="flex h-full">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        indexedCount={indexedCount}
        isIndexing={isIndexing}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onIndexSampleData={handleIndexSampleData}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 헤더 */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <button
            type="button"
            aria-label="메뉴 열기"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-2 text-muted transition hover:bg-background lg:hidden"
          >
            <Menu size={18} />
          </button>

          <ShoppingBag size={18} className="text-accent" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">쇼핑 리뷰 분석 봇</p>
            <p className="truncate text-xs text-muted">{PRODUCT_NAME}</p>
          </div>
        </header>

        {/* 메시지 목록 */}
        <div className="thin-scrollbar flex-1 overflow-y-auto px-4">
          {messages.length === 0 ? (
            <WelcomeScreen summary={summary} onSelectQuestion={handleSend} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5 py-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isSending && <TypingIndicator />}
            </div>
          )}

          {error && (
            <div className="mx-auto mb-4 flex max-w-3xl items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p className="whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <ChatInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  )
}
