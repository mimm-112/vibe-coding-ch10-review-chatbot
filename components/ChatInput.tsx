'use client'

import { Send } from 'lucide-react'
import { useRef, useState } from 'react'

type Props = {
  onSend: (message: string) => void
  disabled?: boolean
}

/**
 * 채팅 입력창.
 *
 * ⚠️ 한글 IME 이슈
 * 한글은 자음/모음을 조합해서 글자를 만들기 때문에, 조합 중에 Enter를 누르면
 * "글자 확정"과 "전송"이 겹쳐서 메시지가 두 번 전송됩니다.
 * isComposing 값을 확인해서 조합 중일 때는 전송하지 않도록 막습니다.
 * (교재 챕터 10 '바이브 UP! 채팅이 두 개씩 보내져요' 참고)
 */
export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const isComposingRef = useRef(false)

  function submit() {
    const message = value.trim()
    if (!message || disabled) return
    onSend(message)
    setValue('')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return

    // 한글 조합 중에 들어온 Enter는 "글자 확정"이므로 전송하지 않습니다.
    if (isComposingRef.current || event.nativeEvent.isComposing) return

    event.preventDefault()
    submit()
  }

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="mx-auto flex max-w-3xl items-end gap-2"
      >
        <textarea
          value={value}
          rows={1}
          onChange={(event) => setValue(event.target.value)}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false
          }}
          onKeyDown={handleKeyDown}
          placeholder="이 상품 리뷰에 대해 궁금한 점을 물어보세요 (Shift+Enter 줄바꿈)"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="전송"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-muted">
        AI는 실수할 수 있습니다. 중요한 정보는 원본 리뷰를 확인해 주세요.
      </p>
    </div>
  )
}
