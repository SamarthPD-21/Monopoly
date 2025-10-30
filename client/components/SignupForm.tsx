import { useRef, useState } from 'react'
import { toast } from 'react-toastify'

export default function SignupForm({ onSignup, onCancel }: { onSignup?: () => void; onCancel?: () => void }) {
  const emailRef = useRef<HTMLInputElement | null>(null)
  const userRef = useRef<HTMLInputElement | null>(null)
  const passRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(false)

  async function signup() {
    const email = emailRef.current?.value || ''
    const username = userRef.current?.value || ''
    const password = passRef.current?.value || ''
    
    if (!email || !username || !password) {
      toast.error('Please fill in all fields')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8080/auth/signup', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email, username, password }) 
      })
      const j = await res.json()
      if (res.ok && j.success) {
        toast.success('Account created! Please sign in.')
        if (onSignup) onSignup()
        if (onCancel) onCancel()
      } else {
        if (j.errors) {
          Object.values(j.errors).forEach((error: any) => toast.error(error))
        } else {
          toast.error('Signup failed: ' + (j.error || 'Unknown error'))
        }
      }
    } catch (e) {
      toast.error('Signup error - please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-3xl font-bold text-center" style={{ fontFamily: 'Orbitron, monospace' }}>
        <span className="text-purple-400">CREATE</span> <span className="text-cyan-400">ACCOUNT</span>
      </h3>
      <p className="text-sm text-purple-300/70 text-center">Create your account to save lobby state and join games.</p>
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
          <label className="block text-xs uppercase tracking-wider text-purple-300 mb-2 font-medium">Username</label>
          <input 
            ref={userRef} 
            placeholder="Choose username (min 3 chars)" 
            className="w-full bg-transparent border border-purple-500/30 px-4 py-3 rounded-lg text-purple-100 placeholder:text-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-purple-300 mb-2 font-medium">Password</label>
          <input 
            ref={passRef} 
            placeholder="Choose password (min 6 chars)" 
            type="password" 
            className="w-full bg-transparent border border-purple-500/30 px-4 py-3 rounded-lg text-purple-100 placeholder:text-purple-400/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && signup()}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-6">
        <button onClick={onCancel} className="btn ghost flex-1" disabled={loading}>Cancel</button>
        <button onClick={signup} className="btn primary flex-1" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  )
}
