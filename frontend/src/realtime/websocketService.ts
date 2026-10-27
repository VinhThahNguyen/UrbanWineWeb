export interface RealtimeNotification {
  type: 'ORDER_REJECTED' | 'ORDER_APPROVED' | 'ORDER_SHIPPING' | 'ORDER_COMPLETED' | string;
  orderId?: number;
  orderCode?: string;
  customerEmail?: string;
  title: string;
  message: string;
  reason?: string;
  timestamp?: string;
}

type NotificationListener = (notification: RealtimeNotification) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private reconnectTimeout: any = null;
  private userEmail: string | null = null;
  private isExplicitlyClosed: boolean = false;

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Backend Spring Boot runs on port 8080
    const host = window.location.hostname || 'localhost';
    return `${protocol}//${host}:8080/ws/notifications`;
  }

  public connect(email?: string): void {
    if (email) {
      this.userEmail = email;
    }
    this.isExplicitlyClosed = false;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.userEmail && this.socket.readyState === WebSocket.OPEN) {
        this.sendIdentify(this.userEmail);
      }
      return;
    }

    try {
      const url = this.getWebSocketUrl();
      console.log(`[WebSocket] Connecting to ${url}...`);
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('[WebSocket] Connection established successfully.');
        if (this.userEmail) {
          this.sendIdentify(this.userEmail);
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data: RealtimeNotification = JSON.parse(event.data);
          console.log('[WebSocket] Real-time notification received:', data);
          this.notifyListeners(data);
        } catch (err) {
          console.warn('[WebSocket] Error parsing incoming notification frame:', err);
        }
      };

      this.socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.warn('[WebSocket] Connection error:', error);
      };
    } catch (err) {
      console.warn('[WebSocket] Connection creation error:', err);
      this.scheduleReconnect();
    }
  }

  private sendIdentify(email: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'IDENTIFY', email }));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.isExplicitlyClosed) {
        console.log('[WebSocket] Attempting auto-reconnect...');
        this.connect();
      }
    }, 4000);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(notification: RealtimeNotification): void {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.error('[WebSocket] Error in notification listener callback:', err);
      }
    });
  }
}

export const websocketService = new WebSocketService();
