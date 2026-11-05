// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react'

export interface WsMessage {
  type: string
  data: any
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let unmounted = false

    const connect = () => {
      try {
        const hostname = window.location.hostname || 'localhost'
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${wsProtocol}//${hostname}:8000/ws/live`

        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!unmounted) {
            setIsConnected(true)
          }
        }

        ws.onmessage = (event) => {
          if (unmounted) return
          try {
            const parsed = JSON.parse(event.data)
            setLastMessage(parsed)
          } catch {
            // non-json ping/pong
          }
        }

        ws.onclose = () => {
          if (!unmounted) {
            setIsConnected(false)
            // Auto reconnect after 4 seconds
            reconnectTimeoutRef.current = window.setTimeout(connect, 4000)
          }
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch {
        if (!unmounted) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 4000)
        }
      }
    }

    connect()

    // Send keepalive ping every 25s
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 25000)

    return () => {
      unmounted = true
      clearInterval(pingInterval)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return { isConnected, lastMessage }
}
