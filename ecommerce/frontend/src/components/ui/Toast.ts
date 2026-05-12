// Lightweight toast notifications
let container: HTMLDivElement | null = null

function getContainer() {
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2'
    document.body.appendChild(container)
  }
  return container
}

function createToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
  const el = document.createElement('div')
  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-amber-500 text-white',
  }
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }

  el.className = `flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium min-w-[220px] max-w-[320px] animate-slide-in-right ${colors[type]}`
  el.innerHTML = `<span class="text-base">${icons[type]}</span><span>${message}</span>`

  const c = getContainer()
  c.appendChild(el)

  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transition = 'opacity 0.3s'
    setTimeout(() => el.remove(), 300)
  }, 3000)
}

const toast = {
  success: (msg: string) => createToast(msg, 'success'),
  error: (msg: string) => createToast(msg, 'error'),
  info: (msg: string) => createToast(msg, 'info'),
  warning: (msg: string) => createToast(msg, 'warning'),
}

export default toast
