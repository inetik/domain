/**
 * Vibración breve. Android usa navigator.vibrate; en iPhone (iOS 18+) Safari
 * no expone esa API, pero tocar un <input type="checkbox" switch> genera un
 * "tick" háptico nativo, así que lo simulamos con un label oculto.
 */
export function haptic(kind: 'light' | 'success' | 'warn' = 'light') {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(kind === 'success' ? [12, 60, 18] : kind === 'warn' ? [30, 40, 30] : 10)
      return
    }
    const label = document.createElement('label')
    label.ariaHidden = 'true'
    label.style.display = 'none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    label.appendChild(input)
    document.body.appendChild(label)
    label.click()
    if (kind === 'success') setTimeout(() => label.click(), 90)
    setTimeout(() => label.remove(), 200)
  } catch {
    /* sin háptica, no pasa nada */
  }
}
