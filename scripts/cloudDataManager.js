// scripts/simpleDataManager.js - File-based cross-device sync

class SimpleDataManager {
  constructor() {
    // Internal Dell network shared endpoint
    this.DATA_URL = '/shared/ev-charging-data.json';
    this.BACKUP_URL = '/shared/ev-charging-backup.json';
    this.listeners = [];
    this.pollInterval = null;
    this.lastDataHash = '';
    
    console.log('🏢 Simple Internal DataManager initializing...');
    
    this.initializeData();
    this.startRealTimeSync();
  }

  async initializeData() {
    // Try to load existing data
    const data = await this.loadFromSharedFile();
    if (!data || data.length === 0) {
      console.log('📝 Creating initial data file');
      await this.saveToSharedFile(this.getDefaultSlots());
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
    // Poll shared file every 2 seconds
    this.pollInterval = setInterval(() => {
      this.syncFromSharedFile();
    }, 2000);
    
    // Initial sync
    this.syncFromSharedFile();
  }

  async syncFromSharedFile() {
    try {
      const response = await fetch(this.DATA_URL + '?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        const dataHash = this.hashCode(text);
        
        // Only update if data changed
        if (dataHash !== this.lastDataHash) {
          this.lastDataHash = dataHash;
          
          const data = JSON.parse(text);
          
          // Update local storage
          localStorage.setItem('evChargingSlots', JSON.stringify(data));
          localStorage.setItem('lastSync', new Date().toISOString());
          
          // Notify listeners
          this.notifyListeners();
          
          console.log('🔄 Synced from shared file:', data.length, 'slots');
        }
      }
    } catch (error) {
      console.log('⚠️ Shared file sync failed, using local cache:', error.message);
      // Fallback to localStorage
      const localData = localStorage.getItem('evChargingSlots');
      if (localData && this.listeners.length > 0) {
        this.notifyListeners();
      }
    }
  }

  async saveToSharedFile(slots) {
    try {
      // Try to save to main file
      const saveResult = await this.writeToFile(this.DATA_URL, slots);
      
      // Also save backup
      await this.writeToFile(this.BACKUP_URL, {
        data: slots,
        timestamp: new Date().toISOString(),
        backup: true
      });
      
      // Update local storage
      localStorage.setItem('evChargingSlots', JSON.stringify(slots));
      localStorage.setItem('lastSync', new Date().toISOString());
      
      console.log('💾 Saved to shared file successfully');
      
      // Force sync after save
      setTimeout(() => {
        this.syncFromSharedFile();
      }, 500);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to save to shared file:', error);
      
      // Fallback: save locally and mark for retry
      localStorage.setItem('evChargingSlots', JSON.stringify(slots));
      localStorage.setItem('pendingSync', JSON.stringify(slots));
      
      return false;
    }
  }

  async writeToFile(url, data) {
    // This would typically be handled by a simple PHP script or server endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  }

  async loadFromSharedFile() {
    try {
      const response = await fetch(this.DATA_URL + '?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data.data || [];
      }
    } catch (error) {
      console.log('Could not load from shared file:', error.message);
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
    try {
      const data = localStorage.getItem('evChargingSlots');
      return data ? JSON.parse(data) : [];
    } catch (error) {
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
    console.log(`🎯 BOOKING: Slot ${slotId} for ${userEmail} (shared file)`);
    
    // Get fresh data first
    const slots = await this.loadFromSharedFile() || this.getSlots();
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
          userAgent: navigator.userAgent
        }
      };
      
      this.setCurrentUser({ email: userEmail, phone: userPhone, sessionId: sessionId });
      
      const success = await this.saveToSharedFile(slots);
      
      if (success) {
        console.log(`✅ BOOKING SUCCESS: Slot ${slotId}`);
        return { success: true, sessionId: sessionId };
      } else {
        return { success: false, error: 'Failed to save booking' };
      }
    }
    
    console.log(`❌ BOOKING FAILED: Slot ${slotId} not available`);
    return { success: false, error: 'Slot not available' };
  }

  async releaseSlot(slotId, sessionId = null) {
    console.log(`🔓 RELEASE: Slot ${slotId} (shared file)`);
    
    // Get fresh data first
    const slots = await this.loadFromSharedFile() || this.getSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // Verify session for user releases
      if (sessionId && slots[slotIndex].user && slots[slotIndex].user.sessionId !== sessionId) {
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      
      const success = await this.saveToSharedFile(slots);
      
      if (success) {
        console.log(`✅ RELEASE SUCCESS: Slot ${slotId}`);
        return { success: true };
      } else {
        return { success: false, error: 'Failed to save release' };
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
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
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
    console.log(`📡 Listener added. Total: ${this.listeners.length}`);
    
    setTimeout(() => callback(this.getSlots()), 100);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    const slots = this.getSlots();
    console.log(`🔔 Notifying ${this.listeners.length} listeners`);
    
    this.listeners.forEach(callback => {
      try {
        callback(slots);
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }

  getConnectionStatus() {
    return {
      online: navigator.onLine,
      lastSync: localStorage.getItem('lastSync'),
      hasPendingSync: !!localStorage.getItem('pendingSync'),
      dataUrl: this.DATA_URL
    };
  }

  async forceSyncAllDevices() {
    console.log('🔄 Force syncing all devices...');
    await this.syncFromSharedFile();
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
