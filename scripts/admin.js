// scripts/admin.js - Enhanced admin dashboard with forced sync

class AdminDashboard {
  constructor() {
    this.dataManager = window.dataManager;
    this.updateInterval = null;
    
    console.log('🔧 AdminDashboard initializing...');
    console.log('DataManager available:', !!this.dataManager);
    console.log('Initial debug info:', this.dataManager.debugInfo());
    
    // Force immediate render
    this.render();
    
    // Listen for real-time updates with enhanced debugging
    this.dataManager.addListener((slots) => {
      console.log('🔔 Admin received slots update:', slots?.length || 0, 'slots');
      if (slots) {
        slots.forEach(slot => {
          if (slot.status === 'occupied') {
            console.log(`  📍 Slot ${slot.id}: ${slot.user?.email || 'unknown user'}`);
          }
        });
      }
      this.render();
    });
    
    // Enhanced auto-refresh every 2 seconds
    this.updateInterval = setInterval(() => {
      console.log('🔄 Admin auto-refresh triggered');
      this.render();
    }, 2000);
    
    console.log('✅ AdminDashboard initialized successfully');
  }

  render() {
    const slots = this.dataManager.getSlots();
    
    if (!slots) {
      console.warn('⚠️ No slots data available for rendering');
      return;
    }
    
    console.log(`🎨 Rendering admin dashboard with ${slots.length} slots`);
    const occupied = slots.filter(s => s.status === 'occupied');
    console.log(`   📊 ${occupied.length} occupied slots:`, occupied.map(s => s.id));
    
    this.updateStats();
    this.updateTable();
  }

  updateStats() {
    const stats = this.dataManager.getStats();
    
    console.log('📈 Updating stats:', stats);
    
    // Update stat cards
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
        
        // Add color coding
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
            <div class="empty-state-icon">❌</div>
            <div>No slot data available</div>
          </td>
        </tr>
      `;
      return;
    }

    console.log('🏗️ Building table with', slots.length, 'slots');

    slots.forEach((slot, index) => {
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
        <td>${userPhone}</td>
        <td style="font-size: 0.9em;">${startTime}</td>
        <td style="font-weight: 600; color: #666;">${duration}</td>
        <td>
          ${slot.status === 'occupied' ? 
            `<button class="action-btn release-btn" onclick="adminDashboard.releaseSlot('${slot.id}', true)">
              🔓 Release
            </button>
            <button class="action-btn contact-btn" onclick="adminDashboard.contactUser('${userEmail}', '${userPhone}')">
              📞 Contact
            </button>` 
            : 
            `<button class="action-btn reserve-btn" onclick="adminDashboard.reserveSlot('${slot.id}')">
              📝 Reserve
            </button>`
          }
        </td>
      `;
      tbody.appendChild(row);
    });
    
    console.log(`✅ Table updated successfully with ${slots.length} rows`);
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60)); // minutes
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  }

  releaseSlot(slotId, isAdminOverride = false) {
    console.log(`🔓 Admin releasing slot ${slotId} (override: ${isAdminOverride})`);
    
    if (confirm(`🔓 Release slot ${slotId}?

${isAdminOverride ? 'Admin override: This will immediately end the charging session.' : 'This will end the charging session.'}`)) {
      // Admin can always release slots (no sessionId required)
      const result = this.dataManager.releaseSlot(slotId);
      
      if (result.success) {
        this.showNotification(`✅ Slot ${slotId} released successfully!`, 'success');
        
        // Force immediate update
        setTimeout(() => {
          this.render();
        }, 100);
      } else {
        this.showNotification(`❌ Release failed: ${result.error}`, 'error');
      }
    }
  }

  reserveSlot(slotId) {
    console.log(`📝 Admin reserving slot ${slotId}`);
    
    const email = prompt('📧 Enter email address for reservation:');
    if (!email) return;
    
    const phone = prompt('📱 Enter phone number:');
    if (!phone) return;
    
    const result = this.dataManager.bookSlot(slotId, email, phone);
    
    if (result.success) {
      this.showNotification(`✅ Slot ${slotId} reserved for ${email}`, 'success');
      
      // Force immediate update
      setTimeout(() => {
        this.render();
      }, 100);
    } else {
      this.showNotification(`❌ Reservation failed: ${result.error}`, 'error');
    }
  }

  contactUser(email, phone) {
    if (!email || !phone || email === '-' || phone === '-') {
      this.showNotification('❌ Contact information not available', 'error');
      return;
    }
    
    const useEmail = confirm(`📞 Contact User

📧 Email: ${email}
📱 Phone: ${phone}

OK = Send Email | Cancel = Call Phone`);
    
    if (useEmail) {
      window.open(`mailto:${email}?subject=EV Charging Slot - Dell Facilities&body=Hello,%0D%0A%0D%0ARegarding your EV charging slot usage...`, '_blank');
    } else {
      window.open(`tel:${phone}`, '_self');
    }
  }

  // Admin control functions
  refreshData() {
    console.log('🔄 Force refreshing admin data');
    this.dataManager.forceSync();
    this.render();
    this.showNotification('🔄 Data refreshed successfully', 'info');
  }

  releaseAllSlots() {
    const slots = this.dataManager.getSlots();
    const occupiedSlots = slots.filter(s => s.status === 'occupied');
    
    if (occupiedSlots.length === 0) {
      this.showNotification('ℹ️ No occupied slots to release', 'info');
      return;
    }
    
    if (confirm(`⚠️ Release ALL ${occupiedSlots.length} occupied slots?

This will end all active charging sessions immediately.`)) {
      let released = 0;
      
      occupiedSlots.forEach(slot => {
        const result = this.dataManager.releaseSlot(slot.id);
        if (result.success) released++;
      });
      
      this.showNotification(`✅ Released ${released} of ${occupiedSlots.length} slots`, 'success');
      this.render();
    }
  }

  exportData() {
    const slots = this.dataManager.getSlots();
    const stats = this.dataManager.getStats();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: stats,
      slots: slots,
      occupiedSlots: slots.filter(s => s.status === 'occupied').map(s => ({
        id: s.id,
        user: s.user,
        duration: s.user ? this.calculateDuration(s.user.startTime) : null
      }))
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `ev-charging-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.showNotification('📊 Data exported successfully', 'success');
  }

  debugData() {
    const debugInfo = this.dataManager.debugInfo();
    console.log('🐛 Debug Information:', debugInfo);
    
    const debugStr = JSON.stringify(debugInfo, null, 2);
    alert(`🐛 Debug Information:

${debugStr}`);
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }

  // Cleanup method
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Admin DOM loaded, initializing AdminDashboard');
  window.adminDashboard = new AdminDashboard();
  
  // Debug helper for console
  window.debugSlots = () => {
    console.log('Current slots:', window.dataManager.getSlots());
    console.log('Debug info:', window.dataManager.debugInfo());
  };
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.adminDashboard) {
    window.adminDashboard.destroy();
  }
});
