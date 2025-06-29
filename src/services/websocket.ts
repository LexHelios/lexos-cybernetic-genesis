
import { WebSocketMessage } from '../types/api';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private clientId: string = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  private getWebSocketUrl(): string {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://lexos.sharma.family' 
      : 'ws://localhost:8000';
    return `${baseUrl}/ws/${this.clientId}`;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.getWebSocketUrl());
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to LexOS backend');
        this.reconnectAttempts = 0;
        
        // Send initial connection message
        this.send({
          type: 'connection',
          data: { client_id: this.clientId, timestamp: Date.now() }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          this.notifyListeners(message.type || 'unknown', message.data || message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected from LexOS backend');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  subscribe(messageType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    this.listeners.get(messageType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(messageType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(messageType);
        }
      }
    };
  }

  private notifyListeners(messageType: string, data: any): void {
    const callbacks = this.listeners.get(messageType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const websocketService = new WebSocketService();
