import { useEffect, useRef, useState } from 'react'
import React from 'react'
type Player = { id: string; name: string; pos: number; money?: number }
type Property = { id: number; name: string; cost: number; ownerId: string | null }

export default function Board({ players, myId, properties }: { players: Player[]; myId: string | null; properties?: Property[] }) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [tileCoords, setTileCoords] = useState<{ x: number; y: number }[]>([])
  const displayPosRef = useRef<Record<string, number>>({})
  const [, setTick] = useState(0) // used to force update
  const timers = useRef<number[]>([])

  useEffect(() => {
    // compute N tile coordinates around a square board
    const size = 420
    const padding = 14
    const tiles: { x: number; y: number }[] = []
    const inner = size - padding * 2
    // prefer server-provided properties length so tokens align with server positions
    const n = (properties && properties.length && properties.length >= 4) ? properties.length : 12
    // if n not divisible by 4, fall back to 12; keep per-side chunks simple
    const perSide = (n % 4 === 0) ? n / 4 : 3

    // top row (0 .. perSide-1)
    for (let i = 0; i < perSide; i++) {
      tiles.push({ x: padding + (inner / (perSide - 1)) * i, y: padding })
    }
    // right column
    for (let i = 1; i < perSide; i++) {
      tiles.push({ x: padding + inner, y: padding + (inner / (perSide - 1)) * i })
    }
    // bottom row (reverse)
    for (let i = perSide - 2; i >= 0; i--) {
      tiles.push({ x: padding + (inner / (perSide - 1)) * i, y: padding + inner })
    }
    // left column
    for (let i = perSide - 2; i >= 1; i--) {
      tiles.push({ x: padding, y: padding + (inner / (perSide - 1)) * i })
    }

    setTileCoords(tiles)
    return () => {
      timers.current.forEach((id) => clearTimeout(id))
    }
  }, [properties])

  // step-by-step animation when players prop changes
  useEffect(() => {
    const nTiles = tileCoords.length || 12
    players.forEach((p) => {
      const cur = displayPosRef.current[p.id] ?? p.pos
      if (cur === p.pos) return
      // compute forward steps
      let steps = (p.pos - cur + nTiles) % nTiles
      if (steps < 0) steps += nTiles
      const stepDelay = 220
      for (let i = 1; i <= steps; i++) {
        const t = window.setTimeout(() => {
          displayPosRef.current[p.id] = (cur + i) % nTiles
          setTick((t) => t + 1)
        }, i * stepDelay)
        timers.current.push(t)
      }
    })
    // cleanup of timers for players who left
    return () => {}
  }, [players, tileCoords])

  // helper to get display pos
  function getDisplayPos(p: Player) {
    return displayPosRef.current[p.id] ?? p.pos
  }

  function getColorForIndex(i: number) {
    // simple palette for variety on the board
    const palette = ['#f97316', '#ef4444', '#f43f5e', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#60a5fa']
    return palette[i % palette.length]
  }

  return (
    <div className="board-wrap">
      <div className="board" ref={boardRef}>
        {tileCoords.map((t, i) => {
          // allow server to supply properties; fall back to generated names/prices
          const prop = properties?.find((pr) => pr.id === i) ?? { id: i, name: `Place ${i}`, cost: 50 + (i % 10) * 10, ownerId: null }
          return (
            <div key={i} className="tile" style={{ left: t.x, top: t.y }}>
              <div className="tile-top" style={{ background: getColorForIndex(i) }} />
              <div className="tile-inner">{prop.name}</div>
              <div className="tile-meta">${prop.cost}{prop.ownerId ? ` • owned` : ''}</div>
            </div>
          )
        })}

        {players.map((p) => {
          const displayPos = getDisplayPos(p)
          const coord = tileCoords[displayPos % (tileCoords.length || 1)] || { x: 0, y: 0 }
          // center token on tile
          const style: React.CSSProperties = {
            left: (coord.x || 0) + 6,
            top: (coord.y || 0) + 6
          }
          return (
            <div key={p.id} className={`token ${p.id === myId ? 'me' : ''}`} style={style} title={`${p.name} ($${p.money ?? 0})`}>
              {p.name[0] || '?'}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        .board-wrap{width:460px;height:460px;display:flex;align-items:center;justify-content:center}
        .board{position:relative;width:420px;height:420px;background:linear-gradient(180deg,#fff,#f1f5f9);border-radius:12px;box-shadow:0 10px 30px rgba(2,6,23,0.08);overflow:hidden}
  .tile{position:absolute;width:120px;height:60px;background:rgba(99,102,241,0.04);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#334155;font-weight:600;padding:6px;overflow:hidden}
  .tile-top{position:absolute;left:0;right:0;top:0;height:8px}
        .tile-inner{font-size:12px}
        .tile-meta{font-size:11px;color:#64748b}
  .token{position:absolute;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;background:#ef4444;transition:left 220ms linear, top 220ms linear;box-shadow:0 6px 14px rgba(15,23,42,0.18);font-size:12px}
        .token.me{background:#10b981}
      `}</style>
    </div>
  )
}
