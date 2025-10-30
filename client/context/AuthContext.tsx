import React, { createContext, useContext, useEffect, useState } from 'react'

type AuthContextValue = {
  token: string | null
  currentUser: string | null
  loginWithToken: (token: string, refreshToken?: string) => void
  logout: () => void
  tryRefreshIfNeeded: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('token') : null)
  const [refreshToken, setRefreshToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!token) { setCurrentUser(null); return }
      try {
        const r = await fetch('http://localhost:8080/api/me', { headers: { Authorization: `Bearer ${token}` } })
        const j = await r.json()
        if (j && j.username) setCurrentUser(j.username)
        else setCurrentUser(null)
      } catch (e) { setCurrentUser(null) }
    }
    load()
  }, [token])

  function persistToken(t: string | null, refresh?: string | null) {
    try { if (t) localStorage.setItem('token', t); else localStorage.removeItem('token') } catch {}
    try { if (refresh) localStorage.setItem('refreshToken', refresh); else if (refresh === null) localStorage.removeItem('refreshToken') } catch {}
  }

  function loginWithToken(t: string, refresh?: string) {
    setToken(t)
    if (refresh) setRefreshToken(refresh)
    persistToken(t, refresh ?? null)
  }

  function logout() {
    setToken(null)
    setRefreshToken(null)
    setCurrentUser(null)
    persistToken(null, null)
  }

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
    return Date.now() > (p.exp * 1000 - 5000)
  }

  async function tryRefreshIfNeeded() {
    const cur = typeof window !== 'undefined' ? (localStorage.getItem('token') || token) : token
    if (cur && !isTokenExpired(cur)) { setToken(cur); return cur }
    const ref = typeof window !== 'undefined' ? (localStorage.getItem('refreshToken') || refreshToken) : refreshToken
    if (!ref) { logout(); return null }
    try {
      const res = await fetch('http://localhost:8080/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: ref }) })
      const j = await res.json()
      if (res.ok && j.token) {
        loginWithToken(j.token, j.refreshToken)
        return j.token
      }
    } catch (e) {
      console.warn('refresh failed', e)
    }
    logout()
    return null
  }

  const value: AuthContextValue = { token, currentUser, loginWithToken, logout, tryRefreshIfNeeded }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
