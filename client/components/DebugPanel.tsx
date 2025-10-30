import React, { useMemo, useState } from 'react'

function maskToken(t: string | null) {
  if (!t) return '—'
  if (t.length < 20) return t
  return t.slice(0, 10) + '…' + t.slice(-8)
}

export default function DebugPanel({ token, wsState, lastWsEvent, wsUrl }: { token: string | null, wsState: string, lastWsEvent?: string, wsUrl?: string }) {
  const [open, setOpen] = useState(false)
  const payload = useMemo(() => {
    try {
      if (!token) return null
      const parts = token.split('.')
      if (parts.length !== 3) return null
      return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    } catch (e) { return null }
  }, [token])

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 60 }}>
      <div className="cyber-debug-panel">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-purple-300 uppercase tracking-wider text-xs" style={{ fontFamily: 'Orbitron, monospace' }}>Debug</div>
          <div className="flex items-center gap-3">
            <div className={`text-xs font-mono ${wsState === 'open' ? 'text-cyan-400' : 'text-red-400'}`}>
              WS: {wsState}
            </div>
            <button onClick={() => setOpen(o => !o)} className="px-2 py-1 rounded bg-purple-900/30 text-purple-300 text-xs border border-purple-500/30 hover:bg-purple-900/50 transition-all">
              {open ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {open && (
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <strong className="text-purple-400">Token</strong>
              <span className="text-purple-200 font-mono">{maskToken(token)}</span>
            </div>
            <div className="flex justify-between">
              <strong className="text-purple-400">Expiry</strong>
              <span className="text-purple-200 font-mono">{payload?.exp ? new Date(payload.exp * 1000).toLocaleString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <strong className="text-purple-400">Sub</strong>
              <span className="text-purple-200 font-mono">{payload?.sub ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <strong className="text-purple-400">Last WS</strong>
              <span className="text-purple-200 font-mono">{lastWsEvent ?? '—'}</span>
            </div>
            <div className="truncate">
              <strong className="text-purple-400">WS URL</strong>
              <span className="text-purple-200 font-mono text-xs block mt-1">{wsUrl ?? '—'}</span>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .cyber-debug-panel {
          background: rgba(16, 8, 30, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(168, 85, 247, 0.4);
          border-radius: 12px;
          padding: 12px;
          width: 320px;
          box-shadow: 
            0 0 30px rgba(124, 58, 237, 0.3),
            inset 0 0 40px rgba(168, 85, 247, 0.05);
        }
      `}</style>
    </div>
  )
}
