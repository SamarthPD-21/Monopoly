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
  const wsRef = useRef<WebSocket | null>(null)

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
          if (msg.type === 'state') {
            setPlayers(msg.payload.players || [])
            setProperties(msg.payload.properties || [])
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
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Floating blobs */}
      <div className="floating-blob blob-1" aria-hidden />
      <div className="floating-blob blob-2" aria-hidden />
      
      {/* Background video */}
      <video autoPlay muted loop playsInline className="bg-video" aria-hidden style={{ filter: 'brightness(0.7)' }}>
        <source src="https://videos.pexels.com/video-files/5680034/5680034-hd_1920_1080_24fps.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="p-4 flex items-center justify-between">
          <div className="text-xl font-bold text-purple-300 uppercase tracking-widest" style={{ fontFamily: 'Orbitron, monospace' }}>
            Board — Party <span className="text-cyan-400">{id}</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Board players={players} myId={null} properties={properties} />
        </div>
        <DebugPanel token={token} wsState={ws ? 'open' : 'closed'} lastWsEvent={lastWsEvent} wsUrl={ws ? ws.url : undefined} />
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
