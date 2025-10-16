// scripts/simpleDataManager.js - Simple file-based cross-device sync for Dell

class SimpleDataManager {
  constructor() {
    // Dell internal server endpoints - CHANGE THESE TO YOUR SERVER
    this.DATA_HANDLER_URL = './file-handler.php';  // Adjust path as needed
    this.listeners = [];
    this.pollInterval = null;
    this.lastDataHash = '';
    this.isOnline = navigator.onLine;
    
    console.log('🏢 Dell Simple DataManager initializing...');
    
    this.setupNetworkMonitoring();
    this.initializeData();
    this.startRealTimeSync();
  }

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Back online - reconnecting to Dell servers');
      this.startRealTimeSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 Offline mode - using local cache');
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
    });
  }

  async initializeData() {
    // Try to load existing data from server
    const serverData = await this.loadFromServer();
    if (serverData && serverData.length > 0) {
      localStorage.setItem('evChargingSlots', JSON.stringify(serverData));
    } else {
      // Use local cache if server data not available
      const localData = this.getLocalSlots();
      if (localData.length === 0) {
        // Initialize with defaults
        const defaultSlots = this.getDefaultSlots();
        localStorage.setItem('evChargingSlots', JSON.stringify(defaultSlots));
        await this.saveToServer(defaultSlots);
      }
    }
  }

  getDefaultSlots() {
    return [
      { id: "A1", status: "available" },
      { id: "A2", status: "available" },
      { id: "A3", status: "available" },
      { id: "A4", status: "available" },
      { id: "A5", status: "available" },
      { id: "B1", status: "available" },
      { id: "B2", status: "available" },
      { id: "B3", status: "available" },
      { id: "B4", status: "available" },
      { id: "B5", status: "available" }
    ];
  }

  startRealTimeSync() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    // Poll server every 3 seconds for cross-device sync
    this.pollInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncFromServer();
      }
    }, 3000);
    
    // Initial sync
    this.syncFromServer();
  }

  async syncFromServer() {
    if (!this.isOnline) return;
    
    try {
      const response = await fetch(this.DATA_HANDLER_URL + '?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Dell-Client': 'EV-Charging'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          const dataStr = JSON.stringify(result.data);
          const dataHash = this.hashCode(dataStr);
          
          // Only update if data changed
          if (dataHash !== this.lastDataHash) {
            this.lastDataHash = dataHash;
            
            // Update local storage
            localStorage.setItem('evChargingSlots', dataStr);
            localStorage.setItem('lastServerSync', result.timestamp);
            
            // Notify listeners of change
            this.notifyListeners();
            
            console.log('🔄 Synced from Dell server:', result.data.length, 'slots');
          }
        }
      } else {
        console.log('⚠️ Server response not OK:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Dell server sync failed, using local cache:', error.message);
      
      // If we have listeners but no recent sync, notify with local data
      const lastSync = localStorage.getItem('lastServerSync');
      if (this.listeners.length > 0 && (!lastSync || (Date.now() - new Date(lastSync).getTime()) > 30000)) {
        this.notifyListeners();
      }
    }
  }

  async saveToServer(slots) {
    if (!this.isOnline) {
      // Save locally and mark for sync when online
      localStorage.setItem('evChargingSlots', JSON.stringify(slots));
      localStorage.setItem('pendingServerSync', JSON.stringify(slots));
      console.log('📵 Offline: saved locally, will sync when online');
      return false;
    }

    try {
      const response = await fetch(this.DATA_HANDLER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dell-Client': 'EV-Charging'
        },
        body: JSON.stringify(slots)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Update local storage
          localStorage.setItem('evChargingSlots', JSON.stringify(slots));
          localStorage.setItem('lastServerSync', result.timestamp);
          
          // Remove pending sync flag
          localStorage.removeItem('pendingServerSync');
          
          console.log('💾 Saved to Dell server successfully');
          
          // Force sync after successful save to notify other devices
          setTimeout(() => {
            this.syncFromServer();
          }, 1000);
          
          return true;
        } else {
          throw new Error(result.error || 'Server save failed');
        }
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to save to Dell server:', error);
      
      // Fallback: save locally and mark for retry
      localStorage.setItem('evChargingSlots', JSON.stringify(slots));
      localStorage.setItem('pendingServerSync', JSON.stringify(slots));
      
      return false;
    }
  }

  async loadFromServer() {
    try {
      const response = await fetch(this.DATA_HANDLER_URL + '?t=' + Date.now(), {
        headers: {
          'X-Dell-Client': 'EV-Charging'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('📡 Loaded data from Dell server');
          return result.data;
        }
      }
    } catch (error) {
      console.log('Could not load from Dell server:', error.message);
    }
    return null;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  getSlots() {
    return this.getLocalSlots();
  }

  getLocalSlots() {
    try {
      const data = localStorage.getItem('evChargingSlots');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting local slots:', error);
      return [];
    }
  }

  getCurrentUser() {
    try {
      const data = localStorage.getItem('currentUser');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  setCurrentUser(user) {
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to set current user:', error);
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async bookSlot(slotId, userEmail, userPhone) {
    console.log(`🎯 BOOKING: Slot ${slotId} for ${userEmail} (Dell server)`);
    
    // Get fresh data from server first
    await this.syncFromServer();
    
    const slots = this.getSlots();
    const sessionId = this.generateSessionId();
    
    const slotIndex = slots.findIndex(s => s.id === slotId);
    if (slotIndex !== -1 && slots[slotIndex].status === 'available') {
      slots[slotIndex] = {
        id: slotId,
        status: 'occupied',
        user: {
          email: userEmail,
          phone: userPhone,
          startTime: new Date().toISOString(),
          sessionId: sessionId,
          deviceId: this.getDeviceId(),
          userAgent: this.getUserAgentInfo(),
          bookingTime: new Date().toISOString()
        }
      };
      
      this.setCurrentUser({ email: userEmail, phone: userPhone, sessionId: sessionId });
      
      const success = await this.saveToServer(slots);
      
      if (success) {
        console.log(`✅ BOOKING SUCCESS: Slot ${slotId} saved to Dell server`);
        return { success: true, sessionId: sessionId };
      } else {
        console.log(`⚠️ BOOKING SAVED LOCALLY: Slot ${slotId} will sync when online`);
        return { success: true, sessionId: sessionId };
      }
    }
    
    console.log(`❌ BOOKING FAILED: Slot ${slotId} not available`);
    return { success: false, error: 'Slot not available or already booked' };
  }

  async releaseSlot(slotId, sessionId = null) {
    console.log(`🔓 RELEASE: Slot ${slotId} (Dell server)`);
    
    // Get fresh data from server first
    await this.syncFromServer();
    
    const slots = this.getSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // Verify session for user releases (admin can skip this)
      if (sessionId && slots[slotIndex].user && slots[slotIndex].user.sessionId !== sessionId) {
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      
      const success = await this.saveToServer(slots);
      
      if (success) {
        console.log(`✅ RELEASE SUCCESS: Slot ${slotId} updated on Dell server`);
        return { success: true };
      } else {
        console.log(`⚠️ RELEASE SAVED LOCALLY: Slot ${slotId} will sync when online`);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Slot not occupied' };
  }

  canUserReleaseSlot(slotId) {
    const currentUser = this.getCurrentUser();
    const slots = this.getSlots();
    const slot = slots?.find(s => s.id === slotId);
    
    return !!(currentUser && slot && slot.status === 'occupied' && 
              slot.user && slot.user.sessionId === currentUser.sessionId);
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('dellDeviceId');
    if (!deviceId) {
      deviceId = 'dell_device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dellDeviceId', deviceId);
    }
    return deviceId;
  }

  getUserAgentInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'Mac';
    return 'Unknown';
  }

  getStats() {
    const slots = this.getSlots();
    const available = slots.filter(s => s.status === 'available').length;
    const occupied = slots.filter(s => s.status === 'occupied').length;
    
    return {
      available,
      occupied,
      total: slots.length,
      utilization: slots.length > 0 ? Math.round((occupied / slots.length) * 100) : 0
    };
  }

  addListener(callback) {
    this.listeners.push(callback);
    console.log(`📡 Dell listener added. Total: ${this.listeners.length}`);
    
    setTimeout(() => callback(this.getSlots()), 100);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    const slots = this.getSlots();
    console.log(`🔔 Notifying ${this.listeners.length} Dell listeners`);
    
    this.listeners.forEach((callback, index) => {
      try {
        callback(slots);
      } catch (error) {
        console.error(`Error in listener ${index}:`, error);
      }
    });
  }

  getConnectionStatus() {
    return {
      online: this.isOnline,
      lastSync: localStorage.getItem('lastServerSync'),
      hasPendingSync: !!localStorage.getItem('pendingServerSync'),
      serverUrl: this.DATA_HANDLER_URL
    };
  }

  async forceSyncAllDevices() {
    console.log('🔄 Force syncing all Dell devices...');
    
    // Sync any pending data first
    const pendingData = localStorage.getItem('pendingServerSync');
    if (pendingData && this.isOnline) {
      try {
        const slots = JSON.parse(pendingData);
        await this.saveToServer(slots);
        localStorage.removeItem('pendingServerSync');
      } catch (error) {
        console.error('Failed to sync pending data:', error);
      }
    }
    
    // Force fresh sync from server
    await this.syncFromServer();
    
    return true;
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

// Create global instance
if (!window.simpleDataManager) {
  window.simpleDataManager = new SimpleDataManager();
}

// Backward compatibility
window.dataManager = window.simpleDataManager;
window.cloudDataManager = window.simpleDataManager;
