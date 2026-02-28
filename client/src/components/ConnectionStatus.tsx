import { useState, useEffect } from 'react'
import { wsClient } from '../wsClient.js'

export function ConnectionStatus() {
  const [connected, setConnected] = useState(wsClient.connected)

  useEffect(() => {
    const handler = (isConnected: boolean) => setConnected(isConnected)
    wsClient.addConnectionListener(handler)
    return () => wsClient.removeConnectionListener(handler)
  }, [])

  if (connected) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        right: 10,
        zIndex: 60,
        background: 'rgba(200, 50, 50, 0.85)',
        color: '#fff',
        fontSize: '20px',
        padding: '4px 10px',
        borderRadius: 0,
        border: '2px solid rgba(255, 100, 100, 0.6)',
        boxShadow: 'var(--pixel-shadow)',
        pointerEvents: 'none',
      }}
    >
      Reconnecting...
    </div>
  )
}
