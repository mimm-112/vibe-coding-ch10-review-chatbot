'use client'

import { Bot, ChevronDown, FileText } from 'lucide-react'
import { useState } from 'react'
import type { ChatMessage } from '@/types/chat'
import SourceCard from './SourceCard'

/** 사용자 메시지는 오른쪽 파란색, AI 메시지는 왼쪽 회색 */
export default function MessageBubble({ message }: { message: ChatMessage }) {
  const [showSources, setShowSources] = useState(false)
  const sources = message.sources ?? []

  if (message.role === 'user') {
    return (
      <div className="animate-fade-in flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white">
          {message.content}
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in flex gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Bot size={16} />
      </span>

      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-bubble-ai px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {sources.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowSources((value) => !value)}
              className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-muted transition hover:text-foreground"
            >
              <FileText size={13} />
              참고한 리뷰 {sources.length}건
              <ChevronDown
                size={13}
                className={showSources ? 'rotate-180 transition' : 'transition'}
              />
            </button>

            {showSources && (
              <ul className="mt-2 flex flex-col gap-2">
                {sources.map((source) => (
                  <SourceCard key={source.id} review={source} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
