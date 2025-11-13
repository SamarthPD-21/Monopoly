import React, { useState } from 'react'
import { useConfirm } from './ConfirmProvider'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router'

export default function Lobby({ ws, players, myId, adminId }: { ws: WebSocket | null; players: any[]; myId: string | null; adminId?: string | null }) {
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const { id } = router.query

  function toggleReady() {
    const next = !ready
    setReady(next)
    try {
      ws?.send(JSON.stringify({ type: 'ready', payload: { ready: next } }))
    } catch (e) { console.warn('ws send failed', e) }
  }

  function addBot() {
    if (!ws) {
      toast.error('Not connected to game server')
      console.error('Cannot add bot: WebSocket not connected')
      return
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
      toast.error('WebSocket not ready')
      console.error('Cannot add bot: WebSocket state =', ws.readyState)
      return
    }
    
    try {
      const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta', 'Bot Omega', 'Bot Sigma']
      const botName = botNames[Math.floor(Math.random() * botNames.length)]
      console.log('Sending addBot message:', { type: 'addBot', payload: { name: botName } })
      console.log('Current adminId:', adminId, 'myId:', myId, 'isAdmin:', adminId === myId)
      ws.send(JSON.stringify({ type: 'addBot', payload: { name: botName } }))
      toast.success(`Requesting to add ${botName}...`)
    } catch (e) {
      console.error('Failed to add bot:', e)
      toast.error('Failed to send add bot request')
    }
  }

  const maxPlayers = 4
  const slots = Array.from({ length: maxPlayers }).map((_, i) => players[i] || null)

  const host = players[0]
  const allReady = players.length >= maxPlayers && players.slice(0, maxPlayers).every((p: any) => p && p.ready)
  
  // Debug log
  console.log('Lobby Debug:', { adminId, myId, isAdmin: adminId === myId, playersLength: players.length, maxPlayers })

  async function copyInvite() {
    try {
      // Copy the lobby code instead of full URL
      const lobbyCode = id || window.location.pathname.split('/').pop()
      await navigator.clipboard.writeText(lobbyCode as string)
      toast.success(`Lobby code copied: ${lobbyCode}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) { 
      console.warn('copy failed', e)
      toast.error('Failed to copy lobby code')
    }
  }

  const confirm = (() => { try { return useConfirm() } catch { return null } })()

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-xl font-bold text-purple-300 uppercase tracking-widest" style={{ fontFamily: 'Orbitron, monospace' }}>Lobby</h4>
        <div className="flex items-center gap-3">
          <div className="text-sm text-cyan-400 font-mono px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            {players.length}/{maxPlayers} Players
          </div>
          <button 
            onClick={copyInvite} 
            className="btn ghost text-sm whitespace-nowrap"
            title="Copy lobby code to share with friends"
          >
            {copied ? '✓ Copied!' : '📋 Copy Invite'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((p, idx) => (
          <div 
            key={idx} 
            className={`p-4 rounded-lg border transition-all ${
              p 
                ? 'bg-purple-900/30 border-purple-500/50 shadow-lg shadow-purple-500/10' 
                : 'bg-purple-950/20 border-purple-500/20 border-dashed'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-base font-bold text-purple-100 truncate">
                    {p ? (
                      <>
                        {p.id && p.id.startsWith('bot_') && (
                          <span className="mr-1 text-cyan-400" title="AI Bot">🤖</span>
                        )}
                        {p.name}
                        {host && p.id === host.id && (
                          <span className="ml-1 text-yellow-400" title="Host">👑</span>
                        )}
                      </>
                    ) : (
                      <span className="text-purple-400/50">Empty Slot</span>
                    )}
                  </div>
                  {p && (
                    <div className="flex-shrink-0">
                      {p.ready ? (
                        <span className="text-xs font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded border border-green-500/40">
                          ✓ READY
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-purple-400/60 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                          WAITING
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {p && (
                  <div className="text-xs text-purple-400/70 font-mono mt-1">
                    ${p.money} • Position {p.pos}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* admin kick button */}
                {adminId && myId === adminId && p && p.id !== adminId && (
                  <button 
                    onClick={async () => {
                      try {
                        if (!confirm) {
                          console.warn('Confirm provider not available')
                          return
                        }
                        const ok = await confirm.confirm(`Kick ${p.name}?`)
                        if (!ok) return
                        ws?.send(JSON.stringify({ type: 'kick', payload: { playerId: p.id } }))
                        toast.info(`Kicked ${p.name}`)
                      } catch (e) { console.warn(e) }
                    }} 
                    className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 bg-red-500/20 rounded border border-red-500/30 hover:bg-red-500/30 transition-all"
                  >
                    Kick
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <button 
          onClick={toggleReady} 
          className={`btn flex-1 ${ready ? 'primary' : 'ghost'}`}
        >
          {ready ? '✓ Ready' : 'Mark as Ready'}
        </button>
        
        {/* Admin can add bots - Always show for testing */}
        <button 
          onClick={addBot} 
          className="btn ghost text-sm whitespace-nowrap"
          title="Add AI bot to fill empty slot"
          disabled={players.length >= maxPlayers}
        >
          🤖 Add Bot
        </button>
      </div>

      {/* Admin Start Game Button */}
      {adminId && myId === adminId && players.length >= 2 && (
        <div className="relative">
          <button
            onClick={() => {
              try {
                ws?.send(JSON.stringify({ type: 'start' }))
                toast.success('Starting game...')
              } catch (e) {
                console.error('Failed to start game:', e)
                toast.error('Failed to start game')
              }
            }}
            className="w-full relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '1rem 2rem',
              borderRadius: '0.75rem',
              border: '2px solid rgba(139, 92, 246, 0.5)',
              fontFamily: 'Orbitron, monospace',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'white',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 6px 30px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* Animated background shimmer */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
            
            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-2xl animate-pulse">🎮</span>
              <span>Start Game</span>
              <span className="text-2xl">🚀</span>
            </span>
          </button>
          
          {/* Pulsing glow effect */}
          <div 
            className="absolute inset-0 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              zIndex: -1,
            }}
          />
        </div>
      )}

      <div className="p-4 rounded-lg bg-purple-950/40 border border-purple-500/20">
        <div className="text-sm text-purple-300/80 leading-relaxed">
          {allReady ? (
            <div className="text-green-400 font-semibold flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>All players ready — game will start soon!</span>
            </div>
          ) : (
            <div>
              <span className="text-purple-200 font-semibold">Waiting for players...</span>
              <div className="mt-1 text-purple-400/60">
                Share the lobby code <span className="font-mono text-cyan-400">{id}</span> with friends. Game starts when {maxPlayers} players are ready.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
