import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import Lobby from '../../components/Lobby'
import DebugPanel from '../../components/DebugPanel'
import { toast } from 'react-toastify'
import { useConfirm } from '../../components/ConfirmProvider'
import { useAuth } from '../../context/AuthContext'

export default function RoomPage() {
  const router = useRouter()
  const { id } = router.query as { id?: string }
  const { token, currentUser, tryRefreshIfNeeded } = useAuth()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [properties, setProperties] = useState<any[] | undefined>(undefined)
  const [myId, setMyId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [startAmount, setStartAmount] = useState<number | null>(null)
  const [started, setStarted] = useState(false)
  const [lastWsEvent, setLastWsEvent] = useState<string | undefined>(undefined)
  const wsRef = useRef<WebSocket | null>(null)
  const confirm = (() => { try { return useConfirm() } catch { return null } })()

  // Redirect to board when game starts
  useEffect(() => {
    if (started && id) {
      router.push(`/board/${id}`)
    }
  }, [started, id, router])

  // Players are populated entirely from WebSocket state updates
  // Do NOT fetch from MongoDB to avoid duplicate players

  useEffect(() => {
    if (!id) return
    let closedByUs = false
    async function connect() {
      let t = null
      try {
        t = await tryRefreshIfNeeded()
      } catch (e) {
        console.warn('Token refresh failed, connecting without auth', e)
      }
      
      // Build WebSocket URL - only add token if it exists and is valid
      const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
      let url = `${wsHost}/game?room=${encodeURIComponent(id as string)}`
      if (t && typeof t === 'string' && t.length > 0 && t.length < 2000) {
        url += `&token=${encodeURIComponent(t)}`
      }
      
      if (wsRef.current) try { wsRef.current.close() } catch {}
      
      console.debug('Connecting to WebSocket:', url.substring(0, 100) + '...')
      const socket = new WebSocket(url)
      wsRef.current = socket
      
      socket.addEventListener('open', () => { 
        setLastWsEvent('open')
        console.debug('WS connected successfully')
      })
      
      socket.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'state') {
            // Always update players from WebSocket state (including bots)
            if (msg.payload.players) {
              setPlayers(msg.payload.players)
            }
            setProperties(msg.payload.properties || [])
            setStarted(!!msg.payload.started)
            if (msg.payload.adminId) {
              setAdminId(msg.payload.adminId)
            }
            if (msg.payload.startAmount !== null && msg.payload.startAmount !== undefined) {
              setStartAmount(msg.payload.startAmount)
            }
          } else if (msg.type === 'assigned') {
            setMyId(msg.payload.id)
          }
        } catch (e) { console.error('invalid msg', e) }
      })
      
      socket.addEventListener('close', (ev) => { 
        setLastWsEvent(`close code=${ev.code}`)
        console.debug('WS closed, code:', ev.code)
        if (!closedByUs) {
          console.debug('Reconnecting in 2s...')
          setTimeout(connect, 2000)
        }
      })
      
      socket.addEventListener('error', (e) => { 
        setLastWsEvent('error')
        console.error('WS error:', e)
      })
      
      setWs(socket)
    }
    connect()
    return () => { 
      closedByUs = true
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
      }
    }
  }, [id, tryRefreshIfNeeded])

  // send join when ws opens
  useEffect(() => {
    if (!ws) return
    const handler = (ev: Event) => {
      try { 
        const socket = ws
        const name = currentUser || 'Guest'
        socket.send(JSON.stringify({ type: 'join', payload: { name } }))
      } catch (e) { 
        console.error('Failed to send join message:', e)
      }
    }
    ws.addEventListener('open', handler)
    return () => { try { ws.removeEventListener('open', handler) } catch {} }
  }, [ws, currentUser])

  // navigate to board when started
  useEffect(() => {
    if (started && id) {
      router.push(`/board/${id}`)
    }
  }, [started, id])

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Floating blobs */}
      <div className="floating-blob blob-1" aria-hidden />
      <div className="floating-blob blob-2" aria-hidden />
      
      {/* Background video */}
      <video autoPlay muted loop playsInline className="bg-video" aria-hidden style={{ filter: 'brightness(0.7)' }}>
        <source src="https://videos.pexels.com/video-files/5680034/5680034-hd_1920_1080_24fps.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-300 uppercase tracking-widest mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
            Party: <span className="text-cyan-400">{id}</span>
          </h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="cyber-panel">
              <h3 className="text-lg font-bold text-purple-300 uppercase tracking-widest mb-4" style={{ fontFamily: 'Orbitron, monospace' }}>Players</h3>
              <Lobby ws={ws} players={players} myId={myId} adminId={adminId} />
            </div>
            
            {adminId === myId && (
              <div className="cyber-panel">
                <h3 className="text-lg font-bold text-purple-300 uppercase tracking-widest mb-4" style={{ fontFamily: 'Orbitron, monospace' }}>Admin Controls</h3>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={startAmount ?? 1500} 
                    onChange={(e) => setStartAmount(Number(e.target.value))} 
                    className="px-4 py-2 bg-transparent border border-purple-500/30 rounded-lg text-purple-100 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  <button onClick={async () => {
                    try {
                      ws?.send(JSON.stringify({ type: 'setStartAmount', payload: { amount: startAmount } }))
                      toast.success('Start amount updated')
                    } catch (e) { console.error(e) }
                  }} className="btn primary">Set Amount</button>
                </div>
              </div>
            )}
            
            <div className="cyber-panel">
              <h3 className="text-lg font-bold text-purple-300 uppercase tracking-widest mb-3" style={{ fontFamily: 'Orbitron, monospace' }}>Rules</h3>
              <div className="text-sm text-purple-300/70">
                Invite friends with the link. Game auto-starts when 4 players are ready. Host can also manually start.
              </div>
            </div>
          </div>
          
          <div>
            <DebugPanel token={token} wsState={ws ? 'open' : 'closed'} lastWsEvent={lastWsEvent} wsUrl={ws ? ws.url : undefined} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-video { 
          position: fixed; 
          inset: 0; 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          z-index: 0; 
          opacity: 0.4;
        }
      `}</style>
    </div>
  )
}
