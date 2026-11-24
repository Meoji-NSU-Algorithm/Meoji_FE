import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/* ───────── 열린 다이얼로그 공유 상태 (모든 Modal·BottomSheet 가 같이 쓴다) ───────── */

interface DialogEntry {
  ref: RefObject<HTMLElement | null>
  onClose: RefObject<() => void>
}

/** 열린 순서대로 쌓인 다이얼로그. 맨 끝이 맨 위 */
const stack: DialogEntry[] = []
/** 잠그기 전 body overflow. 첫 다이얼로그가 열릴 때 저장, 마지막이 닫힐 때 복원 */
let savedOverflow = ''

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true')
}

/** 맨 위 다이얼로그만 ESC·Tab 을 처리한다 */
function onKeyDown(e: KeyboardEvent) {
  const top = stack[stack.length - 1]
  if (!top) return
  if (e.key === 'Escape') {
    top.onClose.current()
    return
  }
  if (e.key !== 'Tab') return
  const root = top.ref.current
  if (!root) return
  const items = focusables(root)
  const active = document.activeElement as HTMLElement | null
  if (items.length === 0) {
    e.preventDefault()
    root.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const inside = active ? root.contains(active) : false
  if (e.shiftKey) {
    if (!inside || active === first || active === root) {
      e.preventDefault()
      last.focus()
    }
  } else if (!inside || active === last) {
    e.preventDefault()
    first.focus()
  }
}

function push(entry: DialogEntry) {
  if (stack.length === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
  }
  stack.push(entry)
}

function remove(entry: DialogEntry) {
  const i = stack.indexOf(entry)
  if (i >= 0) stack.splice(i, 1)
  if (stack.length === 0) {
    document.body.style.overflow = savedOverflow
    document.removeEventListener('keydown', onKeyDown)
  }
}

/**
 * Modal·BottomSheet·전체 화면 다이얼로그 공용: 열리면 다이얼로그에 포커스, Tab 은 다이얼로그 안에서만 돈다,
 * ESC 로 닫기(겹쳐 있으면 맨 위 것만), body 스크롤 잠금(겹쳐도 마지막이 닫힐 때 원래 값으로 복원),
 * 닫히면 원래 포커스로 되돌리기.
 */
export function useDialogBehavior(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  // onClose 가 매 렌더 바뀌어도 포커스를 다시 가져오지 않도록 최신 값만 ref 로 들고 있는다
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const entry: DialogEntry = { ref, onClose: onCloseRef }
    push(entry)
    return () => {
      remove(entry)
      if (prev && prev.isConnected) prev.focus?.()
    }
  }, [open, ref])
}
