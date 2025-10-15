// scripts/dataManager.js - Enhanced shared data management

class DataManager {
  constructor() {
    this.STORAGE_KEY = 'evChargingSlots';
    this.USER_KEY = 'currentUser';
    this.listeners = [];
    
    // Initialize with default data if empty
    if (!this.getSlots()) {
      this.initializeDefaultData();
    }
    
    // Listen for storage changes across tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        console.log('Storage changed, notifying listeners');
        this.notifyListeners();
      }
    });

    // Also listen for custom events for same-tab updates
    window.addEventListener('slotsUpdated', () => {
      console.log('Custom event fired, notifying listeners');
      this.notifyListeners();
    });
  }

  initializeDefaultData() {
    console.log('Initializing default data...');
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
      console.log('Slots saved:', slots);
      
      // Fire custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('slotsUpdated', { detail: slots }));
      
      // Also notify listeners directly
      setTimeout(() => this.notifyListeners(), 100);
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
      console.log('Current user set:', user);
    } catch (e) {
      console.error('Error setting current user:', e);
    }
  }

  bookSlot(slotId, userEmail, userPhone) {
    console.log(`Attempting to book slot ${slotId} for ${userEmail}`);
    
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
          sessionId: sessionId
        }
      };
      
      // Set current user session
      this.setCurrentUser({ email: userEmail, phone: userPhone, sessionId: sessionId });
      
      this.saveSlots(slots);
      console.log(`Slot ${slotId} booked successfully`);
      return { success: true, sessionId: sessionId };
    }
    
    console.log(`Failed to book slot ${slotId}`);
    return { success: false, error: 'Slot not available' };
  }

  releaseSlot(slotId, sessionId = null) {
    console.log(`Attempting to release slot ${slotId}`);
    
    const slots = this.getSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // Verify session if provided (for user releases)
      if (sessionId && slots[slotIndex].user.sessionId !== sessionId) {
        console.log(`Session mismatch for slot ${slotId}`);
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      this.saveSlots(slots);
      console.log(`Slot ${slotId} released successfully`);
      return { success: true };
    }
    
    console.log(`Failed to release slot ${slotId}`);
    return { success: false, error: 'Slot not occupied' };
  }

  canUserReleaseSlot(slotId) {
    const currentUser = this.getCurrentUser();
    const slots = this.getSlots();
    const slot = slots.find(s => s.id === slotId);
    
    if (!currentUser || !slot || slot.status !== 'occupied') {
      return false;
    }
    
    return slot.user && slot.user.sessionId === currentUser.sessionId;
  }

  // Real-time update system
  addListener(callback) {
    this.listeners.push(callback);
    console.log('Listener added, total listeners:', this.listeners.length);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    console.log('Notifying', this.listeners.length, 'listeners');
    this.listeners.forEach(callback => {
      try {
        callback(this.getSlots());
      } catch (e) {
        console.error('Error in listener callback:', e);
      }
    });
  }

  // Debug method
  debugInfo() {
    return {
      slots: this.getSlots(),
      currentUser: this.getCurrentUser(),
      listeners: this.listeners.length
    };
  }
}

// Global instance
if (!window.dataManager) {
  console.log('Creating new DataManager instance');
  window.dataManager = new DataManager();
} else {
  console.log('DataManager already exists');
}
