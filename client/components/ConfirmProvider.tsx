import React, { createContext, useContext, useState } from 'react'

const ConfirmContext = createContext<{ confirm: (message: string) => Promise<boolean> } | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [resolver, setResolver] = useState<(val: boolean) => void>(() => () => {})

  const confirm = (msg: string) => {
    setMessage(msg)
    setOpen(true)
    return new Promise<boolean>((res) => {
      setResolver(() => res)
    })
  }

  function onConfirm() { setOpen(false); resolver(true) }
  function onCancel() { setOpen(false); resolver(false) }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ background: 'white', padding: 20, borderRadius: 8, minWidth: 320 }}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>{message}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onCancel} className="btn">Cancel</button>
              <button onClick={onConfirm} className="btn primary">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export default ConfirmProvider
