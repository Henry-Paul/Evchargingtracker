// admin.js - Complete admin dashboard functionality

class AdminDashboard {
  constructor() {
    this.slots = [];
    this.loadData();
    this.startAutoRefresh();
  }

  loadData() {
    // Load from localStorage (shared with main app)
    const savedSlots = localStorage.getItem('evSlots');
    this.slots = savedSlots ? JSON.parse(savedSlots) : this.getDefaultSlots();
    this.updateDashboard();
  }

  getDefaultSlots() {
    return [
      { id: "A1", status: "available" },
      { id: "A2", status: "occupied", user: { email: "john@dell.com", phone: "555-0123", startTime: new Date().toISOString() }},
      { id: "A3", status: "available" },
      { id: "A4", status: "available" },
      { id: "A5", status: "occupied", user: { email: "sarah@dell.com", phone: "555-0456", startTime: new Date().toISOString() }},
      { id: "B1", status: "available" },
      { id: "B2", status: "available" },
      { id: "B3", status: "available" },
      { id: "B4", status: "occupied", user: { email: "mike@dell.com", phone: "555-0789", startTime: new Date().toISOString() }},
      { id: "B5", status: "available" }
    ];
  }

  updateDashboard() {
    this.updateStats();
    this.updateTable();
  }

  updateStats() {
    const available = this.slots.filter(s => s.status === "available").length;
    const occupied = this.slots.filter(s => s.status === "occupied").length;
    const total = this.slots.length;
    const utilization = Math.round((occupied / total) * 100);

    document.getElementById('availableCount').textContent = available;
    document.getElementById('occupiedCount').textContent = occupied;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('utilizationRate').textContent = utilization + '%';
  }

  updateTable() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';

    this.slots.forEach((slot, index) => {
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
            `<button class="action-btn release-btn" onclick="admin.releaseSlot(${index})">Release</button>
             <button class="action-btn contact-btn" onclick="admin.contactUser('${slot.user.email}', '${slot.user.phone}')">Contact</button>` 
            : 
            `<button class="action-btn" onclick="admin.reserveSlot(${index})">Reserve</button>`
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

  releaseSlot(index) {
    if (confirm(`Release slot ${this.slots[index].id}?`)) {
      this.slots[index] = { id: this.slots[index].id, status: "available" };
      this.saveData();
      this.updateDashboard();
      this.showNotification(`Slot ${this.slots[index].id} released successfully!`);
    }
  }

  reserveSlot(index) {
    const email = prompt('Enter email for reservation:');
    const phone = prompt('Enter phone number:');
    
    if (email && phone) {
      this.slots[index] = {
        id: this.slots[index].id,
        status: "occupied",
        user: { email, phone, startTime: new Date().toISOString() }
      };
      this.saveData();
      this.updateDashboard();
      this.showNotification(`Slot ${this.slots[index].id} reserved for ${email}`);
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

  saveData() {
    localStorage.setItem('evSlots', JSON.stringify(this.slots));
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

  startAutoRefresh() {
    setInterval(() => {
      this.loadData(); // Refresh from localStorage every 5 seconds
    }, 5000);
  }
}

// Initialize admin dashboard
const admin = new AdminDashboard();

// Export for global access
window.admin = admin;
