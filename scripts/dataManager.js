// scripts/dataManager.js - Shared data management for real-time sync

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
        this.notifyListeners();
      }
    });
  }

  initializeDefaultData() {
    const defaultSlots = [
      { id: "A1", status: "available" },
      { id: "A2", status: "occupied", 
        user: { email: "john@dell.com", phone: "555-0123", 
               startTime: new Date().toISOString(), 
               sessionId: this.generateSessionId() }},
      { id: "A3", status: "available" },
      { id: "A4", status: "available" },
      { id: "A5", status: "occupied", 
        user: { email: "sarah@dell.com", phone: "555-0456", 
               startTime: new Date().toISOString(),
               sessionId: this.generateSessionId() }},
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
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  saveSlots(slots) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(slots));
    this.notifyListeners();
  }

  getCurrentUser() {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  setCurrentUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  bookSlot(slotId, userEmail, userPhone) {
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
      return { success: true, sessionId: sessionId };
    }
    return { success: false, error: 'Slot not available' };
  }

  releaseSlot(slotId, sessionId = null) {
    const slots = this.getSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // Verify session if provided
      if (sessionId && slots[slotIndex].user.sessionId !== sessionId) {
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      this.saveSlots(slots);
      return { success: true };
    }
    return { success: false, error: 'Slot not occupied' };
  }

  canUserReleaseSlot(slotId) {
    const currentUser = this.getCurrentUser();
    const slots = this.getSlots();
    const slot = slots.find(s => s.id === slotId);
    
    if (!currentUser || !slot || slot.status !== 'occupied') {
      return false;
    }
    
    return slot.user.sessionId === currentUser.sessionId;
  }

  // Real-time update system
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.getSlots()));
  }

  // Trigger manual update (for same-tab updates)
  triggerUpdate() {
    this.notifyListeners();
  }
}

// Global instance
window.dataManager = new DataManager();
