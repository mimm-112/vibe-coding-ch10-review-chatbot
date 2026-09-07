import { Bot } from 'lucide-react'

/** AI가 답변을 생성하는 동안 보여주는 인디케이터 */
export default function TypingIndicator() {
  return (
    <div className="animate-fade-in flex gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Bot size={16} />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-bubble-ai px-4 py-4">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
