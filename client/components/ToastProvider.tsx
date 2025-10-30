import React, { createContext, useContext, useState, useCallback } from 'react'

type Toast = { id: string; message: string; type?: 'info' | 'success' | 'error' }

const ToastContext = createContext<{ addToast: (m: string, type?: 'info'|'success'|'error') => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'info'|'success'|'error' = 'info') => {
    const t: Toast = { id: String(Date.now()) + Math.random().toString(36).slice(2), message, type }
    setToasts((s) => [...s, t])
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== t.id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} className="mb-2 px-3 py-2 rounded shadow flex items-center" style={{ minWidth: 220, background: t.type === 'success' ? '#064e3b' : t.type === 'error' ? '#7f1d1d' : '#0f172a', color: 'white' }}>
            <div style={{ marginRight: 8 }}>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}
            </div>
            <div style={{ flex: 1 }}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
