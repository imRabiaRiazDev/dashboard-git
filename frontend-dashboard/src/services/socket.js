import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    this.socket = io('http://localhost:5000', {
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onCampaignUpdate(callback) {
    if (this.socket) {
      this.socket.on('campaign_update', callback);
    }
  }

  onSyncComplete(callback) {
    if (this.socket) {
      this.socket.on('sync_complete', callback);
    }
  }
}

export default new SocketService();