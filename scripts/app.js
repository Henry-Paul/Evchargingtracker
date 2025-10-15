const slots = [
  { id: "A1", status: "available" },
  { id: "A2", status: "occupied", user: { email: "john@company.com", phone: "555-0123" }},
  { id: "A3", status: "available" },
  { id: "A4", status: "available" },
  { id: "A5", status: "occupied", user: { email: "sarah@company.com", phone: "555-0456" }},
];

const banner = document.getElementById("banner");
const grid = document.getElementById("slots-grid");
const formContainer = document.getElementById("form-container");
const form = document.getElementById("bookingForm");

function updateBanner() {
  const available = slots.filter(s => s.status === "available").length;
  banner.innerHTML = `<h2>${available} of ${slots.length} slots available</h2>`;
}

function renderSlots() {
  grid.innerHTML = "";
  slots.forEach((slot, i) => {
    const div = document.createElement("div");
    div.className = `slot ${slot.status}`;
    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${slot.status === "available" ? "Available" : "Occupied"}</p>
    `;
    div.onclick = () => scanSlot(slot, i);
    grid.appendChild(div);
  });
}

function scanSlot(slot, i) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (slot.status === "available") {
    formContainer.classList.remove("hidden");
    form.onsubmit = (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const phone = document.getElementById("phone").value;
      localStorage.setItem("user", JSON.stringify({ email, phone }));
      slots[i] = { id: slot.id, status: "occupied", user: { email, phone }};
      formContainer.classList.add("hidden");
      renderSlots();
      updateBanner();
    };
  } else {
    if (user && slot.user.email === user.email) {
      if (confirm(`End charging for ${slot.id}?`)) {
        slots[i] = { id: slot.id, status: "available" };
        renderSlots();
        updateBanner();
      }
    } else {
      alert(`Slot ${slot.id} is currently occupied by:
${slot.user.email}
${slot.user.phone}`);
    }
  }
}

updateBanner();
renderSlots();
setInterval(() => renderSlots(), 3000);
