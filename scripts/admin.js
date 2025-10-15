// scripts/admin.js - Fixed real-time admin dashboard

class AdminDashboard {
  constructor() {
    this.dataManager = window.dataManager;
    
    console.log('AdminDashboard initializing...');
    console.log('DataManager debug info:', this.dataManager.debugInfo());
    
    this.render();
    
    // Listen for real-time updates  
    this.dataManager.addListener((slots) => {
      console.log('Admin received update:', slots);
      this.render();
    });
    
    // Also auto-refresh every 3 seconds
    setInterval(() => {
      console.log('Admin auto-refresh');
      this.render();
    }, 3000);
    
    console.log('AdminDashboard initialized');
  }

  render() {
    this.updateStats();
    this.updateTable();
  }

  updateStats() {
    const slots = this.dataManager.getSlots();
    if (!slots) {
      console.log('No slots data available');
      return;
    }
    
    const available = slots.filter(s => s.status === "available").length;
    const occupied = slots.filter(s => s.status === "occupied").length;
    const total = slots.length;
    const utilization = total > 0 ? Math.round((occupied / total) * 100) : 0;

    // Update DOM elements if they exist
    const availableEl = document.getElementById('availableCount');
    const occupiedEl = document.getElementById('occupiedCount');
    const totalEl = document.getElementById('totalCount');
    const utilizationEl = document.getElementById('utilizationRate');
    
    if (availableEl) availableEl.textContent = available;
    if (occupiedEl) occupiedEl.textContent = occupied;
    if (totalEl) totalEl.textContent = total;
    if (utilizationEl) utilizationEl.textContent = utilization + '%';
    
    console.log(`Stats updated: ${available} available, ${occupied} occupied`);
  }

  updateTable() {
    const slots = this.dataManager.getSlots();
    if (!slots) return;
    
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) {
      console.error('Admin table body not found');
      return;
    }
    
    tbody.innerHTML = '';
    
    console.log('Updating table with slots:', slots);

    slots.forEach((slot, index) => {
      const row = document.createElement('tr');
      row.className = slot.status === 'occupied' ? 'occupied-row' : 'available-row';
      
      const duration = slot.user && slot.user.startTime ? 
        this.calculateDuration(slot.user.startTime) : '-';
      
      const startTime = slot.user && slot.user.startTime ? 
        new Date(slot.user.startTime).toLocaleString() : '-';

      row.innerHTML = `
        <td><strong>${slot.id}</strong></td>
        <td><span class="status-${slot.status}">${slot.status.toUpperCase()}</span></td>
        <td>${slot.user ? slot.user.email : '-'}</td>
        <td>${slot.user ? slot.user.phone : '-'}</td>
        <td>${startTime}</td>
        <td>${duration}</td>
        <td>
          ${slot.status === 'occupied' ? 
            `<button class="action-btn release-btn" onclick="adminDashboard.releaseSlot('${slot.id}')">🔓 Release</button>
             <button class="action-btn contact-btn" onclick="adminDashboard.contactUser('${slot.user ? slot.user.email : ''}', '${slot.user ? slot.user.phone : ''}')">📞 Contact</button>` 
            : 
            `<button class="action-btn" onclick="adminDashboard.reserveSlot('${slot.id}')">📝 Reserve</button>`
          }
        </td>
      `;
      tbody.appendChild(row);
    });
    
    console.log(`Table updated with ${slots.length} slots`);
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60)); // minutes
    
    if (diff < 60) return `${diff} mins`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  }

  releaseSlot(slotId) {
    if (confirm(`🔓 Release slot ${slotId}?

This will end the charging session and make the slot available.`)) {
      const result = this.dataManager.releaseSlot(slotId);
      
      if (result.success) {
        this.showNotification(`Slot ${slotId} released successfully!`, 'success');
        this.render();
      } else {
        this.showNotification(`Release failed: ${result.error}`, 'error');
      }
    }
  }

  reserveSlot(slotId) {
    const email = prompt('📧 Enter email for reservation:');
    if (!email) return;
    
    const phone = prompt('📱 Enter phone number:');
    if (!phone) return;
    
    const result = this.dataManager.bookSlot(slotId, email, phone);
    
    if (result.success) {
      this.showNotification(`Slot ${slotId} reserved for ${email}`, 'success');
      this.render();
    } else {
      this.showNotification(`Reservation failed: ${result.error}`, 'error');
    }
  }

  contactUser(email, phone) {
    if (!email || !phone) {
      this.showNotification('Contact information not available', 'error');
      return;
    }
    
    const message = `📞 Contact Information:

📧 Email: ${email}
📱 Phone: ${phone}

Choose contact method:`;
    const useEmail = confirm(message + '

OK = Send Email | Cancel = Call Phone');
    
    if (useEmail) {
      window.location.href = `mailto:${email}?subject=EV Charging Slot - Dell Facilities`;
    } else {
      window.location.href = `tel:${phone}`;
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; 
      background: ${type === 'success' ? '#7AB800' : type === 'error' ? '#ff6b6b' : '#0076CE'}; 
      color: white; padding: 1rem 1.5rem; border-radius: 6px; 
      box-shadow: 2px 2px 10px rgba(0,0,0,0.3); z-index: 1000;
      font-weight: 600; animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 4000);
  }

  // Debug method
  debugData() {
    console.log('Current slots:', this.dataManager.getSlots());
    console.log('Current user:', this.dataManager.getCurrentUser());
    console.log('Listeners count:', this.dataManager.listeners.length);
  }
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin DOM loaded, initializing AdminDashboard');
  window.adminDashboard = new AdminDashboard();
});

// Add CSS for slideIn animation if not present
if (!document.querySelector('style[data-admin-styles]')) {
  const style = document.createElement('style');
  style.setAttribute('data-admin-styles', 'true');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
