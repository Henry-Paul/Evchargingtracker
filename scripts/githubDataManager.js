// scripts/githubDataManager.js - Cross-device sync for GitHub Pages

class GitHubDataManager {
  constructor() {
    // GitHub configuration - THESE ARE CONFIGURED FOR YOUR REPO
    this.GITHUB_USERNAME = 'henry-paul';  // Your GitHub username from the screenshot
    this.GITHUB_REPO = 'Evchargingtracker';    // Your repository name
    this.DATA_FILE = 'data/slots.json';
    
    // URLs for GitHub access
    this.RAW_BASE = `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/main/${this.DATA_FILE}`;
    
    this.listeners = [];
    this.pollInterval = null;
    this.broadcastChannel = null;
    this.lastDataHash = '';
    this.isOnline = navigator.onLine;
    
    console.log('🐙 Dell EV GitHub DataManager initializing...');
    console.log('Repository:', `${this.GITHUB_USERNAME}/${this.GITHUB_REPO}`);
    console.log('Raw URL:', this.RAW_BASE);
    
    this.setupCrossDeviceSync();
    this.setupNetworkMonitoring();
    this.initializeData();
    this.startRealTimeSync();
  }

  setupCrossDeviceSync() {
    // BroadcastChannel for same-origin cross-tab communication
    try {
      this.broadcastChannel = new BroadcastChannel('dell-ev-charging-sync');
      this.broadcastChannel.addEventListener('message', (event) => {
        if (event.data.type === 'slotsUpdated') {
          console.log('📡 Received broadcast update from another tab');
          this.handleBroadcastUpdate(event.data.slots);
        }
      });
      console.log('📡 BroadcastChannel enabled for cross-tab sync');
    } catch (error) {
      console.log('📡 BroadcastChannel not supported, using storage events only');
    }

    // Storage event for cross-tab sync (fallback)
    window.addEventListener('storage', (e) => {
      if (e.key === 'evChargingSlots' && e.newValue) {
        console.log('💾 Storage event detected from another tab');
        try {
          const slots = JSON.parse(e.newValue);
          this.handleStorageUpdate(slots);
        } catch (error) {
          console.error('Error parsing storage update:', error);
        }
      }
    });

    // Visibility change event - sync when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible, force syncing...');
        setTimeout(() => {
          this.forceSyncAllDevices();
        }, 500);
      }
    });
  }

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Back online - syncing with GitHub');
      this.startRealTimeSync();
      this.forceSyncAllDevices();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 Offline mode - using local storage only');
    });
  }

  async initializeData() {
    console.log('🔄 Initializing data...');
    
    // Try to load from GitHub first
    const githubData = await this.loadFromGitHub();
    if (githubData && githubData.length > 0) {
      localStorage.setItem('evChargingSlots', JSON.stringify(githubData));
      localStorage.setItem('dataSource', 'github');
      console.log('📥 Loaded initial data from GitHub:', githubData.length, 'slots');
    } else {
      // Use local cache or defaults
      const localData = this.getLocalSlots();
      if (localData.length === 0) {
        const defaultSlots = this.getDefaultSlots();
        localStorage.setItem('evChargingSlots', JSON.stringify(defaultSlots));
        localStorage.setItem('dataSource', 'default');
        console.log('🔧 Using default slots data:', defaultSlots.length, 'slots');
      } else {
        localStorage.setItem('dataSource', 'cache');
        console.log('💾 Using cached data:', localData.length, 'slots');
      }
    }
    
    // Initial hash calculation
    const currentData = localStorage.getItem('evChargingSlots');
    if (currentData) {
      this.lastDataHash = this.hashCode(currentData);
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
    
    // Poll GitHub every 15 seconds for updates
    this.pollInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncFromGitHub();
      }
      this.checkLocalStorageChanges();
    }, 15000);
    
    // Also check localStorage changes every 2 seconds
    setInterval(() => {
      this.checkLocalStorageChanges();
    }, 2000);
    
    console.log('⏰ Real-time sync started');
  }

  checkLocalStorageChanges() {
    const currentData = localStorage.getItem('evChargingSlots');
    if (currentData) {
      const dataHash = this.hashCode(currentData);
      if (dataHash !== this.lastDataHash) {
        this.lastDataHash = dataHash;
        console.log('💾 Local storage changed, notifying listeners');
        this.notifyListeners();
      }
    }
  }

  async syncFromGitHub() {
    if (!this.isOnline) return;
    
    try {
      console.log('🔄 Syncing from GitHub...');
      const response = await fetch(this.RAW_BASE + '?t=' + Date.now(), {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const dataStr = JSON.stringify(data);
          const dataHash = this.hashCode(dataStr);
          
          // Only update if data changed
          if (dataHash !== this.lastDataHash) {
            this.lastDataHash = dataHash;
            
            // Update local storage
            localStorage.setItem('evChargingSlots', dataStr);
            localStorage.setItem('lastGitHubSync', new Date().toISOString());
            localStorage.setItem('dataSource', 'github');
            
            // Notify listeners
            this.notifyListeners();
            
            console.log('✅ Synced from GitHub:', data.length, 'slots');
          }
        }
      } else if (response.status === 404) {
        console.log('⚠️ GitHub data file not found (404)');
      } else {
        console.log('⚠️ GitHub sync failed with status:', response.status);
      }
    } catch (error) {
      console.log('❌ GitHub sync error:', error.message);
    }
  }

  async loadFromGitHub() {
    try {
      console.log('📥 Loading initial data from GitHub...');
      const response = await fetch(this.RAW_BASE + '?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded data from GitHub successfully');
        return Array.isArray(data) ? data : null;
      } else {
        console.log('⚠️ GitHub initial load failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Could not load from GitHub:', error.message);
    }
    return null;
  }

  saveToLocalStorage(slots) {
    try {
      const slotsStr = JSON.stringify(slots);
      localStorage.setItem('evChargingSlots', slotsStr);
      localStorage.setItem('lastLocalSave', new Date().toISOString());
      
      // Update hash
      this.lastDataHash = this.hashCode(slotsStr);
      
      // Broadcast to other tabs
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'slotsUpdated',
          slots: slots,
          timestamp: Date.now(),
          source: 'localStorage'
        });
        console.log('📡 Broadcast sent to other tabs');
      }
      
      console.log('💾 Saved to localStorage successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save to localStorage:', error);
      return false;
    }
  }

  handleBroadcastUpdate(slots) {
    if (Array.isArray(slots)) {
      const slotsStr = JSON.stringify(slots);
      localStorage.setItem('evChargingSlots', slotsStr);
      this.lastDataHash = this.hashCode(slotsStr);
      this.notifyListeners();
      console.log('📡 Updated from broadcast message');
    }
  }

  handleStorageUpdate(slots) {
    if (Array.isArray(slots)) {
      this.lastDataHash = this.hashCode(JSON.stringify(slots));
      this.notifyListeners();
      console.log('💾 Updated from storage event');
    }
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  // Core data methods
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
    console.log(`🎯 BOOKING ATTEMPT: Slot ${slotId} for ${userEmail}`);
    
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
      
      // Save changes with cross-device sync
      const success = this.saveToLocalStorage(slots);
      
      if (success) {
        // Force immediate notification
        setTimeout(() => {
          this.notifyListeners();
        }, 100);
        
        console.log(`✅ BOOKING SUCCESS: Slot ${slotId} booked for ${userEmail}`);
        return { success: true, sessionId: sessionId };
      } else {
        return { success: false, error: 'Failed to save booking' };
      }
    }
    
    console.log(`❌ BOOKING FAILED: Slot ${slotId} not available`);
    return { success: false, error: 'Slot not available or already booked' };
  }

  async releaseSlot(slotId, sessionId = null) {
    console.log(`🔓 RELEASE ATTEMPT: Slot ${slotId} (sessionId: ${sessionId ? 'provided' : 'admin override'})`);
    
    const slots = this.getSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // Verify session for user releases (admin can skip)
      if (sessionId && slots[slotIndex].user && slots[slotIndex].user.sessionId !== sessionId) {
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      
      const success = this.saveToLocalStorage(slots);
      
      if (success) {
        // Force immediate notification
        setTimeout(() => {
          this.notifyListeners();
        }, 100);
        
        console.log(`✅ RELEASE SUCCESS: Slot ${slotId} is now available`);
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
    return 'Desktop';
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
    console.log(`👂 Listener added. Total listeners: ${this.listeners.length}`);
    
    // Immediately provide current data
    setTimeout(() => {
      const slots = this.getSlots();
      callback(slots);
    }, 100);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    const slots = this.getSlots();
    console.log(`🔔 Notifying ${this.listeners.length} listeners with ${slots.length} slots`);
    
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
      lastSync: localStorage.getItem('lastGitHubSync'),
      lastSave: localStorage.getItem('lastLocalSave'),
      dataSource: localStorage.getItem('dataSource'),
      repository: `${this.GITHUB_USERNAME}/${this.GITHUB_REPO}`,
      dataFile: this.DATA_FILE,
      rawUrl: this.RAW_BASE,
      broadcastSupported: !!this.broadcastChannel,
      listeners: this.listeners.length
    };
  }

  async forceSyncAllDevices() {
    console.log('🔄 Force syncing all devices...');
    
    // Sync from GitHub
    await this.syncFromGitHub();
    
    // Force broadcast update to all tabs
    const slots = this.getSlots();
    if (this.broadcastChannel && slots.length > 0) {
      this.broadcastChannel.postMessage({
        type: 'slotsUpdated',
        slots: slots,
        timestamp: Date.now(),
        forced: true,
        source: 'forceSync'
      });
      console.log('📡 Force broadcast sent');
    }
    
    // Force notify all listeners
    setTimeout(() => {
      this.notifyListeners();
    }, 200);
    
    return true;
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }

  // Debug method
  getDebugInfo() {
    return {
      ...this.getConnectionStatus(),
      slots: this.getSlots(),
      currentUser: this.getCurrentUser(),
      lastDataHash: this.lastDataHash,
      userAgent: navigator.userAgent
    };
  }
}

// Create global instance
if (!window.githubDataManager) {
  window.githubDataManager = new GitHubDataManager();
}

// Backward compatibility
window.dataManager = window.githubDataManager;
window.cloudDataManager = window.githubDataManager;
window.simpleDataManager = window.githubDataManager;

console.log('🚀 GitHub DataManager loaded and ready');
