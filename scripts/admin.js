// scripts/admin.js - Enhanced admin dashboard for GitHub Pages

class AdminDashboard {
  constructor() {
    this.dataManager = window.githubDataManager;
    this.syncInterval = null;
    
    console.log('🔧 GitHub AdminDashboard initializing...');
    
    this.render();
    
    // Listen for real-time updates
    this.dataManager.addListener((slots) => {
      console.log('🔔 Admin received GitHub update:', slots?.length || 0, 'slots');
      this.render();
    });
    
    // Enhanced sync every 8 seconds
    this.syncInterval = setInterval(() => {
      this.dataManager.syncFromGitHub();
    }, 8000);
    
    this.setupConnectionMonitoring();
    
    console.log('✅ GitHub AdminDashboard initialized');
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        this.forceSync();
      }
    });
  }

  updateConnectionStatus() {
    const connectionStatus = document.getElementById('connectionStatus');
    const status = this.dataManager.getConnectionStatus();
    
    if (status.online) {
      connectionStatus.textContent = '🐙 GitHub Online';
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
    
    console.log('📈 Admin updating GitHub stats:', stats);
    
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
        
        // Add animation
        element.style.animation = 'none';
        setTimeout(() => {
          element.style.animation = 'pulse 0.5s ease';
        }, 10);
        
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
            <div class="empty-state-icon">🐙</div>
            <div>Syncing GitHub data...</div>
          </td>
        </tr>
      `;
      return;
    }

    console.log('🏗️ Building GitHub table with', slots.length, 'slots');

    slots.forEach((slot) => {
      const row = this.createSlotRow(slot);
      tbody.appendChild(row);
    });
    
    console.log('✅ GitHub table updated successfully');
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
        <strong style="font-size: 1.2em; color: #0076CE;">${slot.id}</strong>
      </td>
      <td>
        <span class="status-badge status-${slot.status}">
          ${slot.status === 'occupied' ? '🚗 Occupied' : '⚡ Available'}
        </span>
      </td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
        ${userEmail}
        ${slot.user && slot.user.userAgent ? 
          `<br><small style="color: #666;">📱 ${slot.user.userAgent}</small>` : ''
        }
      </td>
      <td>
        ${userPhone}
        ${slot.user && slot.user.deviceId ? 
          `<br><small style="color: #666;">🔧 ${slot.user.deviceId.substring(0, 12)}...</small>` : ''
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

This will immediately end the charging session and sync across all devices via GitHub.`)) {
      try {
        const result = await this.dataManager.releaseSlot(slotId);
        
        if (result.success) {
          this.showNotification(`✅ Slot ${slotId} released and synced via GitHub!`, 'success');
          this.render();
          
          // Force sync
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
        this.showNotification(`✅ Slot ${slotId} reserved for ${email} (synced via GitHub)`, 'success');
        this.render();
        this.forceSync();
      } else {
        this.showNotification(`❌ Reservation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification('❌ Reservation failed. Please try again.', 'error');
    }
  }

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
    this.showNotification('🔄 Syncing GitHub data across all devices...', 'info');
    
    await this.dataManager.forceSyncAllDevices();
    this.render();
    
    setTimeout(() => {
      this.showNotification('✅ All devices synchronized via GitHub!', 'success');
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

This will end all charging sessions and sync via GitHub.`)) {
      try {
        let released = 0;
        
        for (const slot of occupiedSlots) {
          const result = await this.dataManager.releaseSlot(slot.id);
          if (result.success) released++;
        }
        
        this.showNotification(`✅ Released ${released} of ${occupiedSlots.length} slots (GitHub synced)`, 'success');
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
    const status = this.dataManager.getConnectionStatus();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: stats,
      slots: slots,
      occupiedSlots: slots.filter(s => s.status === 'occupied').map(s => ({
        id: s.id,
        user: s.user,
        duration: s.user ? this.calculateDuration(s.user.startTime) : null
      })),
      systemInfo: {
        platform: 'GitHub Pages',
        repository: status.repository,
        lastSync: status.lastSync,
        connectionStatus: status
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
      currentUser: this.dataManager.getCurrentUser(),
      platform: 'GitHub Pages',
      userAgent: navigator.userAgent
    };
    
    console.log('🐛 Debug Information:', debugInfo);
    
    const debugStr = JSON.stringify(debugInfo, null, 2);
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 2rem; border-radius: 15px; max-width: 80vw; max-height: 80vh; overflow: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="color: #0076CE; margin-top: 0;">🐛 GitHub System Debug Information</h3>
        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.8em; border-left: 4px solid #0076CE;">${debugStr}</pre>
        <div style="text-align: center; margin-top: 1.5rem;">
          <button onclick="this.closest('div[style*="fixed"]').remove()" 
                  style="background: linear-gradient(135deg, #0076CE 0%, #005bb5 100%); color: white; border: none; padding: 1rem 2rem; border-radius: 25px; cursor: pointer; font-weight: 600;">
            Close Debug Info
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
  console.log('🚀 GitHub Admin DOM loaded');
  window.adminDashboard = new AdminDashboard();
});

window.addEventListener('beforeunload', () => {
  if (window.adminDashboard) {
    window.adminDashboard.destroy();
  }
});
