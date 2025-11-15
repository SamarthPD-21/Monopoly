import { useEffect, useRef, useState } from 'react'
import React from 'react'
import { tiles as MonopolyTiles, type MonopolyTile } from '../data/properties'
type Player = { id: string; name: string; pos: number; money?: number }
type Property = { id: number; name: string; cost: number; ownerId: string | null }

export default function Board({ players, myId, properties, onBuyProperty }: { 
  players: Player[]; 
  myId: string | null; 
  properties?: Property[];
  onBuyProperty?: (propertyId: number) => void;
}) {
  const [animatingPlayers, setAnimatingPlayers] = useState<Record<string, number>>({})
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [trace, setTrace] = useState<number[]>([])
  // Zoom/pan state
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{startX:number; startY:number; origX:number; origY:number} | null>(null)
  
  // Use official tile data; map server ownership if provided
  const boardProperties: Property[] = (properties && properties.length > 0
    ? properties
    : MonopolyTiles.map(t => ({ id: t.id, name: t.name, cost: t.price ?? 0, ownerId: null }))
  )
  
  console.log('🎲 Board rendering with:', {
    players: players.length,
    properties: boardProperties.length
  })
  
  const handlePropertyClick = (prop: Property) => {
    // Only allow interaction if it's your turn and property is unowned
    if (!prop.ownerId && prop.cost > 0) {
      setSelectedProperty(prop)
    }
  }
  
  const handleBuyProperty = () => {
    if (selectedProperty && onBuyProperty) {
      onBuyProperty(selectedProperty.id)
      setSelectedProperty(null)
    }
  }
  
  // Helper to get official tile meta (with true rents) by id
  const getTileMetaById = (id: number): MonopolyTile | undefined => MonopolyTiles.find(t => t.id === id)

  // Fallback rent estimation only if meta is missing
  const getEstimatedRentTable = (cost: number) => {
    const base = Math.max(1, Math.floor(cost * 0.1))
    return { base, house1: base * 5, house2: base * 15, house3: base * 45, house4: base * 80, hotel: base * 125 }
  }
  
  const myPlayer = players.find(p => p.id === myId)
  
  // Initialize display positions
  useEffect(() => {
    const initial: Record<string, number> = {}
    players.forEach(p => {
      if (animatingPlayers[p.id] === undefined) {
        initial[p.id] = p.pos
      }
    })
    if (Object.keys(initial).length > 0) {
      setAnimatingPlayers(prev => ({ ...prev, ...initial }))
    }
  }, [players])

  // Animate position changes with trace highlight
  useEffect(() => {
    players.forEach(p => {
      const currentPos = animatingPlayers[p.id] ?? p.pos
      if (currentPos !== p.pos) {
        // Animate step by step
        const totalTiles = 40
        let steps = (p.pos - currentPos + totalTiles) % totalTiles
        if (steps === 0) steps = totalTiles
        
        for (let i = 1; i <= steps; i++) {
          setTimeout(() => {
            setAnimatingPlayers(prev => ({
              ...prev,
              [p.id]: (currentPos + i) % totalTiles
            }))
          }, i * 200)
        }
      }
    })
  }, [players])

  const getDisplayPos = (playerId: string) => animatingPlayers[playerId] ?? 0
  
  const totalTiles = 40 // Standard Monopoly board
  
  // Get tile position and rotation for proper Monopoly board layout
  // Bottom: 0-10, Left: 11-19, Top: 20-30, Right: 31-39
  const getTileStyle = (index: number): React.CSSProperties => {
    // Percent-based layout derived from a perfect 11x11 grid
    const sideThickness = 13 // percentage used for corner width/height
    const between = (100 - 2 * sideThickness) / 9 // spans between corners

    // Bottom row (0..10) right → left
    if (index >= 0 && index <= 10) {
      if (index === 0) {
        return { bottom: 0, right: 0, width: `${sideThickness}%`, height: `${sideThickness}%`, zIndex: 20 }
      }
      if (index === 10) {
        return { bottom: 0, left: 0, width: `${sideThickness}%`, height: `${sideThickness}%`, zIndex: 20 }
      }
      const pos = index - 1
      return {
        bottom: 0,
        right: `${sideThickness + pos * between}%`,
        width: `${between}%`,
        height: `${sideThickness}%`,
        zIndex: 20,
      }
    }
    // Left column (11..19) bottom → top
    if (index >= 11 && index <= 19) {
      const pos = index - 11
      return {
        left: 0,
        bottom: `${sideThickness + pos * between}%`,
        width: `${sideThickness}%`,
        height: `${between}%`,
        zIndex: 20,
      }
    }
    // Top row (20..30) left → right
    if (index >= 20 && index <= 30) {
      if (index === 20) {
        return { top: 0, left: 0, width: `${sideThickness}%`, height: `${sideThickness}%`, zIndex: 20 }
      }
      if (index === 30) {
        return { top: 0, right: 0, width: `${sideThickness}%`, height: `${sideThickness}%`, zIndex: 20 }
      }
      const pos = index - 21
      return {
        top: 0,
        left: `${sideThickness + pos * between}%`,
        width: `${between}%`,
        height: `${sideThickness}%`,
        zIndex: 20,
      }
    }
    // Right column (31..39) top → bottom
    const pos = index - 31
    return {
      right: 0,
      top: `${sideThickness + pos * between}%`,
      width: `${sideThickness}%`,
      height: `${between}%`,
      zIndex: 20,
    }
  }

  const getPlayerColor = (playerId: string) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Proper Monopoly color groups
  const getPropertyColor = (index: number) => {
    // Brown (Mediterranean, Baltic)
    if (index === 1 || index === 3) return '#8B4513'
    // Light Blue (Oriental, Vermont, Connecticut)
    if (index === 6 || index === 8 || index === 9) return '#87CEEB'
    // Pink (St. Charles, States, Virginia)
    if (index === 11 || index === 13 || index === 14) return '#FF1493'
    // Orange (St. James, Tennessee, New York)
    if (index === 16 || index === 18 || index === 19) return '#FFA500'
    // Red (Kentucky, Indiana, Illinois)
    if (index === 21 || index === 23 || index === 24) return '#FF0000'
    // Yellow (Atlantic, Ventnor, Marvin Gardens)
    if (index === 26 || index === 27 || index === 29) return '#FFFF00'
    // Green (Pacific, North Carolina, Pennsylvania)
    if (index === 31 || index === 32 || index === 34) return '#00FF00'
    // Dark Blue (Park Place, Boardwalk)
    if (index === 37 || index === 39) return '#0000FF'
    // Railroads
    if (index === 5 || index === 15 || index === 25 || index === 35) return '#000000'
    // Utilities
    if (index === 12 || index === 28) return '#FFFFFF'
    // Special spaces (GO, Jail, etc.)
    return '#E0E0E0'
  }
  
  // Determine if property is a corner space
  const isCornerSpace = (index: number) => {
    return index === 0 || index === 10 || index === 20 || index === 30
  }
  
  // Get emoji/icon for special spaces
  const getSpaceIcon = (index: number, name: string) => {
    if (index === 0) return '→' // GO
    if (index === 10) return '👁️' // Just Visiting
    if (index === 20) return '🅿️' // Free Parking
    if (index === 30) return '🚔' // Go To Jail
    if (name.includes('Chance')) return '?'
    if (name.includes('Community Chest')) return '📦'
    if (name.includes('Railroad')) return '🚂'
    if (name.includes('Tax')) return '💰'
    if (name.includes('Works') || name.includes('Company')) return '⚡'
    return null
  }

  // Tooltip state
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<{x:number;y:number;title:string;desc?:string}|null>(null)

  const showTooltip = (e: React.MouseEvent, index: number, prop: Property) => {
    const tile = e.currentTarget as HTMLElement
    const rect = tile.getBoundingClientRect()
    const meta = getTileMetaById(prop.id)
    let desc: string | undefined
    if (meta) {
      if (meta.type === 'property' && meta.rents) {
        desc = `Price $${meta.price}\nRent $${meta.rents.base}\n1h $${meta.rents.house1} • 2h $${meta.rents.house2}\n3h $${meta.rents.house3} • 4h $${meta.rents.house4}\nHotel $${meta.rents.hotel}`
      } else if (meta.type === 'railroad') {
        desc = `Price $${meta.price}\nRent $25/$50/$100/$200 (1-4 railroads)`
      } else if (meta.type === 'utility') {
        desc = `Price $${meta.price}\nRent 4× dice (one) / 10× dice (both)`
      } else if (prop.cost > 0) {
        desc = `Price $${prop.cost}`
      }
    } else if (prop.cost > 0) {
      desc = `Price $${prop.cost}`
    }
    setTooltip({ x: rect.left + rect.width/2, y: rect.top - 8, title: prop.name, desc })
  }
  const hideTooltip = () => setTooltip(null)

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY
    const factor = delta > 0 ? 1.1 : 0.9
    setScale(s => Math.min(1.8, Math.max(0.6, Number((s * factor).toFixed(3)))))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
  }
  const onMouseUp = () => { dragRef.current = null }

  return (
    <div className="monopoly-board-container">
      <div className="monopoly-board-viewport" onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <div className="board-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'top left' }}>
          <div className="monopoly-board" ref={boardRef}>
        {/* Properties around the board */}
        {boardProperties?.map((prop, index) => {
          const playersHere = players.filter(p => getDisplayPos(p.id) === index)
          const isCorner = isCornerSpace(index)
          const icon = getSpaceIcon(index, prop.name)
          
          return (
            <div
              key={prop.id}
              className={`property-tile ${isCorner ? 'corner' : ''}`}
              style={getTileStyle(index)}
              onClick={() => handlePropertyClick(prop)}
              onMouseEnter={(e) => showTooltip(e, index, prop)}
              onMouseLeave={hideTooltip}
            >
              {!isCorner && (
                <div 
                  className="property-color-bar" 
                  style={{ 
                    backgroundColor: getPropertyColor(index),
                    border: getPropertyColor(index) === '#FFFFFF' ? '2px solid #333' : 'none'
                  }} 
                />
              )}
              <div className="property-info">
                {icon && <div className="property-icon">{icon}</div>}
                <div className="property-name">{prop.name}</div>
                {(() => {
                  const meta = getTileMetaById(prop.id)
                  if (!meta) return prop.cost > 0 ? (
                    <>
                      <div className="property-price">PRICE ${prop.cost}</div>
                      <div className="property-rent">RENT ${Math.floor(prop.cost * 0.1)}</div>
                    </>
                  ) : null
                  if (meta.type === 'property') {
                    return (
                      <>
                        {meta.price ? <div className="property-price">PRICE ${meta.price}</div> : null}
                        {meta.rents ? <div className="property-rent">RENT ${meta.rents.base}</div> : null}
                      </>
                    )
                  }
                  if (meta.type === 'railroad') {
                    return (
                      <>
                        {meta.price ? <div className="property-price">PRICE ${meta.price}</div> : null}
                        <div className="property-rent">RENT 25/50/100/200</div>
                      </>
                    )
                  }
                  if (meta.type === 'utility') {
                    return (
                      <>
                        {meta.price ? <div className="property-price">PRICE ${meta.price}</div> : null}
                        <div className="property-rent">RENT 4×/10×</div>
                      </>
                    )
                  }
                  return meta.price ? (
                    <>
                      <div className="property-price">PRICE ${meta.price}</div>
                    </>
                  ) : null
                })()}
                {prop.ownerId && (
                  <div className="property-owned-badge">
                    <span className="owned-icon">👑</span>
                    <span className="owned-text">OWNED</span>
                  </div>
                )}
              </div>
              
              {/* Player tokens on this tile */}
              {playersHere.length > 0 && (
                <div className="players-on-tile">
                  {playersHere.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`player-token ${p.id === myId ? 'my-token' : ''} ${p.id.startsWith('bot_') ? 'bot-token' : ''}`}
                      style={{
                        backgroundColor: getPlayerColor(p.id),
                        transform: `translateX(${idx * 10}px)`
                      }}
                      title={`${p.name} - $${p.money || 0}`}
                    >
                      {p.id.startsWith('bot_') ? '🤖' : p.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Center board area - just branding */}
        <div className="board-center">
          <div className="center-content">
            <div className="board-title">MONOPOLY</div>
            <div className="board-subtitle">Online Edition</div>
            <div className="dice-placeholder">
              <div className="dice">🎲</div>
              <div className="dice">🎲</div>
            </div>
          </div>
        </div>
          </div>
        </div>
        {/* Zoom controls */}
        <div className="zoom-controls">
          <button className="btn ghost" onClick={() => setScale(s => Math.min(1.8, Number((s*1.1).toFixed(3))))}>＋</button>
          <button className="btn ghost" onClick={() => setScale(s => Math.max(0.6, Number((s*0.9).toFixed(3))))}>－</button>
          <button className="btn ghost" onClick={() => { setScale(1); setOffset({x:0,y:0}) }}>Reset</button>
        </div>
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div className="tile-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tile-tooltip-title">{tooltip.title}</div>
          {tooltip.desc && <div className="tile-tooltip-desc">{tooltip.desc}</div>}
        </div>
      )}

      {/* Property Details Popup */}
      {selectedProperty && (
        <div className="modal-overlay" onClick={() => setSelectedProperty(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">🏠 {selectedProperty.name}</h2>
            <div className="modal-details">
              <div className="modal-row">
                <span className="modal-label">Purchase Price</span>
                <span className="modal-value price">${selectedProperty.cost}</span>
              </div>
              {(() => {
                const meta = getTileMetaById(selectedProperty.id)
                if (meta && meta.type === 'property' && meta.rents) {
                  const r = meta.rents
                  return (
                    <>
                      <div className="modal-row"><span className="modal-label">Rent (no houses)</span><span className="modal-value rent">${r.base}</span></div>
                      <div className="modal-row"><span className="modal-label">With 1 house</span><span className="modal-value">${r.house1}</span></div>
                      <div className="modal-row"><span className="modal-label">With 2 houses</span><span className="modal-value">${r.house2}</span></div>
                      <div className="modal-row"><span className="modal-label">With 3 houses</span><span className="modal-value">${r.house3}</span></div>
                      <div className="modal-row"><span className="modal-label">With 4 houses</span><span className="modal-value">${r.house4}</span></div>
                      <div className="modal-row"><span className="modal-label">With hotel</span><span className="modal-value">${r.hotel}</span></div>
                    </>
                  )
                }
                if (meta && meta.type === 'railroad') {
                  return (
                    <>
                      <div className="modal-row"><span className="modal-label">Rent (railroads owned)</span><span className="modal-value">$25 / $50 / $100 / $200</span></div>
                    </>
                  )
                }
                if (meta && meta.type === 'utility') {
                  return (
                    <>
                      <div className="modal-row"><span className="modal-label">Rent</span><span className="modal-value">4× dice (one) / 10× dice (both)</span></div>
                    </>
                  )
                }
                // Fallback estimate
                const r = getEstimatedRentTable(selectedProperty.cost)
                return (
                  <>
                    <div className="modal-row"><span className="modal-label">Rent (no houses)</span><span className="modal-value rent">${r.base}</span></div>
                    <div className="modal-row"><span className="modal-label">With 1 house</span><span className="modal-value">${r.house1}</span></div>
                    <div className="modal-row"><span className="modal-label">With 2 houses</span><span className="modal-value">${r.house2}</span></div>
                    <div className="modal-row"><span className="modal-label">With 3 houses</span><span className="modal-value">${r.house3}</span></div>
                    <div className="modal-row"><span className="modal-label">With 4 houses</span><span className="modal-value">${r.house4}</span></div>
                    <div className="modal-row"><span className="modal-label">With hotel</span><span className="modal-value">${r.hotel}</span></div>
                  </>
                )
              })()}
              {myPlayer && (
                <div className="modal-row">
                  <span className="modal-label">Your Money</span>
                  <span className="modal-value money">${myPlayer.money || 0}</span>
                </div>
              )}
              {selectedProperty.ownerId && (
                <div className="modal-row">
                  <span className="modal-label">Owned By</span>
                  <span className="modal-value">{selectedProperty.ownerId}</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              {!selectedProperty.ownerId && (
                <button 
                  className="modal-btn buy-btn"
                  onClick={handleBuyProperty}
                  disabled={!myPlayer || (myPlayer.money || 0) < selectedProperty.cost}
                >
                  💰 Buy Property
                </button>
              )}
              <button 
                className="modal-btn cancel-btn"
                onClick={() => setSelectedProperty(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .monopoly-board-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 0;
        }

        .tile-tooltip {
          position: fixed;
          transform: translate(-50%, -100%);
          background: rgba(16, 8, 30, 0.95);
          border: 1px solid rgba(168, 85, 247, 0.6);
          color: #e0d5ff;
          border-radius: 8px;
          padding: 6px 10px;
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }
        .tile-tooltip-title { font-weight: 700; font-size: 12px; }
        .tile-tooltip-desc { font-size: 11px; opacity: 0.85; white-space: pre-line; }

        .monopoly-board {
          position: relative;
          width: 100%;
          height: 100%;
          max-width: min(100vh, 100%);
          max-height: min(100vh, 100%);
          max-width: 1400px;
          max-height: 1400px;
          background: 
            linear-gradient(to right, rgba(10, 92, 60, 0.95) 0%, rgba(13, 112, 71, 0.95) 50%, rgba(10, 92, 60, 0.95) 100%),
            repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.05) 35px, rgba(0,0,0,.05) 70px);
          border: 10px solid #000;
          box-shadow: 
            0 0 0 3px #d4af37,
            0 0 0 13px #000,
            0 50px 120px rgba(0, 0, 0, 0.9),
            inset 0 0 100px rgba(0, 0, 0, 0.3);
          position: relative;
        }

        .property-tile {
          position: absolute;
          background: linear-gradient(to bottom, #ffffff 0%, #fafafa 100%);
          border: 3px solid #000;
          display: flex;
          flex-direction: column;
          overflow: visible;
          box-shadow: 
            0 8px 20px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          z-index: 1;
        }

        .property-tile:hover {
          transform: scale(1.08) translateY(-4px);
          z-index: 200;
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.7),
            0 0 24px rgba(255, 215, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .property-tile.corner {
          background: 
            linear-gradient(135deg, #8b0000 0%, #dc143c 50%, #8b0000 100%),
            radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), transparent);
          color: white;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 12px 8px;
          border: 5px solid #000;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.7),
            inset 0 2px 5px rgba(255, 255, 255, 0.3),
            inset 0 -2px 5px rgba(0, 0, 0, 0.5);
        }

        .property-tile.corner:hover {
          transform: scale(1.15) rotate(-2deg);
        }

        .property-tile.corner .property-info {
          background: transparent;
          padding: 4px;
        }

        .property-tile.corner .property-name {
          color: white;
          font-size: 0.75rem;
          font-weight: 900;
          text-shadow: 
            2px 2px 0 #000,
            -1px -1px 0 #000,
            1px -1px 0 #000,
            -1px 1px 0 #000,
            0 0 10px rgba(255, 215, 0, 0.8);
          letter-spacing: 1px;
        }

        .property-color-bar {
          width: 100%;
          height: 40px;
          flex-shrink: 0;
          border-bottom: 3px solid #000;
          box-shadow: inset 0 -3px 8px rgba(0, 0, 0, 0.3);
        }

        .property-info {
          flex: 1;
          padding: 10px 8px 8px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          position: relative;
          background: white;
          gap: 3px;
        }

        .property-icon {
          font-size: 1.6rem;
          margin-bottom: 3px;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .property-name {
          font-size: 0.72rem;
          font-weight: 900;
          color: #000;
          text-align: center;
          line-height: 1.15;
          text-transform: uppercase;
          margin-bottom: 5px;
          letter-spacing: 0.5px;
          max-height: 2.3em;
          overflow: hidden;
          font-family: 'Arial Black', 'Arial Bold', sans-serif;
        }

        .property-price {
          font-size: 0.7rem;
          color: #000;
          font-weight: 900;
          font-family: 'Arial', sans-serif;
          margin-bottom: 2px;
          background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
          padding: 2px 8px;
          border-radius: 3px;
          border: 1px solid #000;
        }

        .property-rent {
          font-size: 0.65rem;
          color: #fff;
          font-weight: 800;
          font-family: 'Arial', sans-serif;
          padding: 3px 8px;
          background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
          border-radius: 4px;
          border: 2px solid #000;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }

        .property-owned-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
          color: #000;
          font-size: 0.55rem;
          font-weight: 900;
          padding: 3px 6px;
          border-radius: 6px;
          border: 2px solid #000;
          display: flex;
          align-items: center;
          gap: 3px;
          box-shadow: 
            0 3px 10px rgba(255, 215, 0, 0.8),
            inset 0 1px 2px rgba(255, 255, 255, 0.8);
          z-index: 10;
          animation: ownedPulse 2s infinite;
        }

        @keyframes ownedPulse {
          0%, 100% {
            box-shadow: 
              0 3px 10px rgba(255, 215, 0, 0.8),
              inset 0 1px 2px rgba(255, 255, 255, 0.8);
          }
          50% {
            box-shadow: 
              0 3px 15px rgba(255, 215, 0, 1),
              0 0 20px rgba(255, 215, 0, 0.6),
              inset 0 1px 2px rgba(255, 255, 255, 0.8);
          }
        }

        .owned-icon {
          font-size: 0.75rem;
          line-height: 1;
          animation: spin 3s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .owned-text {
          line-height: 1;
          letter-spacing: 0.5px;
        }

        .players-on-tile {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 2px;
          z-index: 50;
          flex-wrap: wrap;
          max-width: 95%;
          justify-content: center;
        }

        .player-token {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 900;
          border: 3px solid #fff;
          box-shadow: 
            0 5px 15px rgba(0, 0, 0, 0.9),
            0 0 20px rgba(255, 255, 255, 0.5),
            inset 0 2px 5px rgba(255, 255, 255, 0.4);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9);
          position: relative;
        }

        .player-token:hover {
          transform: scale(1.4) translateY(-8px);
          z-index: 100;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.9),
            0 0 40px currentColor,
            inset 0 2px 5px rgba(255, 255, 255, 0.4);
        }

        .player-token.my-token {
          border-color: #ffd700;
          border-width: 4px;
          box-shadow: 
            0 0 40px rgba(255, 215, 0, 1),
            0 5px 20px rgba(0, 0, 0, 0.9),
            inset 0 2px 5px rgba(255, 255, 255, 0.6);
          animation: myTokenPulse 2s infinite;
        }

        @keyframes myTokenPulse {
          0%, 100% { 
            box-shadow: 
              0 0 30px rgba(255, 215, 0, 1),
              0 5px 15px rgba(0, 0, 0, 0.7),
              inset 0 2px 5px rgba(255, 255, 255, 0.5);
          }
          50% { 
            box-shadow: 
              0 0 50px rgba(255, 215, 0, 1),
              0 0 80px rgba(255, 215, 0, 0.6),
              0 5px 15px rgba(0, 0, 0, 0.7),
              inset 0 2px 5px rgba(255, 255, 255, 0.5);
            transform: scale(1.08);
          }
        }

        .player-token.bot-token {
          font-size: 16px;
        }

        .board-center {
          position: absolute;
          top: 15%;
          left: 15%;
          right: 15%;
          bottom: 15%;
          background: 
            linear-gradient(135deg, rgba(139, 0, 0, 0.25) 0%, rgba(220, 20, 60, 0.25) 50%, rgba(139, 0, 0, 0.25) 100%),
            radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.2) 100%);
          border: 6px solid #8b0000;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2px);
          box-shadow: 
            inset 0 0 80px rgba(139, 0, 0, 0.5),
            0 0 0 2px rgba(212, 175, 55, 0.8),
            0 10px 40px rgba(0, 0, 0, 0.6);
        }

        .center-content {
          text-align: center;
        }

        .board-title {
          font-family: 'Impact', 'Arial Black', sans-serif;
          font-size: 6rem;
          font-weight: 900;
          background: linear-gradient(180deg, #ff6b6b 0%, #dc143c 50%, #8b0000 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(5px 5px 0 #000)
                  drop-shadow(-2px -2px 0 #fff)
                  drop-shadow(0 0 50px rgba(220, 20, 60, 0.9));
          margin-bottom: 0.5rem;
          letter-spacing: 15px;
          transform: scaleY(1.2);
          animation: titleGlow 3s ease-in-out infinite;
        }

        @keyframes titleGlow {
          0%, 100% {
            filter: drop-shadow(5px 5px 0 #000)
                    drop-shadow(-2px -2px 0 #fff)
                    drop-shadow(0 0 50px rgba(220, 20, 60, 0.9));
          }
          50% {
            filter: drop-shadow(5px 5px 0 #000)
                    drop-shadow(-2px -2px 0 #fff)
                    drop-shadow(0 0 80px rgba(220, 20, 60, 1))
                    drop-shadow(0 0 120px rgba(255, 215, 0, 0.6));
          }
        }

        .board-subtitle {
          font-size: 1.5rem;
          color: #fff;
          font-weight: 900;
          margin-bottom: 3.5rem;
          letter-spacing: 6px;
          text-shadow: 
            3px 3px 0 #000,
            -1px -1px 0 #000,
            1px -1px 0 #000,
            -1px 1px 0 #000,
            0 0 30px rgba(255, 255, 255, 0.8);
          font-family: 'Arial Black', sans-serif;
        }

        .dice-placeholder {
          display: flex;
          gap: 3rem;
          justify-content: center;
          align-items: center;
        }

        .dice {
          font-size: 7rem;
          filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.8))
                  drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6));
          animation: diceFloat 3s ease-in-out infinite;
        }

        .dice:nth-child(2) {
          animation-delay: -1.5s;
        }

        @keyframes diceFloat {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1); 
          }
          50% { 
            transform: translateY(-30px) rotate(20deg) scale(1.1); 
          }
        }

        /* Property Purchase Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(12px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: 
            linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%),
            repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.02) 10px, rgba(0,0,0,.02) 20px);
          border: 8px solid #000;
          box-shadow: 
            0 0 0 3px #d4af37,
            0 0 0 11px #000,
            0 30px 80px rgba(0, 0, 0, 0.9);
          border-radius: 20px;
          padding: 1.5rem;
          min-width: 360px;
          animation: slideUpBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
        }

        .modal-content.small { max-width: 420px; }

        @keyframes slideUpBounce {
          from { 
            transform: translateY(100px) scale(0.8);
            opacity: 0;
          }
          to { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        .modal-title {
          font-size: 2rem;
          font-weight: 900;
          color: #000;
          text-align: center;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-family: 'Impact', 'Arial Black', sans-serif;
          text-shadow: 2px 2px 0 #d4af37;
        }

        .modal-details {
          background: white;
          border: 5px solid #000;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .modal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 3px solid #e0e0e0;
        }

        .modal-row:last-child {
          border-bottom: none;
        }

        .modal-label {
          font-size: 1.1rem;
          font-weight: 800;
          color: #333;
          font-family: 'Arial Black', sans-serif;
        }

        .modal-value {
          font-size: 1.4rem;
          font-weight: 900;
          font-family: 'Arial Black', sans-serif;
          padding: 5px 15px;
          border-radius: 6px;
          border: 3px solid #000;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        }

        .modal-value.price {
          background: linear-gradient(135deg, #ff6b6b, #dc143c);
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .modal-value.rent {
          background: linear-gradient(135deg, #3498db, #1565c0);
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .modal-value.money {
          background: linear-gradient(135deg, #2ecc71, #27ae60);
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
        }

        .modal-btn {
          flex: 1;
          padding: 1.2rem;
          font-size: 1.1rem;
          font-weight: 900;
          text-transform: uppercase;
          border: 5px solid #000;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          letter-spacing: 2px;
          font-family: 'Impact', 'Arial Black', sans-serif;
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
        }

        .buy-btn {
          background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .buy-btn:hover:not(:disabled) {
          transform: scale(1.08) translateY(-3px);
          box-shadow: 0 10px 30px rgba(76, 175, 80, 0.8);
        }

        .buy-btn:active:not(:disabled) {
          transform: scale(1.02);
        }

        .buy-btn:disabled {
          background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
          cursor: not-allowed;
          opacity: 0.5;
          transform: none;
        }

        .cancel-btn {
          background: linear-gradient(135deg, #f44336 0%, #c62828 100%);
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .cancel-btn:hover {
          transform: scale(1.08) translateY(-3px);
          box-shadow: 0 10px 30px rgba(244, 67, 54, 0.8);
        }

        .cancel-btn:active {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  )
}

