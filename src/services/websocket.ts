
import { WebSocketMessage } from '../types/api';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private getWebSocketUrl(endpoint: string): string {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://lexos.sharma.family' 
      : 'ws://localhost:8000';
    const token = localStorage.getItem('auth_token');
    return `${baseUrl}${endpoint}?token=${token}`;
  }

  connect(endpoint: string = '/ws/monitoring'): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.getWebSocketUrl(endpoint));
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.notifyListeners(message.type, message.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect(endpoint);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect(endpoint);
    }
  }

  private attemptReconnect(endpoint: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(endpoint);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
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
