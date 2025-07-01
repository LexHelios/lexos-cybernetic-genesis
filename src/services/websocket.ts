import { toast } from 'sonner';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, EventCallback[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private isConnecting = false;

  private getWebSocketUrl(): string {
    // Always use localhost:9000 for development
    return 'ws://localhost:9000/ws/monitoring';
  }

  constructor() {
    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    
    const wsUrl = this.getWebSocketUrl();
    
    console.log('WebSocket: Attempting to connect to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket: Connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Send initial connection message
        this.send({
          type: 'connection',
          data: { client: 'nexus-frontend' }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket: Received message:', message);
          
          if (message.type && this.subscribers.has(message.type)) {
            const callbacks = this.subscribers.get(message.type);
            if (callbacks) {
              callbacks.forEach(callback => {
                try {
                  callback(message.data);
                } catch (error) {
                  console.error('WebSocket: Error in callback:', error);
                }
              });
            }
          }
        } catch (error) {
          console.error('WebSocket: Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        
        // Attempt to reconnect if it wasn't a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('WebSocket: Failed to create connection:', error);
      this.isConnecting = false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectAttempts++;
    console.log(`WebSocket: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket: Cannot send message, connection not open');
    }
  }

  subscribe(eventType: string, callback: EventCallback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    this.subscribers.get(eventType)!.push(callback);
    console.log(`Subscribed to WebSocket event: ${eventType}`);
    
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
          if (callbacks.length === 0) {
            this.subscribers.delete(eventType);
          }
        }
      }
    };
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
