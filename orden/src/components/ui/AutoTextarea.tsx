import { forwardRef, useEffect, useImperativeHandle, useRef, type TextareaHTMLAttributes } from 'react'

/** Textarea que crece con el contenido (iOS todavía no soporta field-sizing). */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function AutoTextarea(props, ref) {
  const inner = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(ref, () => inner.current!)
  useEffect(() => {
    const el = inner.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])
  return <textarea ref={inner} {...props} />
})
