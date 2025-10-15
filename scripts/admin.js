import { slots } from "./app.js"; // optional modular import if shared logic

const tbody = document.querySelector("#admin-table tbody");

function loadAdminData() {
  tbody.innerHTML = "";
  slots.forEach(s => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.id}</td>
      <td>${s.status}</td>
      <td>${s.user ? s.user.email : '-'}</td>
      <td>${s.user ? s.user.phone : '-'}</td>
    `;
    tbody.appendChild(row);
  });
}

setInterval(loadAdminData, 3000);
