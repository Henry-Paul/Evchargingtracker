// scripts/app.js - Updated user interface with real-time sync

class UserInterface {
  constructor() {
    this.dataManager = window.dataManager;
    this.selectedSlot = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.render();
    
    // Listen for real-time updates
    this.dataManager.addListener(() => {
      this.render();
    });
    
    // Auto-refresh every 3 seconds
    setInterval(() => {
      this.render();
    }, 3000);
  }

  initializeElements() {
    this.banner = document.getElementById("banner");
    this.grid = document.getElementById("slots-grid");
    this.formContainer = document.getElementById("form-container");
    this.form = document.getElementById("bookingForm");
    this.scanBtn = document.getElementById("scanBtn");
    this.slotSelect = document.getElementById("slotSelect");
  }

  setupEventListeners() {
    this.scanBtn.addEventListener('click', () => this.showSlotSelector());
    this.form.addEventListener('submit', (e) => this.handleBooking(e));
  }

  render() {
    this.updateBanner();
    this.renderSlots();
  }

  updateBanner() {
    const slots = this.dataManager.getSlots();
    const available = slots.filter(s => s.status === "available").length;
    this.banner.innerHTML = `<h2>${available} of ${slots.length} slots available</h2>`;
  }

  renderSlots() {
    const slots = this.dataManager.getSlots();
    this.grid.innerHTML = "";
    
    slots.forEach(slot => {
      const div = document.createElement("div");
      div.className = `slot ${slot.status}`;
      
      // Check if current user can release this slot
      const canRelease = this.dataManager.canUserReleaseSlot(slot.id);
      
      div.innerHTML = `
        <h3>${slot.id}</h3>
        <p>${slot.status === "available" ? "Available" : "Occupied"}</p>
        ${slot.status === "occupied" && slot.user ? 
          `<small>by ${slot.user.email}</small>` : ''}
        ${canRelease ? 
          `<button class="release-btn" onclick="userInterface.releaseMySlot('${slot.id}')">End Charging</button>` : ''}
      `;
      
      if (slot.status === "available") {
        div.onclick = () => this.selectSlot(slot.id);
      }
      
      this.grid.appendChild(div);
    });
  }

  showSlotSelector() {
    const slots = this.dataManager.getSlots();
    const availableSlots = slots.filter(s => s.status === 'available');
    
    if (availableSlots.length === 0) {
      alert('No slots available at the moment');
      return;
    }
    
    // Create slot selector
    let selectorHtml = '<select id="slotSelector"><option value="">Select a slot</option>';
    availableSlots.forEach(slot => {
      selectorHtml += `<option value="${slot.id}">${slot.id}</option>`;
    });
    selectorHtml += '</select>';
    
    const selector = document.createElement('div');
    selector.innerHTML = `
      <h3>Select Slot to Book:</h3>
      ${selectorHtml}
      <button onclick="this.parentElement.remove()">Cancel</button>
    `;
    selector.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 2rem; border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 1000;
    `;
    
    document.body.appendChild(selector);
    
    document.getElementById('slotSelector').addEventListener('change', (e) => {
      if (e.target.value) {
        this.selectSlot(e.target.value);
        selector.remove();
      }
    });
  }

  selectSlot(slotId) {
    this.selectedSlot = slotId;
    this.formContainer.classList.remove("hidden");
    document.getElementById('selectedSlot').textContent = slotId;
  }

  handleBooking(e) {
    e.preventDefault();
    
    if (!this.selectedSlot) {
      alert('Please select a slot first');
      return;
    }
    
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    
    const result = this.dataManager.bookSlot(this.selectedSlot, email, phone);
    
    if (result.success) {
      alert(`Slot ${this.selectedSlot} booked successfully!`);
      this.formContainer.classList.add("hidden");
      this.form.reset();
      this.selectedSlot = null;
      this.render();
    } else {
      alert(`Booking failed: ${result.error}`);
    }
  }

  releaseMySlot(slotId) {
    const currentUser = this.dataManager.getCurrentUser();
    
    if (confirm(`End charging session for slot ${slotId}?`)) {
      const result = this.dataManager.releaseSlot(slotId, currentUser.sessionId);
      
      if (result.success) {
        alert(`Slot ${slotId} is now available!`);
        this.render();
      } else {
        alert(`Release failed: ${result.error}`);
      }
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.userInterface = new UserInterface();
});
