import { io } from 'socket.io-client';

class FlagForgeClient {
  constructor(config) {
    this.envKey = config.envKey;
    this.socketUrl = config.socketUrl || 'http://localhost:3001';
    this.socket = null;
    this.listeners = new Map();
    this.flags = {};
    this.userContext = config.userContext || {};
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.socket.emit('subscribe', {
          envKey: this.envKey,
          userContext: this.userContext
        });
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to flag server'));
        }
      });

      this.socket.on('flag-sync', ({ flags }) => {
        console.log('Flag sync received:', flags.length, 'flags');
        flags.forEach(flag => {
          this.flags[flag.key] = flag;
        });
        this.emit('sync', this.flags);
      });

      this.socket.on('flag-update', ({ key, flag, isDeleted }) => {
        console.log('Flag update:', key, isDeleted ? '(deleted)' : '');
        if (isDeleted) {
          delete this.flags[key];
        } else {
          this.flags[key] = flag;
        }
        this.emit('flag-updated', key, flag);
      });

      this.socket.on('error', ({ message }) => {
        console.error('Socket error:', message);
        reject(new Error(message));
      });

      this.socket.on('open', () => {
        resolve();
      });

      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  async bool(flagKey, defaultValue = false) {
    const flag = this.flags[flagKey];
    if (!flag) return defaultValue;
    return flag.isEnabled;
  }

  async string(flagKey, defaultValue = '') {
    const flag = this.flags[flagKey];
    if (!flag) return defaultValue;
    return flag.defaultValue;
  }

  async number(flagKey, defaultValue = 0) {
    const flag = this.flags[flagKey];
    if (!flag) return defaultValue;
    return flag.defaultValue;
  }

  async json(flagKey, defaultValue = null) {
    const flag = this.flags[flagKey];
    if (!flag) return defaultValue;
    try {
      return typeof flag.defaultValue === 'string'
        ? JSON.parse(flag.defaultValue)
        : flag.defaultValue;
    } catch {
      return flag.defaultValue;
    }
  }

  getValue(flagKey) {
    return this.flags[flagKey];
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(...args));
    }
  }

  updateUserContext(context) {
    this.userContext = { ...this.userContext, ...context };
    if (this.connected) {
      this.socket.emit('subscribe', {
        envKey: this.envKey,
        userContext: this.userContext
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

export default FlagForgeClient;