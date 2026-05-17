export function createVisualSurface(root: HTMLElement): {
  setColor: (hex: string) => void
  destroy: () => void
} {
  const el = document.createElement('div')
  el.className = 'fx-surface'
  el.style.position = 'fixed'
  el.style.inset = '0'
  el.style.background = '#050005'
  el.style.transition = 'background-color 42ms linear'
  root.appendChild(el)

  return {
    setColor(hex: string) {
      el.style.backgroundColor = hex
    },
    destroy() {
      el.remove()
    },
  }
}
