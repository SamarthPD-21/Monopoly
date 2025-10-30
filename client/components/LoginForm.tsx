import { useRef, useState } from 'react'
import { toast } from 'react-toastify'

export default function LoginForm({ onLogin, onCancel }: { onLogin: (token: string) => void; onCancel?: () => void }) {
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(false)

  async function login() {
    const email = emailRef.current?.value || ''
    const password = passRef.current?.value || ''
    
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8080/auth/token', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email, password }) 
      })
      const j = await res.json()
      if (res.ok && j.token) {
        // notify parent and persist handled by AuthProvider where appropriate
        try { localStorage.setItem('token', j.token) } catch {}
        if (j.refreshToken) {
          try { localStorage.setItem('refreshToken', j.refreshToken) } catch {}
        }
        toast.success('Welcome back!')
        onLogin(j.token)
        if (onCancel) onCancel()
      } else {
        toast.error('Login failed: ' + (j.error || 'Invalid credentials'))
      }
    } catch (e) {
      toast.error('Login error - please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-3xl font-bold text-center" style={{ fontFamily: 'Orbitron, monospace' }}>
        <span className="text-purple-400">WELCOME</span> <span className="text-cyan-400">BACK</span>
      </h3>
      <p className="text-sm text-purple-300/70 text-center">Sign in to join or create a lobby and play in realtime.</p>
      <div className="flex flex-col gap-4 mt-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-purple-300 mb-2 font-medium">Email</label>
          <input 
            ref={emailRef} 
            type="email"
            placeholder="your@email.com" 
            className="w-full bg-transparent border border-purple-500/30 px-4 py-3 rounded-lg text-purple-100 placeholder:text-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-purple-300 mb-2 font-medium">Password</label>
          <input 
            ref={passRef} 
            placeholder="Enter password" 
            type="password" 
            className="w-full bg-transparent border border-purple-500/30 px-4 py-3 rounded-lg text-purple-100 placeholder:text-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-6">
        <button onClick={onCancel} className="btn ghost flex-1" disabled={loading}>Cancel</button>
        <button onClick={login} className="btn primary flex-1" disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}
