"""
websocket_manager.py — Real-time event broadcasting to connected frontend clients.
"""
from __future__ import annotations

import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, event_type_or_payload: Any, data: Any = None) -> None:
        """Broadcast structured event to all connected clients. Supports dict or (event_type, data)."""
        if not self.active_connections:
            return

        if isinstance(event_type_or_payload, dict):
            payload_dict = event_type_or_payload
        else:
            payload_dict = {"type": str(event_type_or_payload), "data": data}

        payload = json.dumps(payload_dict, default=str)
        dead_connections: list[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)


manager = ConnectionManager()
