import React from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { useModal } from '../context/ModalContext'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAuth()
  const { openModal } = useModal()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full border-b border-purple-500/20 bg-black/40 backdrop-blur-md relative z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white font-bold cursor-pointer shadow-lg shadow-purple-500/50" style={{ fontFamily: 'Orbitron, monospace' }}>M</div>
              <div>
                <div className="text-lg font-bold text-purple-300" style={{ fontFamily: 'Orbitron, monospace' }}>Monopoly Online</div>
                <div className="text-xs text-purple-400/70">Realtime board game · Play with friends</div>
              </div>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <div className="text-sm text-purple-300/80">{currentUser ? `Signed in as @${currentUser}` : 'Not signed in'}</div>
            {currentUser ? (
              <button onClick={logout} className="btn ghost">Sign out</button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => openModal('login')} className="btn ghost">Sign in</button>
                <button onClick={() => openModal('signup')} className="btn primary">Sign up</button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
      {/* Footer removed as requested */}
    </div>
  )
}
