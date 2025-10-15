// scripts/app.js - Enhanced user interface with better UX

class UserInterface {
  constructor() {
    this.dataManager = window.dataManager;
    this.selectedSlot = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.render();
    
    // Listen for real-time updates
    this.dataManager.addListener(() => {
      console.log('User interface received update');
      this.render();
    });
    
    // Auto-refresh every 5 seconds
    setInterval(() => {
      this.render();
    }, 5000);
    
    console.log('UserInterface initialized');
  }

  initializeElements() {
    this.availableCount = document.getElementById("availableCount");
    this.totalSlotsText = document.getElementById("totalSlotsText");
    this.slotsGrid = document.getElementById("slotsGrid");
    this.bookingModal = document.getElementById("bookingModal");
    this.bookingForm = document.getElementById("bookingForm");
    this.scanBtn = document.getElementById("scanBtn");
    this.mySlotBtn = document.getElementById("mySlotBtn");
  }

  setupEventListeners() {
    this.scanBtn.addEventListener('click', () => this.showAvailableSlots());
    this.mySlotBtn.addEventListener('click', () => this.showMySlot());
    this.bookingForm.addEventListener('submit', (e) => this.handleBooking(e));
    
    // Close modal when clicking outside
    this.bookingModal.addEventListener('click', (e) => {
      if (e.target === this.bookingModal) {
        this.closeBookingModal();
      }
    });
  }

  render() {
    this.updateAvailabilityBanner();
    this.renderSlots();
    this.updateMySlotButton();
  }

  updateAvailabilityBanner() {
    const slots = this.dataManager.getSlots();
    if (!slots) return;
    
    const available = slots.filter(s => s.status === "available").length;
    const total = slots.length;
    
    this.availableCount.textContent = available;
    this.totalSlotsText.textContent = `${available} of ${total} slots available`;
    
    // Add color coding
    if (available === 0) {
      this.availableCount.style.color = '#ff6b6b';
    } else if (available <= 3) {
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
      if (isMySlot) {
        cardContent += `
          <div class="slot-user-info">
            <strong>Your charging session</strong><br>
            Since: ${new Date(slot.user.startTime).toLocaleTimeString()}
          </div>
          <button class="end-charging-btn" onclick="userInterface.releaseMySlot('${slot.id}')">
            🔌 End Charging
          </button>
        `;
      } else {
        const duration = this.calculateDuration(slot.user.startTime);
        cardContent += `
          <div class="slot-user-info">
            In use for ${duration}<br>
            <small>Contact: ${slot.user.email}</small>
          </div>
        `;
      }
    } else if (slot.status === "available") {
      card.style.cursor = 'pointer';
      card.onclick = () => this.selectSlot(slot.id);
    }
    
    card.innerHTML = cardContent;
    return card;
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60)); // minutes
    
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  }

  showAvailableSlots() {
    const slots = this.dataManager.getSlots();
    const availableSlots = slots.filter(s => s.status === 'available');
    
    if (availableSlots.length === 0) {
      this.showNotification('No slots available at the moment', 'error');
      return;
    }
    
    // Highlight available slots
    document.querySelectorAll('.slot-card.available').forEach(card => {
      card.style.animation = 'pulse 1s ease-in-out 3';
      card.style.borderColor = '#7AB800';
      card.style.borderWidth = '4px';
    });
    
    this.showNotification(`${availableSlots.length} slots available! Click on any green slot to book.`, 'info');
  }

  showMySlot() {
    const currentUser = this.dataManager.getCurrentUser();
    if (!currentUser) {
      this.showNotification('No active charging session found', 'error');
      return;
    }
    
    const slots = this.dataManager.getSlots();
    const mySlot = slots.find(s => 
      s.status === 'occupied' && 
      s.user && 
      s.user.sessionId === currentUser.sessionId
    );
    
    if (mySlot) {
      // Highlight my slot
      document.querySelectorAll('.slot-card').forEach(card => {
        if (card.querySelector('.slot-id').textContent === mySlot.id) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.style.animation = 'pulse 1s ease-in-out 3';
        }
      });
      
      const duration = this.calculateDuration(mySlot.user.startTime);
      this.showNotification(`Your slot: ${mySlot.id} (${duration})`, 'success');
    } else {
      this.showNotification('No active charging session found', 'error');
    }
  }

  selectSlot(slotId) {
    this.selectedSlot = slotId;
    document.getElementById('selectedSlot').textContent = slotId;
    this.bookingModal.classList.remove('hidden');
    
    // Focus on first input
    setTimeout(() => {
      document.getElementById('email').focus();
    }, 300);
  }

  closeBookingModal() {
    this.bookingModal.classList.add('hidden');
    this.bookingForm.reset();
    this.selectedSlot = null;
  }

  handleBooking(e) {
    e.preventDefault();
    
    if (!this.selectedSlot) {
      this.showNotification('Please select a slot first', 'error');
      return;
    }
    
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    
    if (!email || !phone) {
      this.showNotification('Please fill in all fields', 'error');
      return;
    }
    
    const result = this.dataManager.bookSlot(this.selectedSlot, email, phone);
    
    if (result.success) {
      this.showNotification(`Slot ${this.selectedSlot} booked successfully! 🎉`, 'success');
      this.closeBookingModal();
      this.render();
    } else {
      this.showNotification(`Booking failed: ${result.error}`, 'error');
    }
  }

  releaseMySlot(slotId) {
    const currentUser = this.dataManager.getCurrentUser();
    
    if (confirm(`🔌 End charging session for slot ${slotId}?

This will make the slot available for other users.`)) {
      const result = this.dataManager.releaseSlot(slotId, currentUser ? currentUser.sessionId : null);
      
      if (result.success) {
        this.showNotification(`Charging session ended. Slot ${slotId} is now available! 👍`, 'success');
        this.render();
      } else {
        this.showNotification(`Release failed: ${result.error}`, 'error');
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
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
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
  console.log('DOM loaded, initializing UserInterface');
  window.userInterface = new UserInterface();
});
