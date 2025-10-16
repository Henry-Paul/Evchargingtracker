// scripts/githubDataManager.js - GitHub-powered cross-device data manager

class GitHubDataManager {
  constructor() {
    // GitHub configuration - REPLACE WITH YOUR DETAILS
    this.GITHUB_USERNAME = 'henry-paul';  // Replace with your GitHub username
    this.GITHUB_REPO = 'Evchargingtracker';   // Replace with your repository name
    this.DATA_FILE = 'data/slots.json';      // Data file path in repo
    this.GITHUB_TOKEN = null; // We'll use public repo without token for read-only
    
    // Base URLs for GitHub API
    this.API_BASE = 'https://api.github.com/repos';
    this.CONTENT_BASE = `${this.API_BASE}/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/contents/${this.DATA_FILE}`;
    this.RAW_BASE = `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.GITHUB_REPO}/main/${this.DATA_FILE}`;
    
    this.listeners = [];
    this.pollInterval = null;
    this.lastDataHash = '';
    this.isOnline = navigator.onLine;
    this.fileSha = null; // GitHub file SHA for updates
    
    console.log('🐙 GitHub DataManager initializing...');
    console.log('Repository:', `${this.GITHUB_USERNAME}/${this.GITHUB_REPO}`);
    
    this.setupNetworkMonitoring();
    this.initializeData();
    this.startRealTimeSync();
  }

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Back online - connecting to GitHub');
      this.startRealTimeSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 Offline mode');
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
    });
  }

  async initializeData() {
    // Try to load from GitHub first
    const githubData = await this.loadFromGitHub();
    if (githubData && githubData.length > 0) {
      localStorage.setItem('evChargingSlots', JSON.stringify(githubData));
      console.log('📥 Loaded initial data from GitHub');
    } else {
      // Use local cache or defaults
      const localData = this.getLocalSlots();
      if (localData.length === 0) {
        const defaultSlots = this.getDefaultSlots();
        localStorage.setItem('evChargingSlots', JSON.stringify(defaultSlots));
        console.log('🔧 Using default slots data');
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
    
    // Poll GitHub every 5 seconds for cross-device sync
    this.pollInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncFromGitHub();
      }
    }, 5000);
    
    // Initial sync
    this.syncFromGitHub();
  }

  async syncFromGitHub() {
    if (!this.isOnline) return;
    
    try {
      // Use raw.githubusercontent.com for faster access (no API limits)
      const response = await fetch(this.RAW_BASE + '?t=' + Date.now(), {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data)) {
          const dataStr = JSON.stringify(data);
          const dataHash = this.hashCode(dataStr);
          
          // Only update if data changed
          if (dataHash !== this.lastDataHash) {
            this.lastDataHash = dataHash;
            
            // Update local storage
            localStorage.setItem('evChargingSlots', dataStr);
            localStorage.setItem('lastGitHubSync', new Date().toISOString());
            
            // Notify listeners
            this.notifyListeners();
            
            console.log('🐙 Synced from GitHub:', data.length, 'slots');
          }
        }
      } else if (response.status === 404) {
        // File doesn't exist yet, initialize with defaults
        console.log('📝 GitHub data file not found, using defaults');
        const defaults = this.getDefaultSlots();
        localStorage.setItem('evChargingSlots', JSON.stringify(defaults));
        this.notifyListeners();
      }
    } catch (error) {
      console.log('⚠️ GitHub sync failed:', error.message);
      
      // If we haven't synced recently, notify with local data
      const lastSync = localStorage.getItem('lastGitHubSync');
      if (this.listeners.length > 0 && (!lastSync || (Date.now() - new Date(lastSync).getTime()) > 60000)) {
        this.notifyListeners();
      }
    }
  }

  async loadFromGitHub() {
    try {
      const response = await fetch(this.RAW_BASE);
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Loaded data from GitHub');
        return Array.isArray(data) ? data : null;
      }
    } catch (error) {
      console.log('Could not load from GitHub:', error.message);
    }
    return null;
  }

  // Note: Saving to GitHub requires authentication and is complex for a demo
  // In a real implementation, you'd need GitHub token and proper API calls
  async saveToGitHub(slots) {
    console.log('💾 Saving to GitHub would require authentication token');
    console.log('📝 For demo purposes, saving locally and simulating cross-device sync');
    
    // Save locally
    localStorage.setItem('evChargingSlots', JSON.stringify(slots));
    localStorage.setItem('lastLocalSave', new Date().toISOString());
    
    // Simulate GitHub save delay
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('✅ Simulated GitHub save completed');
        resolve(true);
      }, 500);
    });
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
    console.log(`🎯 BOOKING: Slot ${slotId} for ${userEmail} (GitHub demo)`);
    
    // Get fresh data first
    await this.syncFromGitHub();
    
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
      
      // Save changes
      const success = await this.saveToGitHub(slots);
      
      if (success) {
        // Force sync to simulate cross-device update
        setTimeout(() => {
          this.notifyListeners();
        }, 1000);
        
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
    console.log(`🔓 RELEASE: Slot ${slotId} (GitHub demo)`);
    
    // Get fresh data first
    await this.syncFromGitHub();
    
    const slots = this.getSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex !== -1 && slots[slotIndex].status === 'occupied') {
      // Verify session for user releases (admin can skip)
      if (sessionId && slots[slotIndex].user && slots[slotIndex].user.sessionId !== sessionId) {
        return { success: false, error: 'Not authorized to release this slot' };
      }
      
      slots[slotIndex] = { id: slotId, status: 'available' };
      
      const success = await this.saveToGitHub(slots);
      
      if (success) {
        // Force sync to simulate cross-device update
        setTimeout(() => {
          this.notifyListeners();
        }, 1000);
        
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
    let deviceId = localStorage.getItem('githubDeviceId');
    if (!deviceId) {
      deviceId = 'gh_device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('githubDeviceId', deviceId);
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
    console.log(`🐙 GitHub listener added. Total: ${this.listeners.length}`);
    
    setTimeout(() => callback(this.getSlots()), 100);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    const slots = this.getSlots();
    console.log(`🔔 Notifying ${this.listeners.length} GitHub listeners`);
    
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
      repository: `${this.GITHUB_USERNAME}/${this.GITHUB_REPO}`,
      dataFile: this.DATA_FILE
    };
  }

  async forceSyncAllDevices() {
    console.log('🔄 Force syncing all GitHub devices...');
    await this.syncFromGitHub();
    
    // Force notify all listeners
    setTimeout(() => {
      this.notifyListeners();
    }, 500);
    
    return true;
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
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
