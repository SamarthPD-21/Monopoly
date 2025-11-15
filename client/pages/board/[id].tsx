import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import Board from '../../components/Board'
import DebugPanel from '../../components/DebugPanel'
import { useAuth } from '../../context/AuthContext'

export default function BoardPage() {
  const router = useRouter()
  const { id } = router.query as { id?: string }
  const { token, tryRefreshIfNeeded } = useAuth()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [properties, setProperties] = useState<any[] | undefined>(undefined)
  const [lastWsEvent, setLastWsEvent] = useState<string | undefined>(undefined)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const handleBuyProperty = (propertyId: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = {
        type: 'buyProperty',
        propertyId: propertyId
      }
      wsRef.current.send(JSON.stringify(msg))
      console.log('💰 Attempting to buy property:', propertyId)
    }
  }

  useEffect(() => {
    if (!id) return
    let closedByUs = false
    async function connect() {
      const t = await tryRefreshIfNeeded()
      const url = 'ws://localhost:8080/game?room=' + encodeURIComponent(id) + (t ? `&token=${encodeURIComponent(t)}` : '')
      if (wsRef.current) try { wsRef.current.close() } catch {}
      const socket = new WebSocket(url)
      wsRef.current = socket
      socket.addEventListener('open', () => { setLastWsEvent('open'); console.debug('WS open', url) })
      socket.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          console.log('📩 WebSocket message:', msg)
          if (msg.type === 'state') {
            console.log('🎮 Game state received:', {
              players: msg.payload.players?.length || 0,
              properties: msg.payload.properties?.length || 0
            })
            setPlayers(msg.payload.players || [])
            setProperties(msg.payload.properties || [])
            
            // Find my player ID
            const me = (msg.payload.players || []).find((p: any) => !p.id.startsWith('bot_'))
            if (me) setMyPlayerId(me.id)
          }
        } catch (e) { console.error('invalid msg', e) }
      })
      socket.addEventListener('close', (ev) => { setLastWsEvent(`close code=${ev.code}`); if (!closedByUs) setTimeout(connect, 1500) })
      socket.addEventListener('error', (e) => { setLastWsEvent('error'); console.error('ws error', e) })
      setWs(socket)
    }
    connect()
    return () => { closedByUs = true; if (wsRef.current) try { wsRef.current.close() } catch {} }
  }, [id])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="h-screen flex">
        {/* Left side - Board (takes all available space) */}
        <div className="flex-1 flex items-center justify-center">
          <Board 
            players={players} 
            myId={myPlayerId} 
            properties={properties}
            onBuyProperty={handleBuyProperty}
          />
        </div>

        {/* Right side - Player info (fixed width on video background) */}
        <div className="w-72 flex flex-col gap-3 p-3">
          {/* Header */}
          <div className="cyber-panel p-3">
            <div className="text-base font-bold text-purple-300 uppercase tracking-widest" style={{ fontFamily: 'Orbitron, monospace' }}>
              Party <span className="text-cyan-400">{id}</span>
            </div>
          </div>

          {/* Players List */}
          <div className="flex-1 cyber-panel p-3 overflow-y-auto">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-3">Players</h3>
            <div className="space-y-2">
              {players.length === 0 ? (
                <div className="text-center text-purple-300/50 text-sm py-4">No players yet</div>
              ) : (
                players.map((p, idx) => {
                  const isCurrentTurn = idx === 0 // First player is current turn (simple logic)
                  return (
                    <div
                      key={p.id}
                      className={`bg-gray-800/80 border-2 rounded-lg p-2.5 transition-all hover:scale-102 ${
                        isCurrentTurn 
                          ? 'border-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse' 
                          : 'border-purple-500/30 hover:border-purple-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {/* Turn indicator */}
                          {isCurrentTurn && (
                            <div className="flex items-center justify-center">
                              <span className="text-lg animate-bounce">👉</span>
                            </div>
                          )}
                          
                          {/* Player avatar */}
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center font-bold text-white text-sm relative"
                            style={{ 
                              backgroundColor: getPlayerColor(p.id),
                              boxShadow: `0 0 20px ${getPlayerColor(p.id)}`
                            }}
                          >
                            {p.id.startsWith('bot_') ? '🤖' : p.name.charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Player name */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="text-purple-100 font-semibold text-xs">
                                {p.name}
                              </span>
                              {p.id.startsWith('bot_') && (
                                <span className="text-[0.6rem] bg-purple-600/50 px-1 rounded text-purple-200">BOT</span>
                              )}
                            </div>
                            {isCurrentTurn && (
                              <span className="text-[0.6rem] text-yellow-300 font-bold">
                                ⭐ YOUR TURN
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {p.ready && (
                          <span className="text-xs text-green-400 font-bold">✓</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs ml-10">
                        <span className="text-purple-400 font-medium">Tile {p.pos}</span>
                        <span className="text-green-400 font-bold font-mono">${p.money || 1500}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Debug panel at bottom */}
          <div className="cyber-panel overflow-hidden">
            <DebugPanel token={token} wsState={ws ? 'open' : 'closed'} lastWsEvent={lastWsEvent} wsUrl={ws ? ws.url : undefined} />
          </div>
        </div>
      </div>

      <style jsx>{``}</style>
    </div>
  )
}

// Helper function to get player color (same as Board component)
function getPlayerColor(playerId: string) {
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
  const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
