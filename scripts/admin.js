// scripts/admin.js - Cross-device admin dashboard

class AdminDashboard {
  constructor() {
    this.dataManager = window.cloudDataManager;
    this.syncInterval = null;
    
    console.log('🔧 Cross-device AdminDashboard initializing...');
    
    this.render();
    
    // Listen for real-time updates
    this.dataManager.addListener((slots) => {
      console.log('🔔 Admin received cross-device update:', slots?.length || 0, 'slots');
      this.render();
    });
    
    // Enhanced sync every 3 seconds for cross-device updates
    this.syncInterval = setInterval(() => {
      this.dataManager.fetchFromFirebase();
    }, 3000);
    
    this.setupConnectionMonitoring();
    
    console.log('✅ Cross-device AdminDashboard initialized');
  }

  setupConnectionMonitoring() {
    this.updateConnectionStatus();
    
    window.addEventListener('online', () => {
      this.updateConnectionStatus();
      this.forceSync();
    });
    
    window.addEventListener('offline', () => {
      this.updateConnectionStatus();
    });
  }

  updateConnectionStatus() {
    const connectionStatus = document.getElementById('connectionStatus');
    const status = this.dataManager.getConnectionStatus();
    
    if (status.online) {
      connectionStatus.textContent = '🌐 Online';
      connectionStatus.className = 'connection-status online';
    } else {
      connectionStatus.textContent = '📵 Offline';
      connectionStatus.className = 'connection-status offline';
    }
  }

  render() {
    this.updateStats();
    this.updateTable();
    this.updateConnectionStatus();
  }

  updateStats() {
    const stats = this.dataManager.getStats();
    
    console.log('📈 Admin updating cross-device stats:', stats);
    
    const elements = {
      availableCount: document.getElementById('availableCount'),
      occupiedCount: document.getElementById('occupiedCount'),
      totalCount: document.getElementById('totalCount'),
      utilizationRate: document.getElementById('utilizationRate')
    };
    
    Object.entries(elements).forEach(([key, element]) => {
      if (element) {
        const value = key === 'utilizationRate' ? `${stats.utilization}%` : stats[key.replace('Count', '')];
        element.textContent = value;
        
        // Color coding
        if (key === 'occupiedCount') {
          element.style.color = stats.occupied > 0 ? '#ff6b6b' : '#7AB800';
        }
      }
    });
  }

  updateTable() {
    const slots = this.dataManager.getSlots();
    const tbody = document.getElementById('adminTableBody');
    
    if (!tbody) {
      console.error('❌ Admin table body not found');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (!slots || slots.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">📡</div>
            <div>Syncing cross-device data...</div>
          </td>
        </tr>
      `;
      return;
    }

    console.log('🏗️ Building cross-device table with', slots.length, 'slots');

    slots.forEach((slot) => {
      const row = this.createSlotRow(slot);
      tbody.appendChild(row);
    });
    
    console.log('✅ Cross-device table updated successfully');
  }

  createSlotRow(slot) {
    const row = document.createElement('tr');
    row.className = slot.status === 'occupied' ? 'occupied-row' : 'available-row';
    
    const duration = slot.user && slot.user.startTime ? 
      this.calculateDuration(slot.user.startTime) : '-';
    
    const startTime = slot.user && slot.user.startTime ? 
      new Date(slot.user.startTime).toLocaleString() : '-';
    
    const userEmail = slot.user ? slot.user.email : '-';
    const userPhone = slot.user ? slot.user.phone : '-';

    row.innerHTML = `
      <td>
        <strong style="font-size: 1.1em; color: #0076CE;">${slot.id}</strong>
      </td>
      <td>
        <span class="status-badge status-${slot.status}">
          ${slot.status === 'occupied' ? '🚗 Occupied' : '⚡ Available'}
        </span>
      </td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
        ${userEmail}
      </td>
      <td>
        ${userPhone}
        ${slot.user && userPhone !== '-' ? 
          `<br><small style="color: #666;">${this.getDeviceInfo(slot.user)}</small>` : ''
        }
      </td>
      <td style="font-size: 0.9em;">${startTime}</td>
      <td style="font-weight: 600; color: #666;">${duration}</td>
      <td>
        ${slot.status === 'occupied' ? 
          `<button class="action-btn release-btn" onclick="adminDashboard.releaseSlot('${slot.id}')">
            🔓 Release
          </button>
          <button class="action-btn call-btn" onclick="adminDashboard.callUser('${userPhone}')">
            📞 Call
          </button>
          <button class="action-btn contact-btn" onclick="adminDashboard.emailUser('${userEmail}')">
            📧 Email
          </button>` 
          : 
          `<button class="action-btn reserve-btn" onclick="adminDashboard.reserveSlot('${slot.id}')">
            📝 Reserve
          </button>`
        }
      </td>
    `;
    
    return row;
  }

  getDeviceInfo(user) {
    if (user.deviceId) {
      const deviceShort = user.deviceId.substring(0, 8) + '...';
      return `Device: ${deviceShort}`;
    }
    return 'Device info N/A';
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60));
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  }

  async releaseSlot(slotId) {
    if (confirm(`🔓 Release slot ${slotId}?

This will immediately end the charging session and sync across all devices.`)) {
      try {
        const result = await this.dataManager.releaseSlot(slotId);
        
        if (result.success) {
          this.showNotification(`✅ Slot ${slotId} released and synced to all devices!`, 'success');
          this.render();
          
          // Force cross-device sync
          setTimeout(() => {
            this.forceSync();
          }, 1000);
        } else {
          this.showNotification(`❌ Release failed: ${result.error}`, 'error');
        }
      } catch (error) {
        this.showNotification('❌ Release failed. Please try again.', 'error');
      }
    }
  }

  async reserveSlot(slotId) {
    const email = prompt('📧 Enter employee email address:');
    if (!email) return;
    
    const phone = prompt('📱 Enter phone number:');
    if (!phone) return;
    
    try {
      const result = await this.dataManager.bookSlot(slotId, email, phone);
      
      if (result.success) {
        this.showNotification(`✅ Slot ${slotId} reserved for ${email} (synced to all devices)`, 'success');
        this.render();
        this.forceSync();
      } else {
        this.showNotification(`❌ Reservation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification('❌ Reservation failed. Please try again.', 'error');
    }
  }

  // Quick Call Function
  callUser(phone) {
    if (!phone || phone === '-') {
      this.showNotification('❌ Phone number not available', 'error');
      return;
    }
    
    if (confirm(`📞 Call ${phone}?

This will initiate a phone call.`)) {
      window.open(`tel:${phone}`, '_self');
      this.showNotification(`📞 Calling ${phone}...`, 'info');
    }
  }

  // Quick Email Function
  emailUser(email) {
    if (!email || email === '-') {
      this.showNotification('❌ Email address not available', 'error');
      return;
    }
    
    const subject = 'EV Charging Slot - Dell Facilities';
    const body = 'Hello,

Regarding your EV charging slot usage at Dell facilities...

Best regards,
Dell Facilities Team';
    
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    this.showNotification(`📧 Email composer opened for ${email}`, 'info');
  }

  async forceSync() {
    this.showNotification('🔄 Syncing data across all devices...', 'info');
    await this.dataManager.fetchFromFirebase();
    this.render();
    
    setTimeout(() => {
      this.showNotification('✅ All devices synchronized!', 'success');
    }, 1000);
  }

  async releaseAllSlots() {
    const slots = this.dataManager.getSlots();
    const occupiedSlots = slots.filter(s => s.status === 'occupied');
    
    if (occupiedSlots.length === 0) {
      this.showNotification('ℹ️ No occupied slots to release', 'info');
      return;
    }
    
    if (confirm(`⚠️ Release ALL ${occupiedSlots.length} occupied slots?

This will end all charging sessions and sync across all devices.`)) {
      try {
        let released = 0;
        
        for (const slot of occupiedSlots) {
          const result = await this.dataManager.releaseSlot(slot.id);
          if (result.success) released++;
        }
        
        this.showNotification(`✅ Released ${released} of ${occupiedSlots.length} slots (synced to all devices)`, 'success');
        this.render();
        this.forceSync();
      } catch (error) {
        this.showNotification('❌ Failed to release all slots. Please try again.', 'error');
      }
    }
  }

  exportUsageData() {
    const slots = this.dataManager.getSlots();
    const stats = this.dataManager.getStats();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: stats,
      slots: slots,
      occupiedSlots: slots.filter(s => s.status === 'occupied').map(s => ({
        id: s.id,
        user: s.user,
        duration: s.user ? this.calculateDuration(s.user.startTime) : null,
        deviceInfo: s.user ? this.getDeviceInfo(s.user) : null
      })),
      systemInfo: {
        crossDevice: true,
        cloudSync: this.dataManager.getConnectionStatus()
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `dell-ev-usage-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.showNotification('📊 Usage data exported successfully', 'success');
  }

  showDebugInfo() {
    const debugInfo = {
      connection: this.dataManager.getConnectionStatus(),
      slots: this.dataManager.getSlots(),
      stats: this.dataManager.getStats(),
      deviceId: localStorage.getItem('deviceId'),
      currentUser: this.dataManager.getCurrentUser()
    };
    
    console.log('🐛 Debug Information:', debugInfo);
    
    const debugStr = JSON.stringify(debugInfo, null, 2);
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 80vw; max-height: 80vh; overflow: auto;">
        <h3 style="color: #0076CE; margin-top: 0;">🐛 System Debug Information</h3>
        <pre style="background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow: auto; font-size: 0.8em;">${debugStr}</pre>
        <div style="text-align: center; margin-top: 1rem;">
          <button onclick="this.closest('div[style*="fixed"]').remove()" 
                  style="background: #0076CE; color: white; border: none; padding: 1rem 2rem; border-radius: 6px; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideDown 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Cross-device Admin DOM loaded');
  window.adminDashboard = new AdminDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.adminDashboard) {
    window.adminDashboard.destroy();
  }
});

// scripts/admin.js - Updated for Dell internal system

class AdminDashboard {
  constructor() {
    // Change this line to use the simple data manager
    this.dataManager = window.simpleDataManager;  // Changed from cloudDataManager
    
    // ... rest of your existing admin.js code stays exactly the same
  }
  
  // All other methods stay exactly the same
}

// Rest of file remains unchanged...
