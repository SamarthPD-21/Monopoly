import React, { useState } from 'react'
import { useConfirm } from './ConfirmProvider'
import { toast } from 'react-toastify'

export default function Lobby({ ws, players, myId, adminId }: { ws: WebSocket | null; players: any[]; myId: string | null; adminId?: string | null }) {
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)

  function toggleReady() {
    const next = !ready
    setReady(next)
    try {
      ws?.send(JSON.stringify({ type: 'ready', payload: { ready: next } }))
    } catch (e) { console.warn('ws send failed', e) }
  }

  const maxPlayers = 4
  const slots = Array.from({ length: maxPlayers }).map((_, i) => players[i] || null)

  const host = players[0]
  const allReady = players.length >= maxPlayers && players.slice(0, maxPlayers).every((p: any) => p && p.ready)

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) { console.warn('copy failed', e) }
  }

  const confirm = (() => { try { return useConfirm() } catch { return null } })()

  return (
    <div className="cyber-panel mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-purple-300 uppercase tracking-widest" style={{ fontFamily: 'Orbitron, monospace' }}>Lobby</h4>
        <div className="text-sm text-cyan-400 font-mono">{players.length}/{maxPlayers}</div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {slots.map((p, idx) => (
          <div key={idx} className={`p-3 rounded-lg border transition-all ${p ? 'bg-purple-900/20 border-purple-500/40' : 'bg-transparent border-purple-500/10'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-purple-200">
                  {p ? p.name : `Slot ${idx + 1}`}
                  {host && p && p.id === host.id ? ' ⭐' : ''}
                </div>
                <div className="text-xs text-purple-400/60 font-mono">
                  {p ? `$${p.money} — pos ${p.pos}` : 'open'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-cyan-400 font-semibold">{p && p.ready ? '✓ Ready' : ''}</div>
                {/* admin kick button */}
                {adminId && myId === adminId && p && p.id !== adminId && (
                  <button onClick={async () => {
                    try {
                      const ok = confirm ? await confirm.confirm(`Kick ${p.name}?`) : window.confirm(`Kick ${p.name}?`)
                      if (!ok) return
                      ws?.send(JSON.stringify({ type: 'kick', payload: { playerId: p.id } }))
                      toast.info('Kick requested')
                    } catch (e) { console.warn(e) }
                  }} className="text-xs text-red-400 hover:text-red-300 font-semibold">Kick</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={toggleReady} className={`btn ${ready ? 'primary' : ''}`}>{ready ? 'Unready' : 'Ready'}</button>
        <button onClick={copyInvite} className="btn">{copied ? 'Copied' : 'Copy invite'}</button>
      </div>

      <div className="mt-4 text-sm text-purple-300/70">
        {allReady ? <div className="text-cyan-400 font-semibold">✓ All players ready — game will start now.</div> : <div>Invite friends and toggle Ready. Game auto-starts when {maxPlayers} players are ready.</div>}
      </div>
    </div>
  )
}
