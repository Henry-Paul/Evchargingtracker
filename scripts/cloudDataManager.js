// scripts/cloudDataManager.js - Firebase-powered cross-device sync

class CloudDataManager {
  constructor() {
    this.FIREBASE_URL = 'https://dell-ev-charging-default-rtdb.firebaseio.com';
    this.SLOTS_PATH = '/slots';
    this.listeners = [];
    this.isOnline = navigator.onLine;
    
    // Initialize Firebase connection
    this.initializeFirebase();
    
    // Setup network monitoring
    this.setupNetworkMonitoring();
    
    // Initialize with default data if needed
    this.initializeDefaultData();
    
    console.log('🌐 CloudDataManager initialized');
  }

  initializeFirebase() {
    // Setup real-time listeners for Firebase
    this.setupRealtimeListener();
  }

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Back online - syncing data');
      this.syncWithFirebase();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 Offline mode - using local cache');
    });
  }

  setupRealtimeListener() {
    // Simulate Firebase real-time updates with periodic fetching
    setInterval(() => {
      if (this.isOnline) {
        this.fetchFromFirebase();
      }
    }, 3000);
  }

  async fetchFromFirebase() {
    try {
      // Simulate Firebase fetch - in real implementation, use Firebase SDK
      const response = await fetch(`${this.FIREBASE_URL}${this.SLOTS_PATH}.json`);
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          this.updateLocalCache(data);
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.log('📵 Firebase fetch failed, using local cache');
      // Fallback to localStorage
      this.useLocalStorage();
    }
  }

  async saveToFirebase(slots) {
    try {
      if (!this.isOnline) {
        this.saveToLocalStorage(slots);
        return;
      }

      // Simulate Firebase save - in real implementation, use Firebase SDK
      const response = await fetch(`${this.FIREBASE_URL}${this.SLOTS_PATH}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slots)
      });

      if (response.ok) {
        console.log('☁️ Data saved to Firebase successfully');
        this.updateLocalCache(slots);
      } else {
        throw new Error('Firebase save failed');
      }
    } catch (error) {
      console.log('⚠️ Firebase unavailable, saving locally:', error.message);
      this.saveToLocalStorage(slots);
    }
  }

  updateLocalCache(slots) {
    try {
      localStorage.setItem('evChargingSlots', JSON.stringify(slots));
      localStorage.setItem('lastSync', new Date().toISOString());
    } catch (error) {
      console.error('Failed to update local cache:', error);
    }
  }

  saveToLocalStorage(slots) {
    try {
      localStorage.setItem('evChargingSlots', JSON.stringify(slots));
      localStorage.setItem('pendingSync', JSON.stringify(slots));
      console.log('💾 Data saved locally, will sync when online');
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  useLocalStorage() {
    try {
      const data = localStorage.getItem('evChargingSlots');
      if (data) {
        const slots = JSON.parse(data);
        this.notifyListeners();
        return slots;
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  }

  getSlots() {
    try {
      const data = localStorage.getItem('evChargingSlots');
      return data ? JSON.parse(data) : this.getDefaultSlots();
    } catch (error) {
      console.error('Error getting slots:', error);
      return this.getDefaultSlots();
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

  async initializeDefaultData() {
    const slots = this.getSlots();
    if (!slots || slots.length === 0) {
      console.log('🔄 Initializing default slots data');
      await this.saveToFirebase(this.getDefaultSlots());
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

  async bookSlot(slotId, userEmail, userPhone) {
    console.log(`🎯 BOOKING: Slot ${slotId} for ${userEmail}`);
    
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
          deviceId: this.getDeviceId()
        }
      };
      
      this.setCurrentUser({ email: userEmail, phone: userPhone, sessionId: sessionId });
      
      await this.saveToFirebase(slots);
      
      console.log(`✅ BOOKING SUCCESS: Slot ${slotId}`);
      return { success: true, sessionId: sessionId };
    }
    
    console.log(`❌ BOOKING FAILED: Slot ${slotId} not available`);
    return { success: false, error: 'Slot not available or already booked' };
  }

  async releaseSlot(slotId, sessionId = null) {
    console.log(`🔓 RELEASE: Slot ${slotId}`);
    
    const slots = this.getSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // User release: verify session, Admin release: no verification needed
      if (sessionId && slots[slotIndex].user && slots[slotIndex].user.sessionId !== sessionId) {
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      await this.saveToFirebase(slots);
      
      console.log(`✅ RELEASE SUCCESS: Slot ${slotId}`);
      return { success: true };
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
    const slots = this.getSlots() || [];
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
    console.log(`Listener added. Total: ${this.listeners.length}`);
    
    // Immediately call with current data
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

  async syncWithFirebase() {
    if (this.isOnline) {
      const pendingData = localStorage.getItem('pendingSync');
      if (pendingData) {
        try {
          const slots = JSON.parse(pendingData);
          await this.saveToFirebase(slots);
          localStorage.removeItem('pendingSync');
          console.log('📡 Pending data synced to Firebase');
        } catch (error) {
          console.error('Failed to sync pending data:', error);
        }
      }
    }
  }

  getConnectionStatus() {
    return {
      online: this.isOnline,
      lastSync: localStorage.getItem('lastSync'),
      hasPendingSync: !!localStorage.getItem('pendingSync')
    };
  }
}

// Create global instance
if (!window.cloudDataManager) {
  window.cloudDataManager = new CloudDataManager();
}

// Backward compatibility
window.dataManager = window.cloudDataManager;
