// scripts/app.js - Enhanced user interface for GitHub Pages

// Mobile and iOS fixes
if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') || navigator.userAgent.includes('Android')) {
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      console.log('📱 Mobile page restored - forcing refresh');
      window.location.reload();
    }
  });
  
  window.addEventListener('focus', function() {
    if (window.userInterface && window.userInterface.forceRefresh) {
      console.log('📱 Mobile focused - refreshing');
      setTimeout(() => window.userInterface.forceRefresh(), 500);
    }
  });
}

class UserInterface {
  constructor() {
    this.dataManager = window.githubDataManager;
    this.selectedSlot = null;
    this.refreshInterval = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.setupConnectionMonitoring();
    
    // Initial render
    this.render();
    
    // Listen for real-time updates
    this.dataManager.addListener((slots) => {
      console.log('📱 User interface received GitHub update:', slots?.length || 0, 'slots');
      this.render();
    });
    
    // Auto-refresh every 10 seconds
    this.refreshInterval = setInterval(() => {
      this.dataManager.syncFromGitHub();
    }, 10000);
    
    console.log('📱 UserInterface initialized for GitHub Pages');
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

    // Keyboard shortcut for refresh
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        this.forceRefresh();
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
      this.connectionStatus.textContent = '🌐 GitHub Online';
      this.connectionStatus.className = 'connection-status online';
    } else {
      this.connectionStatus.textContent = '📵 Offline';
      this.connectionStatus.className = 'connection-status offline';
    }
  }

  async forceRefresh() {
    this.connectionStatus.textContent = '🔄 Syncing...';
    this.connectionStatus.className = 'connection-status syncing';
    
    this.showNotification('🔄 Syncing with GitHub across all devices...', 'info');
    
    await this.dataManager.forceSyncAllDevices();
    this.render();
    
    // Update UI feedback
    this.refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      this.refreshBtn.style.transform = 'rotate(0deg)';
      this.updateConnectionStatus();
    }, 500);
    
    console.log('🔄 Force refresh completed');
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
    this.totalSlotsText.textContent = `${stats.available} of ${stats.total} slots available • GitHub synced`;
    
    // Color coding
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
    const canRelease = this.dataManager.canUserReleaseSlot(slot.id);
    const isMySlot = canRelease;
    
    card.className = `slot-card ${slot.status}${isMySlot ? ' my-slot' : ''}`;
    
    let cardContent = `
      <div class="slot-id">${slot.id}</div>
      <div class="slot-status ${slot.status}">
        ${slot.status === "available" ? "⚡ Available" : "🚗 Occupied"}
      </div>
    `;
    
    if (slot.status === "occupied" && slot.user) {
      const duration = this.calculateDuration(slot.user.startTime);
      const deviceInfo = slot.user.userAgent || 'Unknown device';
      
      if (isMySlot) {
        cardContent += `
          <div class="slot-user-info">
            <strong>🔋 Your charging session</strong><br>
            Duration: <strong>${duration}</strong><br>
            Device: <em>${deviceInfo}</em>
          </div>
          <button class="end-charging-btn" onclick="userInterface.releaseMySlot('${slot.id}')">
            🔌 End Charging
          </button>
        `;
      } else {
        const maskedEmail = this.maskEmail(slot.user.email);
        cardContent += `
          <div class="slot-user-info">
            <strong>In use by:</strong><br>
            ${maskedEmail}<br>
            <span class="slot-duration">Duration: ${duration}</span><br>
            <small style="color: #999;">Device: ${deviceInfo}</small>
          </div>
        `;
      }
    } else if (slot.status === "available") {
      cardContent += `
        <div style="color: #666; font-size: 0.95em; margin-top: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 8px;">
          💡 Click to book this slot
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
      this.showNotification('❌ No active charging session found.', 'error');
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
    // Double-check availability
    const slots = this.dataManager.getSlots();
    const slot = slots.find(s => s.id === slotId);
    
    if (!slot || slot.status !== 'available') {
      this.showNotification(`❌ Slot ${slotId} is no longer available. Refreshing...`, 'error');
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
    
    if (!email.includes('@')) {
      this.showNotification('❌ Please enter a valid email address', 'error');
      return;
    }
    
    const submitBtn = document.getElementById('bookingSubmitBtn');
    submitBtn.textContent = '⏳ Booking...';
    submitBtn.disabled = true;
    
    try {
      const result = await this.dataManager.bookSlot(this.selectedSlot, email, phone);
      
      if (result.success) {
        this.showNotification(`✅ Slot ${this.selectedSlot} booked successfully! Syncing to all devices...`, 'success');
        this.closeBookingModal();
        this.render();
        
        // Force refresh after booking
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

This will make the slot available for other users and sync across all devices.`)) {
      try {
        const result = await this.dataManager.releaseSlot(slotId, currentUser.sessionId);
        
        if (result.success) {
          this.showNotification(`✅ Charging session ended. Slot ${slotId} is now available on all devices!`, 'success');
          this.render();
          
          // Force sync
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

// Helper function
function closeBookingModal() {
  if (window.userInterface) {
    window.userInterface.closeBookingModal();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM loaded, initializing GitHub UserInterface');
  window.userInterface = new UserInterface();
});

window.addEventListener('beforeunload', () => {
  if (window.userInterface) {
    window.userInterface.destroy();
  }
});
