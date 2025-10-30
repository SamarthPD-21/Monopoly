import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router'
import Board from '../components/Board'
import Dice from '../components/Dice'
import Lobby from '../components/Lobby'
import DebugPanel from '../components/DebugPanel'
import { useAuth } from '../context/AuthContext'

type Player = { id: string; name: string; pos: number; money?: number }
type Property = { id: number; name: string; cost: number; ownerId: string | null }

export default function Home() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastWsEvent, setLastWsEvent] = useState<string | undefined>(undefined)
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined)
  const [players, setPlayers] = useState<Player[]>([])
  const [properties, setProperties] = useState<Property[] | undefined>(undefined)
  const [lastMove, setLastMove] = useState<any>(null)
  const [started, setStarted] = useState<boolean>(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [rolling, setRolling] = useState(false)
  const [lastDice, setLastDice] = useState<number | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const { token, currentUser, loginWithToken, logout, tryRefreshIfNeeded } = useAuth()
  // modal now handled by ModalContext
  const reconnectRef = useRef<number>(0)
  const wsRef = useRef<WebSocket | null>(null)

  function parseJwt(tok: string | null) {
    if (!tok) return null
    try {
      const parts = tok.split('.')
      if (parts.length !== 3) return null
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload as any
    } catch (e) { return null }
  }

  function isTokenExpired(tok: string | null) {
    const p = parseJwt(tok)
    if (!p || !p.exp) return true
    // exp is seconds since epoch
    return Date.now() > (p.exp * 1000 - 5000) // treat as expired 5s early
  }

  // delegated to AuthContext.tryRefreshIfNeeded

  useEffect(() => {
    let closedByUs = false

    async function connect() {
      const t = await tryRefreshIfNeeded()
  const url = 'ws://localhost:8080/game' + (t ? `?token=${encodeURIComponent(t)}` : '')
    setWsUrl(url)
      console.debug('Connecting WS to', url)
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
      const socket = new WebSocket(url)
      wsRef.current = socket
  socket.addEventListener('open', () => { reconnectRef.current = 0; setConnected(true); setLastWsEvent('open'); console.debug('WS open', url) })
      socket.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'state') {
          setPlayers(msg.payload.players || [])
          setProperties(msg.payload.properties || [])
          setLastMove(msg.payload.lastMove || null)
          setStarted(!!msg.payload.started)
          if (msg.payload.lastMove && msg.payload.lastMove.dice) setLastDice(msg.payload.lastMove.dice)
          setRolling(false)
        } else if (msg.type === 'assigned') {
          setMyId(msg.payload.id)
        } else if (msg.type === 'joinResult') {
          const r = msg.payload
          if (r && r.success === false) {
            alert('Join failed: ' + (r.message || 'unknown'))
          }
        } else if (msg.type === 'buyResult') {
          const r = msg.payload
          // simple user feedback
          if (r.success) alert('Property bought!')
          else alert('Buy failed: ' + r.message)
        } else if (msg.type === 'rollResult') {
          const r = msg.payload
          if (r && typeof r.dice === 'number') setLastDice(r.dice)
        }
      } catch (e) {
        console.error('Invalid message', e)
      }
    })
      socket.addEventListener('close', (ev) => {
        setConnected(false)
        setLastWsEvent(`close code=${ev.code} reason=${ev.reason || 'n/a'}`)
        console.debug('WS close', ev)
        if (!closedByUs) {
          // reconnect with backoff
          const next = Math.min(30000, 1000 * Math.pow(1.5, reconnectRef.current || 0))
          reconnectRef.current = (reconnectRef.current || 0) + 1
          setTimeout(() => connect(), next)
        }
      })
      socket.addEventListener('error', (err) => { setLastWsEvent('error'); console.error('WS error', err) })

      setWs(socket)
    }

    connect()

    return () => {
      closedByUs = true
      if (wsRef.current) try { wsRef.current.close() } catch {}
      wsRef.current = null
    }
  }, [token])

  // currentUser handled by AuthContext

  // modal handled by ModalContext (rendered globally)

  function join() {
    const name = nameRef.current?.value || 'Player'
    ws?.send(JSON.stringify({ type: 'join', payload: { name } }))
  }

  const router = useRouter()
  const [lobbyCode, setLobbyCode] = useState('')

  function genCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  async function createLobby() {
    // always prefer server-side reserved code (anonymous allowed), but protect with rate limiting on server
    try {
      const headers: any = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/lobbies', { method: 'POST', headers })
      if (res.ok) {
        const data = await res.json()
        if (data && data.code) { router.push(`/room/${data.code}`); toast.success('Lobby reserved'); return }
      } else if (res.status === 429) {
        toast.error('Rate limit reached for creating lobbies. Try again later.')
        return
      } else {
        toast.error('Failed to reserve lobby on server')
      }
    } catch (e) { console.error(e); toast.error('Failed to create lobby on server') }
    // fallback (should be rare)
    const code = genCode()
    toast.info('Using temporary lobby code (not reserved)')
    router.push(`/room/${code}`)
  }

  function joinByCode() {
    if (lobbyCode.trim().length === 0) return
    router.push(`/room/${encodeURIComponent(lobbyCode.trim())}`)
  }

  // login handled via modal LoginForm

  function roll() {
    if (!ws) return
    setRolling(true)
    ws.send(JSON.stringify({ type: 'roll', payload: {} }))
    // we'll stop rolling when server replies with state/rollResult
  }

  function buy() {
    ws?.send(JSON.stringify({ type: 'buy', payload: {} }))
  }

  const me = players.find((p) => p.id === myId)
  const myProperty = me && properties ? properties.find((pr) => pr.id === (me.pos % (properties.length || 1))) : undefined

  return (
    <div className="page animated-bg relative overflow-hidden">
      {/* Cyberpunk decorative blobs */}
      <div className="floating-blob blob-1" aria-hidden />
      <div className="floating-blob blob-2" aria-hidden />

      {/* Purple cyberpunk background video - neon city vibes */}
      <video autoPlay muted loop playsInline className="bg-video" aria-hidden style={{ filter: 'brightness(0.7)' }}>
        <source src="https://videos.pexels.com/video-files/5680034/5680034-hd_1920_1080_24fps.mp4" type="video/mp4" />
      </video>

      <main className="flex-1 p-6 relative z-10">
        <div className="flex items-center justify-center w-full min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-lg">
            {/* Cyberpunk card */}
            <div className="cyber-card-home">
              <div className="cyber-card-glow"></div>
              <h1 className="text-4xl font-bold mb-2 text-center cyber-title">
                <span className="text-purple-400">MONO</span>
                <span className="text-cyan-400">POLY</span>
              </h1>
              <p className="text-center text-purple-300 mb-8 text-sm tracking-widest uppercase">
                Enter the game grid
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-purple-300 mb-2 font-medium">
                    Display Name
                  </label>
                  <input 
                    ref={nameRef} 
                    placeholder="Enter your name" 
                    className="w-full bg-transparent border border-purple-500/30 px-4 py-3 rounded-lg text-purple-100 placeholder:text-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                    defaultValue=""
                  />
                </div>
                
                <div>
                  <label className="block text-xs uppercase tracking-wider text-purple-300 mb-2 font-medium">
                    Lobby Code
                  </label>
                  <input 
                    value={lobbyCode} 
                    onChange={(e) => setLobbyCode(e.target.value)} 
                    placeholder="6-digit code" 
                    className="w-full bg-transparent border border-purple-500/30 px-4 py-3 rounded-lg text-purple-100 placeholder:text-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                    maxLength={6}
                  />
                </div>
              </div>
              
              <div className="mt-8 flex gap-4">
                <button onClick={joinByCode} className="btn flex-1">
                  <span>Join</span>
                </button>
                <button onClick={createLobby} className="btn primary flex-1">
                  <span>Create Lobby</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <DebugPanel token={token} wsState={connected ? 'open' : 'closed'} lastWsEvent={lastWsEvent} wsUrl={wsUrl} />

      <style jsx>{`
        .page { 
          display: flex; 
          flex-direction: column; 
          min-height: 100vh; 
          position: relative; 
          overflow: hidden;
        }
        
        .bg-video { 
          position: fixed; 
          inset: 0; 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          z-index: 0; 
          opacity: 0.4;
        }
        
        .cyber-card-home {
          position: relative;
          background: rgba(16, 8, 30, 0.6);
          backdrop-filter: blur(20px);
          border: none;
          border-radius: 16px;
          padding: 3rem;
          box-shadow: 
            0 0 60px rgba(124, 58, 237, 0.15),
            inset 0 0 80px rgba(168, 85, 247, 0.03);
        }
        
        .cyber-card-home::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(135deg, 
            rgba(168, 85, 247, 0.3) 0%, 
            rgba(124, 58, 237, 0.1) 50%,
            rgba(192, 38, 211, 0.3) 100%
          );
          border-radius: 16px;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .cyber-card-home:hover::before {
          opacity: 1;
        }
        
        .cyber-card-glow {
          position: absolute;
          top: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(168, 85, 247, 0.8) 50%, 
            transparent 100%
          );
          filter: blur(2px);
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .cyber-title {
          font-family: 'Orbitron', monospace;
          text-shadow: 
            0 0 20px rgba(168, 85, 247, 0.6),
            0 0 40px rgba(124, 58, 237, 0.4);
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  )
}

