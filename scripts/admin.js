<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dell EV Admin Dashboard</title>
<style>
/* Enhanced Admin Dashboard - Cross-device compatible */
body { 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  margin: 0;
  min-height: 100vh;
}

.header-container {
  background: linear-gradient(135deg, #0076CE 0%, #005bb5 100%);
  color: white;
  padding: 2rem 1rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.header-container h1 {
  margin: 0;
  font-size: 2.2em;
  font-weight: 300;
}

.header-container .subtitle {
  opacity: 0.9;
  margin-top: 0.5rem;
  font-size: 1.1em;
}

.nav-link {
  color: #7AB800;
  text-decoration: none;
  font-weight: 600;
  margin-top: 1rem;
  display: inline-block;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #6ba600;
}

.connection-status {
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8em;
  z-index: 1000;
}

.connection-status.online {
  background: #7AB800;
  color: white;
}

.connection-status.offline {
  background: #ff6b6b;
  color: white;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border-left: 4px solid #0076CE;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.stat-number {
  font-size: 2.5em;
  font-weight: bold;
  color: #0076CE;
  margin: 0.5rem 0;
}

.stat-label {
  color: #666;
  font-size: 1.1em;
  font-weight: 600;
}

.admin-controls {
  background: white;
  margin: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  text-align: center;
}

.control-button {
  background: #0076CE;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 25px;
  font-size: 1em;
  cursor: pointer;
  margin: 0.5rem;
  transition: all 0.3s ease;
}

.control-button:hover {
  background: #005bb5;
  transform: translateY(-1px);
}

.control-button.danger {
  background: #ff6b6b;
}

.control-button.danger:hover {
  background: #ff5252;
}

.control-button.success {
  background: #7AB800;
}

.control-button.success:hover {
  background: #6ba600;
}

.slots-section {
  margin: 1rem;
}

.section-title {
  text-align: center;
  color: #333;
  font-size: 1.5em;
  margin: 2rem 0 1rem 0;
  font-weight: 300;
}

.admin-table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

.admin-table th {
  background: linear-gradient(135deg, #0076CE 0%, #005bb5 100%);
  color: white;
  padding: 1rem 0.8rem;
  text-align: left;
  font-weight: 600;
}

.admin-table td {
  padding: 1rem 0.8rem;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

.admin-table tr:hover {
  background: #f8f9fa;
}

.occupied-row {
  background: linear-gradient(135deg, #fff 0%, #fff5f5 100%);
  border-left: 4px solid #ff6b6b;
}

.available-row {
  background: linear-gradient(135deg, #fff 0%, #f8fff8 100%);
  border-left: 4px solid #7AB800;
}

.status-badge {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
}

.status-available {
  background: #e8f5e8;
  color: #7AB800;
}

.status-occupied {
  background: #ffebee;
  color: #ff6b6b;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 0.8em;
  font-weight: 600;
  margin: 0.2rem;
  transition: all 0.2s ease;
}

.release-btn {
  background: #ff6b6b;
  color: white;
}

.release-btn:hover {
  background: #ff5252;
  transform: scale(1.05);
}

.contact-btn {
  background: #0076CE;
  color: white;
}

.contact-btn:hover {
  background: #005bb5;
  transform: scale(1.05);
}

.call-btn {
  background: #7AB800;
  color: white;
}

.call-btn:hover {
  background: #6ba600;
  transform: scale(1.05);
}

.reserve-btn {
  background: #ffa726;
  color: white;
}

.reserve-btn:hover {
  background: #ff9800;
  transform: scale(1.05);
}

.notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  z-index: 2000;
  animation: slideDown 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  max-width: 90vw;
  text-align: center;
}

@keyframes slideDown {
  from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

.notification.success { background: #7AB800; }
.notification.error { background: #ff6b6b; }
.notification.info { background: #0076CE; }

.live-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #7AB800;
  border-radius: 50%;
  margin-right: 0.5rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.contact-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.contact-form {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  min-width: 400px;
  max-width: 90vw;
  text-align: center;
}

.contact-form h3 {
  color: #0076CE;
  margin-bottom: 1.5rem;
}

.contact-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.contact-actions button {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 120px;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-state-icon {
  font-size: 3em;
  margin-bottom: 1rem;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .admin-table {
    font-size: 0.8em;
  }
  
  .admin-table th,
  .admin-table td {
    padding: 0.5rem;
  }
  
  .action-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.7em;
  }
  
  .contact-form {
    min-width: 300px;
  }
  
  .contact-actions {
    flex-direction: column;
  }
}
</style>
</head>

<body>
<script src="scripts/cloudDataManager.js"></script>

<div class="connection-status" id="connectionStatus">🌐 Connecting...</div>

<header class="header-container">
  <h1>🔧 Dell EV Charging Admin</h1>
  <p class="subtitle">
    <span class="live-indicator"></span>
    Cross-device admin dashboard • Real-time sync
  </p>
  <a href="index.html" class="nav-link">← Back to User Dashboard</a>
</header>

<section class="stats-container">
  <div class="stat-card">
    <div class="stat-number" id="availableCount">-</div>
    <div class="stat-label">Available Slots</div>
  </div>
  
  <div class="stat-card">
    <div class="stat-number" id="occupiedCount">-</div>
    <div class="stat-label">Occupied Slots</div>
  </div>
  
  <div class="stat-card">
    <div class="stat-number" id="totalCount">-</div>
    <div class="stat-label">Total Slots</div>
  </div>
  
  <div class="stat-card">
    <div class="stat-number" id="utilizationRate">-</div>
    <div class="stat-label">Utilization Rate</div>
  </div>
</section>

<section class="admin-controls">
  <h3 style="margin-top: 0; color: #333;">Admin Quick Actions</h3>
  <button class="control-button" onclick="adminDashboard.forceSync()">
    🔄 Sync All Devices
  </button>
  <button class="control-button success" onclick="adminDashboard.exportUsageData()">
    📊 Export Data
  </button>
  <button class="control-button danger" onclick="adminDashboard.releaseAllSlots()">
    🆓 Release All Slots
  </button>
  <button class="control-button" onclick="adminDashboard.showDebugInfo()">
    🐛 System Info
  </button>
</section>

<section class="slots-section">
  <h2 class="section-title">Cross-Device Slot Management</h2>
  <div class="admin-table-container">
    <table class="admin-table">
      <thead>
        <tr>
          <th>Slot ID</th>
          <th>Status</th>
          <th>User Email</th>
          <th>Phone</th>
          <th>Start Time</th>
          <th>Duration</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="adminTableBody">
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <div>Loading cross-device slot data...</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>

<script src="scripts/admin.js"></script>
</body>
</html>
