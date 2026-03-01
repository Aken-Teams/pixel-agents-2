import { useState, useCallback } from 'react'

interface LoginScreenProps {
  onLogin: (token: string) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!password.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const data = await res.json() as { token: string }
        localStorage.setItem('auth_token', data.token)
        onLogin(data.token)
      } else {
        setError('密碼錯誤')
        setPassword('')
      }
    } catch {
      setError('無法連線到伺服器')
    } finally {
      setLoading(false)
    }
  }, [password, loading, onLogin])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0a14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'FS Pixel Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--pixel-bg, #1e1e2e)',
        border: '2px solid var(--pixel-border, #4a4a6a)',
        boxShadow: 'var(--pixel-shadow, 2px 2px 0px #0a0a14)',
        padding: '32px 28px',
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="AI Agents Office"
            style={{
              width: 180,
              imageRendering: 'pixelated',
            }}
          />
        </div>

        <div style={{
          fontSize: '18px',
          color: 'var(--pixel-text-dim, rgba(255,255,255,0.5))',
          textAlign: 'center',
        }}>
          Enter password to continue
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Password"
          autoFocus
          disabled={loading}
          style={{
            padding: '10px 12px',
            fontSize: '16px',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            background: '#0a0a14',
            color: 'var(--pixel-text, rgba(255,255,255,0.8))',
            border: '2px solid var(--pixel-border, #4a4a6a)',
            borderRadius: 0,
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <div style={{
            fontSize: '13px',
            color: '#e55',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !password.trim()}
          style={{
            padding: '10px',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: "'FS Pixel Sans', sans-serif",
            background: loading || !password.trim()
              ? 'var(--pixel-btn-bg, rgba(255,255,255,0.08))'
              : 'var(--pixel-accent, #5a8cff)',
            color: loading || !password.trim()
              ? 'var(--pixel-text-dim, rgba(255,255,255,0.5))'
              : '#fff',
            border: '2px solid var(--pixel-border, #4a4a6a)',
            borderRadius: 0,
            cursor: loading || !password.trim() ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  )
}
