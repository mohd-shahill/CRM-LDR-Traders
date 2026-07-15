/**
 * WebSocket client helper using Socket.io
 */
let socket = null;

function initSocketConnection() {
  const user = Auth.getCurrentUser();
  if (!user) return;

  // Derive Socket.io base URL from API_BASE
  // API_BASE is e.g. "http://localhost:5000/api"
  const socketUrl = API_BASE.replace('/api', '');

  // Load socket.io script dynamically if not already loaded
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.onload = () => connectSocket(socketUrl, user.id);
    document.head.appendChild(script);
  } else {
    connectSocket(socketUrl, user.id);
  }
}

function connectSocket(url, userId) {
  socket = io(url, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    socket.emit('register', userId);
  });

  socket.on('disconnect', () => {
  });

  // Handle generic state updates from backend
  socket.on('lead_updated', (data) => {
    triggerRealTimeRefresh();
  });

  socket.on('user_updated', (data) => {
    triggerRealTimeRefresh();
  });

  socket.on('audit_logged', (data) => {
    // Refresh audit log cache
    if (typeof Api !== 'undefined' && Api.auditLogs) {
      // Proactively push to local cache so we don't necessarily have to hit DB instantly
      const exists = Api.auditLogs.some(x => x.id === data.id);
      if (!exists) {
        Api.auditLogs.unshift(data);
      }
    }
    triggerRealTimeRefresh();
  });

  socket.on('notification', (data) => {
    // Display custom material alert on client
    if (typeof Utils !== 'undefined' && typeof Utils.showAlert === 'function') {
      Utils.showAlert(data.message, 'info');
    }
    triggerRealTimeRefresh();
  });
}

async function triggerRealTimeRefresh() {
  // Sync the cached state
  if (typeof Api !== 'undefined' && typeof Api.syncAll === 'function') {
    await Api.syncAll();
  }

  // Admin Dashboard Refresh
  if (window.location.pathname.includes('/admin/')) {
    if (typeof loadNotificationsCount === 'function') loadNotificationsCount();
    
    // Refresh sidebar menu (updates live badge counts)
    const currentUser = Auth.getCurrentUser();
    if (currentUser && typeof renderSidebarMenu === 'function') {
      renderSidebarMenu(currentUser);
    }

    if (typeof activeTab !== 'undefined' && activeTab) {
      if (activeTab === "l2" && typeof selectedL2LeadId !== 'undefined' && selectedL2LeadId) {
        // Active in L2 detail view - don't refresh to prevent disturbing user inputs
      } else if (activeTab === "l3" && typeof selectedL3LeadId !== 'undefined' && selectedL3LeadId) {
        // Active in L3 detail view - don't refresh to prevent disturbing user inputs
      } else if (activeTab === "finalized" && typeof selectedFinalizedLeadId !== 'undefined' && selectedFinalizedLeadId) {
        // Active in Finalized detail view - don't refresh table to prevent closing the view
      } else {
        if (typeof loadTabData === 'function') loadTabData(activeTab);
      }
    }
  }

  // Employee Portal Refresh
  if (window.location.pathname.includes('/employee/')) {
    if (typeof loadNotificationsCount === 'function') loadNotificationsCount();
    
    if (typeof activeScreen !== 'undefined' && activeScreen) {
      if (activeScreen === "l1-leads") {
        const queue = document.getElementById("l1-queue");
        if (queue) {
          const currentUser = Auth.getCurrentUser();
          const leads = Api.getLeads().filter(
            (l) => l.status === "assigned" && l.assignedTo === currentUser.id
          );
          queue.innerHTML = "";
          if (leads.length === 0) {
            queue.innerHTML = '<div style="text-align:center; padding:16px; color:var(--text-secondary); font-size:0.85rem; border: 1px dashed var(--border-color); border-radius: 8px;">No assigned leads pending valuation.</div>';
          } else {
            leads.forEach((l) => {
              const card = document.createElement("div");
              card.className = `queue-card ${selectedL1LeadId === l.id ? "selected" : ""}`;
              card.setAttribute("data-id", l.id);
              card.onclick = () => selectL1Lead(l.id);
              card.innerHTML = `
                <div>
                  <strong style="display:block;">${l.make || "Unknown"} ${l.model || ""}</strong>
                  <span style="font-size:0.75rem; font-family:monospace; color:var(--text-secondary);">${l.vehicleNumber}</span>
                </div>
                <span class="premium-badge md-badge-pending">Assigned</span>
              `;
              queue.appendChild(card);
            });
          }
        }
      } else if (activeScreen === "picker" && typeof initPickerQueue === 'function') {
        initPickerQueue();
      } else if (activeScreen === "scrapper" && typeof initScrapQueue === 'function') {
        initScrapQueue();
      }
    }
  }
}

// Auto init when document is ready (if logged in)
document.addEventListener('DOMContentLoaded', () => {
  // Let the dashboard DOMContentLoaded runs first, checkSession completes, then connect
  setTimeout(initSocketConnection, 500);
});
