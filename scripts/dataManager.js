// scripts/dataManager.js - Enhanced data manager with forced synchronization

class DataManager {
  constructor() {
    this.STORAGE_KEY = 'evChargingSlots';
    this.USER_KEY = 'currentUser';
    this.SYNC_KEY = 'evSlotSync';
    this.listeners = [];
    
    // Initialize with default data if empty
    if (!this.getSlots()) {
      this.initializeDefaultData();
    }
    
    // Multiple sync methods for cross-tab communication
    this.setupSyncMethods();
    
    console.log('DataManager initialized with', this.getSlots().length, 'slots');
  }

  setupSyncMethods() {
    // Method 1: Storage event listener
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY || e.key === this.SYNC_KEY) {
        console.log('Storage event detected, syncing...');
        this.forceSync();
      }
    });

    // Method 2: Custom event for same-tab updates
    window.addEventListener('slotsUpdated', (e) => {
      console.log('Custom event detected, syncing...');
      this.forceSync();
    });

    // Method 3: Periodic sync check (every 2 seconds)
    setInterval(() => {
      this.checkAndSync();
    }, 2000);
  }

  checkAndSync() {
    const currentTimestamp = localStorage.getItem(this.SYNC_KEY);
    if (currentTimestamp !== this.lastSyncTimestamp) {
      console.log('Sync timestamp changed, forcing sync');
      this.lastSyncTimestamp = currentTimestamp;
      this.forceSync();
    }
  }

  forceSync() {
    const slots = this.getSlots();
    if (slots) {
      setTimeout(() => {
        this.notifyListeners();
      }, 100);
    }
  }

  initializeDefaultData() {
    console.log('Initializing default slots...');
    const defaultSlots = [
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
    this.saveSlots(defaultSlots);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getSlots() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error getting slots:', e);
      return null;
    }
  }

  saveSlots(slots) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(slots));
      
      // Set sync timestamp for cross-tab detection
      const timestamp = Date.now().toString();
      localStorage.setItem(this.SYNC_KEY, timestamp);
      this.lastSyncTimestamp = timestamp;
      
      console.log('Slots saved successfully:', slots.length, 'slots');
      
      // Fire multiple events for synchronization
      window.dispatchEvent(new CustomEvent('slotsUpdated', { 
        detail: { slots, timestamp } 
      }));
      
      // Force immediate sync
      setTimeout(() => this.notifyListeners(), 50);
      
    } catch (e) {
      console.error('Error saving slots:', e);
    }
  }

  getCurrentUser() {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error getting current user:', e);
      return null;
    }
  }

  setCurrentUser(user) {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      console.log('Current user set:', user.email);
    } catch (e) {
      console.error('Error setting current user:', e);
    }
  }

  bookSlot(slotId, userEmail, userPhone) {
    console.log(`🎯 BOOKING ATTEMPT: Slot ${slotId} for ${userEmail}`);
    
    const slots = this.getSlots();
    if (!slots) {
      console.error('No slots data available');
      return { success: false, error: 'No slots data available' };
    }
    
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
          sessionId: sessionId
        }
      };
      
      // Set current user session
      this.setCurrentUser({ email: userEmail, phone: userPhone, sessionId: sessionId });
      
      // Save with forced sync
      this.saveSlots(slots);
      
      console.log(`✅ BOOKING SUCCESS: Slot ${slotId} booked for ${userEmail}`);
      return { success: true, sessionId: sessionId };
    }
    
    console.log(`❌ BOOKING FAILED: Slot ${slotId} not available or not found`);
    return { success: false, error: 'Slot not available' };
  }

  releaseSlot(slotId, sessionId = null) {
    console.log(`🔓 RELEASE ATTEMPT: Slot ${slotId} (sessionId: ${sessionId ? 'provided' : 'admin override'})`);
    
    const slots = this.getSlots();
    if (!slots) return { success: false, error: 'No slots data available' };
    
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // For user releases, verify session. For admin releases, skip verification.
      if (sessionId && slots[slotIndex].user && slots[slotIndex].user.sessionId !== sessionId) {
        console.log(`❌ RELEASE FAILED: Session mismatch for slot ${slotId}`);
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      this.saveSlots(slots);
      
      console.log(`✅ RELEASE SUCCESS: Slot ${slotId} is now available`);
      return { success: true };
    }
    
    console.log(`❌ RELEASE FAILED: Slot ${slotId} not occupied or not found`);
    return { success: false, error: 'Slot not occupied' };
  }

  canUserReleaseSlot(slotId) {
    const currentUser = this.getCurrentUser();
    const slots = this.getSlots();
    const slot = slots?.find(s => s.id === slotId);
    
    return !!(currentUser && slot && slot.status === 'occupied' && 
              slot.user && slot.user.sessionId === currentUser.sessionId);
  }

  // Real-time update system
  addListener(callback) {
    this.listeners.push(callback);
    console.log(`Listener added. Total listeners: ${this.listeners.length}`);
    
    // Immediately call with current data
    setTimeout(() => {
      callback(this.getSlots());
    }, 100);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    const slots = this.getSlots();
    console.log(`🔔 NOTIFYING ${this.listeners.length} listeners with ${slots?.length || 0} slots`);
    
    this.listeners.forEach((callback, index) => {
      try {
        callback(slots);
      } catch (e) {
        console.error(`Error in listener ${index}:`, e);
      }
    });
  }

  // Get stats for dashboards
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

  // Debug method
  debugInfo() {
    return {
      slots: this.getSlots(),
      currentUser: this.getCurrentUser(),
      listeners: this.listeners.length,
      syncTimestamp: localStorage.getItem(this.SYNC_KEY)
    };
  }
}

// Create global instance
if (!window.dataManager) {
  console.log('🚀 Creating new DataManager instance');
  window.dataManager = new DataManager();
} else {
  console.log('DataManager already exists');
}
