// scripts/app.js - Cross-device user interface

class UserInterface {
  constructor() {
    this.dataManager = window.cloudDataManager;
    this.selectedSlot = null;
    this.refreshInterval = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.setupConnectionMonitoring();
    
    // Initial render
    this.render();
    
    // Listen for real-time updates
    this.dataManager.addListener((slots) => {
      console.log('📱 User interface received update:', slots?.length || 0, 'slots');
      this.render();
    });
    
    // Auto-refresh every 5 seconds for cross-device sync
    this.refreshInterval = setInterval(() => {
      this.dataManager.fetchFromFirebase();
    }, 5000);
    
    console.log('📱 UserInterface initialized for cross-device sync');
  }

  initializeElements() {
    this.connectionStatus = document.getElementById("connectionStatus");
    this.availableCount = document.getElementById("availableCount");
    this.totalSlotsText = document.getElementById("totalSlotsText");
    this.slotsGrid = document.getElementById("slotsGrid");
    this.bookingModal = document.getElementById("bookingModal");
    this.bookingForm = document.getElementById("bookingForm");
    this.scanBtn = document.getElementById("scanBtn");
    this.mySlotBtn = document.getElementById("mySlotBtn");
    this.refreshBtn = document.getElementById("refreshBtn");
  }

  setupEventListeners() {
    this.scanBtn.addEventListener('click', () => this.showAvailableSlots());
    this.mySlotBtn.addEventListener('click', () => this.showMySlot());
    this.refreshBtn.addEventListener('click', () => this.forceRefresh());
    this.bookingForm.addEventListener('submit', (e) => this.handleBooking(e));
    
    // Close modal when clicking outside
    this.bookingModal.addEventListener('click', (e) => {
      if (e.target === this.bookingModal) {
        this.closeBookingModal();
      }
    });
  }

  setupConnectionMonitoring() {
    this.updateConnectionStatus();
    
    window.addEventListener('online', () => {
      this.updateConnectionStatus();
      this.forceRefresh();
    });
    
    window.addEventListener('offline', () => {
      this.updateConnectionStatus();
    });
  }

  updateConnectionStatus() {
    const status = this.dataManager.getConnectionStatus();
    
    if (status.online) {
      this.connectionStatus.textContent = '🌐 Online';
      this.connectionStatus.className = 'connection-status online';
    } else {
      this.connectionStatus.textContent = '📵 Offline';
      this.connectionStatus.className = 'connection-status offline';
    }
  }

  async forceRefresh() {
    this.showNotification('🔄 Refreshing data across all devices...', 'info');
    await this.dataManager.fetchFromFirebase();
    this.render();
    
    // Update UI to show refresh happened
    this.refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      this.refreshBtn.style.transform = 'rotate(0deg)';
    }, 500);
  }

  render() {
    this.updateAvailabilityBanner();
    this.renderSlots();
    this.updateMySlotButton();
    this.updateConnectionStatus();
  }

  updateAvailabilityBanner() {
    const slots = this.dataManager.getSlots();
    if (!slots || slots.length === 0) {
      this.availableCount.textContent = '-';
      this.totalSlotsText.textContent = 'Loading...';
      return;
    }
    
    const stats = this.dataManager.getStats();
    
    this.availableCount.textContent = stats.available;
    this.totalSlotsText.textContent = `${stats.available} of ${stats.total} slots available • Synced across all devices`;
    
    // Color coding based on availability
    if (stats.available === 0) {
      this.availableCount.style.color = '#ff6b6b';
    } else if (stats.available <= 3) {
      this.availableCount.style.color = '#ffa726';
    } else {
      this.availableCount.style.color = '#7AB800';
    }
  }

  renderSlots() {
    const slots = this.dataManager.getSlots();
    if (!slots) return;
    
    this.slotsGrid.innerHTML = "";
    
    slots.forEach(slot => {
      const slotCard = this.createSlotCard(slot);
      this.slotsGrid.appendChild(slotCard);
    });
  }

  createSlotCard(slot) {
    const card = document.createElement("div");
    card.className = `slot-card ${slot.status}`;
    
    const canRelease = this.dataManager.canUserReleaseSlot(slot.id);
    const isMySlot = canRelease;
    
    let cardContent = `
      <div class="slot-id">${slot.id}</div>
      <div class="slot-status ${slot.status}">
        ${slot.status === "available" ? "⚡ Available" : "🚗 Occupied"}
      </div>
    `;
    
    if (slot.status === "occupied" && slot.user) {
      const duration = this.calculateDuration(slot.user.startTime);
      
      if (isMySlot) {
        cardContent += `
          <div class="slot-user-info">
            <strong>🔋 Your charging session</strong><br>
            Duration: ${duration}
          </div>
          <button class="end-charging-btn" onclick="userInterface.releaseMySlot('${slot.id}')">
            🔌 End Charging
          </button>
        `;
      } else {
        // Show limited info about other users
        const maskedEmail = this.maskEmail(slot.user.email);
        cardContent += `
          <div class="slot-user-info">
            <strong>In use by:</strong><br>
            ${maskedEmail}<br>
            <span class="slot-duration">Duration: ${duration}</span>
          </div>
        `;
      }
    } else if (slot.status === "available") {
      cardContent += `
        <div style="color: #666; font-size: 0.9em; margin-top: 0.5rem;">
          Click to book this slot
        </div>
      `;
      card.style.cursor = 'pointer';
      card.onclick = () => this.selectSlot(slot.id);
    }
    
    card.innerHTML = cardContent;
    return card;
  }

  maskEmail(email) {
    if (!email) return 'Unknown user';
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    return `${username.substring(0, 2)}***@${domain}`;
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60)); // minutes
    
    if (diff < 1) return 'Just started';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  }

  showAvailableSlots() {
    const slots = this.dataManager.getSlots();
    const availableSlots = slots.filter(s => s.status === 'available');
    
    if (availableSlots.length === 0) {
      this.showNotification('❌ No slots available. All slots are currently occupied.', 'error');
      return;
    }
    
    // Highlight available slots
    document.querySelectorAll('.slot-card.available').forEach(card => {
      card.style.animation = 'pulse 1s ease-in-out 3';
      card.style.borderColor = '#7AB800';
      card.style.borderWidth = '4px';
    });
    
    this.showNotification(`✅ ${availableSlots.length} slots available! Click any green slot to book.`, 'success');
  }

  showMySlot() {
    const currentUser = this.dataManager.getCurrentUser();
    if (!currentUser) {
      this.showNotification('❌ No active charging session found on this device.', 'error');
      return;
    }
    
    const slots = this.dataManager.getSlots();
    const mySlot = slots.find(s => 
      s.status === 'occupied' && 
      s.user && 
      s.user.sessionId === currentUser.sessionId
    );
    
    if (mySlot) {
      document.querySelectorAll('.slot-card').forEach(card => {
        if (card.querySelector('.slot-id').textContent === mySlot.id) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.animation = 'pulse 1s ease-in-out 3';
        }
      });
      
      const duration = this.calculateDuration(mySlot.user.startTime);
      this.showNotification(`🔋 Your slot: ${mySlot.id} (${duration})`, 'success');
    } else {
      this.showNotification('❌ No active charging session found.', 'error');
    }
  }

  selectSlot(slotId) {
    // Double-check availability before allowing booking
    const slots = this.dataManager.getSlots();
    const slot = slots.find(s => s.id === slotId);
    
    if (!slot || slot.status !== 'available') {
      this.showNotification(`❌ Slot ${slotId} is no longer available. Please refresh and try another slot.`, 'error');
      this.forceRefresh();
      return;
    }
    
    this.selectedSlot = slotId;
    document.getElementById('selectedSlot').textContent = slotId;
    this.bookingModal.classList.remove('hidden');
    
    setTimeout(() => {
      document.getElementById('email').focus();
    }, 300);
  }

  closeBookingModal() {
    this.bookingModal.classList.add('hidden');
    this.bookingForm.reset();
    this.selectedSlot = null;
  }

  async handleBooking(e) {
    e.preventDefault();
    
    if (!this.selectedSlot) {
      this.showNotification('❌ Please select a slot first', 'error');
      return;
    }
    
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    
    if (!email || !phone) {
      this.showNotification('❌ Please fill in all required fields', 'error');
      return;
    }
    
    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      this.showNotification('❌ Please enter a valid email address', 'error');
      return;
    }
    
    const submitBtn = document.getElementById('bookingSubmitBtn');
    submitBtn.textContent = '⏳ Booking...';
    submitBtn.disabled = true;
    
    try {
      const result = await this.dataManager.bookSlot(this.selectedSlot, email, phone);
      
      if (result.success) {
        this.showNotification(`✅ Slot ${this.selectedSlot} booked successfully! Visible on all devices.`, 'success');
        this.closeBookingModal();
        this.render();
        
        // Force refresh to sync across devices
        setTimeout(() => {
          this.forceRefresh();
        }, 1000);
      } else {
        this.showNotification(`❌ Booking failed: ${result.error}`, 'error');
      }
    } catch (error) {
      this.showNotification('❌ Booking failed. Please try again.', 'error');
    } finally {
      submitBtn.textContent = '🚗 Book This Slot';
      submitBtn.disabled = false;
    }
  }

  async releaseMySlot(slotId) {
    const currentUser = this.dataManager.getCurrentUser();
    
    if (!currentUser) {
      this.showNotification('❌ No active session found', 'error');
      return;
    }
    
    if (confirm(`🔌 End charging session for slot ${slotId}?

This will make the slot available for other users across all devices.`)) {
      try {
        const result = await this.dataManager.releaseSlot(slotId, currentUser.sessionId);
        
        if (result.success) {
          this.showNotification(`✅ Charging session ended. Slot ${slotId} is now available on all devices!`, 'success');
          this.render();
          
          // Force sync across devices
          setTimeout(() => {
            this.forceRefresh();
          }, 1000);
        } else {
          this.showNotification(`❌ Release failed: ${result.error}`, 'error');
        }
      } catch (error) {
        this.showNotification('❌ Release failed. Please try again.', 'error');
      }
    }
  }

  updateMySlotButton() {
    const currentUser = this.dataManager.getCurrentUser();
    if (currentUser) {
      const slots = this.dataManager.getSlots();
      const mySlot = slots.find(s => 
        s.status === 'occupied' && 
        s.user && 
        s.user.sessionId === currentUser.sessionId
      );
      
      if (mySlot) {
        this.mySlotBtn.style.display = 'block';
        this.mySlotBtn.innerHTML = `🚗 My Slot: ${mySlot.id}`;
      } else {
        this.mySlotBtn.style.display = 'none';
      }
    } else {
      this.mySlotBtn.style.display = 'none';
    }
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
    }, 5000);
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Helper function to close modal (for onclick handlers)
function closeBookingModal() {
  if (window.userInterface) {
    window.userInterface.closeBookingModal();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM loaded, initializing cross-device UserInterface');
  window.userInterface = new UserInterface();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.userInterface) {
    window.userInterface.destroy();
  }
});
