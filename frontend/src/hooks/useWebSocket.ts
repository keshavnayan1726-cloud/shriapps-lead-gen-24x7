// src/hooks/useWebSocket.ts — Bulletproof WebSocket with Auto-Discovery & Cloud Port Normalization
import { useEffect, useRef, useState } from 'react'
import { getApiBaseUrl } from '../api/client'

export interface WsMessage {
  type: string
  data?: any
  [key: string]: any
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
        const baseUrl = getApiBaseUrl()
        // Convert http/https baseUrl to ws/wss URL
        let wsUrl: string
        try {
          const urlObj = new URL(baseUrl)
          const protocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:'
          // On cloud providers (Render, Railway), traffic is routed via 443/80, no port in hostname
          const host = urlObj.host // includes port only if specified in baseUrl
          wsUrl = `${protocol}//${host}/ws/live`
        } catch {
          const hostname = window.location.hostname || 'localhost'
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          const port = window.location.port ? `:${window.location.port}` : ''
          wsUrl = `${protocol}//${hostname}${port}/ws/live`
        }

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
            // Auto reconnect after 3 seconds
            reconnectTimeoutRef.current = window.setTimeout(connect, 3000)
          }
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch {
        if (!unmounted) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000)
        }
      }
    }

    connect()

    // Send keepalive ping every 20s
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 20000)

    return () => {
      unmounted = true
      clearInterval(pingInterval)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return { isConnected, lastMessage }
}

