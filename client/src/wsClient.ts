type MessageHandler = (msg: unknown) => void
type ConnectionHandler = (connected: boolean) => void

class WsClient {
	private ws: WebSocket | null = null
	private messageHandlers = new Set<MessageHandler>()
	private connectionHandlers = new Set<ConnectionHandler>()
	private reconnectTimer: number | null = null
	private _connected = false

	get connected(): boolean {
		return this._connected
	}

	connect(): void {
		const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
		const url = `${protocol}//${location.host}/ws`
		this.ws = new WebSocket(url)

		this.ws.onopen = () => {
			this._connected = true
			this.notifyConnection(true)
		}

		this.ws.onclose = () => {
			this._connected = false
			this.notifyConnection(false)
			this.scheduleReconnect()
		}

		this.ws.onerror = () => {
			// onclose will fire after onerror
		}

		this.ws.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data)
				for (const handler of this.messageHandlers) {
					handler(msg)
				}
			} catch {
				// ignore malformed messages
			}
		}
	}

	postMessage(msg: unknown): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(msg))
		}
	}

	addMessageListener(handler: MessageHandler): void {
		this.messageHandlers.add(handler)
	}

	removeMessageListener(handler: MessageHandler): void {
		this.messageHandlers.delete(handler)
	}

	addConnectionListener(handler: ConnectionHandler): void {
		this.connectionHandlers.add(handler)
	}

	removeConnectionListener(handler: ConnectionHandler): void {
		this.connectionHandlers.delete(handler)
	}

	private notifyConnection(connected: boolean): void {
		for (const handler of this.connectionHandlers) {
			handler(connected)
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer !== null) return
		this.reconnectTimer = window.setTimeout(() => {
			this.reconnectTimer = null
			this.connect()
		}, 2000)
	}
}

export const wsClient = new WsClient()
wsClient.connect()
