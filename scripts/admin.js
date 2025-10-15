// scripts/admin.js - Real-time admin dashboard

class AdminDashboard {
  constructor() {
    this.dataManager = window.dataManager;
    
    this.render();
    
    // Listen for real-time updates
    this.dataManager.addListener(() => {
      this.render();
    });
    
    // Auto-refresh every 5 seconds
    setInterval(() => {
      this.render();
    }, 5000);
  }

  render() {
    this.updateStats();
    this.updateTable();
  }

  updateStats() {
    const slots = this.dataManager.getSlots();
    const available = slots.filter(s => s.status === "available").length;
    const occupied = slots.filter(s => s.status === "occupied").length;
    const total = slots.length;
    const utilization = Math.round((occupied / total) * 100);

    document.getElementById('availableCount').textContent = available;
    document.getElementById('occupiedCount').textContent = occupied;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('utilizationRate').textContent = utilization + '%';
  }

  updateTable() {
    const slots = this.dataManager.getSlots();
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';

    slots.forEach((slot, index) => {
      const row = document.createElement('tr');
      row.className = slot.status === 'occupied' ? 'occupied-row' : 'available-row';
      
      const duration = slot.user && slot.user.startTime ? 
        this.calculateDuration(slot.user.startTime) : '-';

      row.innerHTML = `
        <td><strong>${slot.id}</strong></td>
        <td><span class="status-${slot.status}">${slot.status.toUpperCase()}</span></td>
        <td>${slot.user ? slot.user.email : '-'}</td>
        <td>${slot.user ? slot.user.phone : '-'}</td>
        <td>${slot.user ? new Date(slot.user.startTime).toLocaleTimeString() : '-'}</td>
        <td>${duration}</td>
        <td>
          ${slot.status === 'occupied' ? 
            `<button class="action-btn release-btn" onclick="adminDashboard.releaseSlot('${slot.id}')">Release</button>
             <button class="action-btn contact-btn" onclick="adminDashboard.contactUser('${slot.user.email}', '${slot.user.phone}')">Contact</button>` 
            : 
            `<button class="action-btn" onclick="adminDashboard.reserveSlot('${slot.id}')">Reserve</button>`
          }
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60)); // minutes
    
    if (diff < 60) return diff + ' mins';
    return Math.floor(diff / 60) + 'h ' + (diff % 60) + 'm';
  }

  releaseSlot(slotId) {
    if (confirm(`Release slot ${slotId}? This will end the charging session.`)) {
      const result = this.dataManager.releaseSlot(slotId);
      
      if (result.success) {
        this.showNotification(`Slot ${slotId} released successfully!`);
        this.render();
      } else {
        alert(`Release failed: ${result.error}`);
      }
    }
  }

  reserveSlot(slotId) {
    const email = prompt('Enter email for reservation:');
    const phone = prompt('Enter phone number:');
    
    if (email && phone) {
      const result = this.dataManager.bookSlot(slotId, email, phone);
      
      if (result.success) {
        this.showNotification(`Slot ${slotId} reserved for ${email}`);
        this.render();
      } else {
        alert(`Reservation failed: ${result.error}`);
      }
    }
  }

  contactUser(email, phone) {
    const message = `Contact Information:

Email: ${email}
Phone: ${phone}

Would you like to:`;
    const action = confirm(message + '

OK = Send Email
Cancel = Call Phone');
    
    if (action) {
      window.location.href = `mailto:${email}?subject=EV Charging Slot Inquiry`;
    } else {
      window.location.href = `tel:${phone}`;
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; 
      background: #4CAF50; color: white; 
      padding: 1rem; border-radius: 6px; 
      box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
      z-index: 1000;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
});
