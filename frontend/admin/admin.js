/**
 * Admin Dashboard — Revamped Interactivity
 * Supports: Overview, L1, L2, L3, L4, Users, Audit panels
 */

let activeTab = "";
let selectedL2LeadId = null;
let selectedL3LeadId = null;
let selectedFinalizedLeadId = null;
let l1ActiveFilter = "all";
let pagesState = {
  l1: 1,
  l2: 1,
  l3: 1,
  l4: 1,
  finalized: 1,
  users: 1,
  audit: 1,
};
let highlightedL4LeadId = null;

// ──────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const user = await Auth.checkSession();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await Api.syncAll();

  const hasAccess =
    Auth.hasPermission("l2") ||
    Auth.hasPermission("l3") ||
    Auth.hasPermission("super_admin") ||
    user.is_super_admin;
  if (!hasAccess) {
    alert("Access Denied: Administrative rights required.");
    Auth.logout();
    return;
  }

  // Sidebar user info
  document.getElementById("user-display-name").innerText = user.name;
  document.getElementById("user-display-role").innerText = user.is_super_admin
    ? "All permissions"
    : getRoleDescription(user);
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "AD";
  document.getElementById("sidebar-avatar-initials").innerText = initials;

  Utils.initTheme();
  renderSidebarMenu(user);
  loadNotificationsCount();


  window.addEventListener('hashchange', () => {
    const tabId = window.location.hash.substring(1) || 'overview';
    if (tabId !== activeTab) {
      switchTab(tabId, false);
    }
  });

  const initialTab = window.location.hash.substring(1) || 'overview';
  if (!window.location.hash) {
    window.location.replace('#' + initialTab);
  }
  switchTab(initialTab, false);

  // Polling disabled: replaced by real-time event-driven updates in socket-client.js
});

function getRoleDescription(user) {
  if (user.is_super_admin) return "All permissions";
  if (user.permissions.includes("l2") && user.permissions.includes("l3"))
    return "Manager & Finance";
  if (user.permissions.includes("l2")) return "L2 Purchase Manager";
  if (user.permissions.includes("l3")) return "L3 Payment Team";
  return "Admin Staff";
}

// ──────────────────────────────────────────────
// SIDEBAR MENU
// ──────────────────────────────────────────────
const NAV_ICONS = {
  overview:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  l1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>',
  l2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  l3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  l4: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  users:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  audit:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  finalized:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="m9 10 2 2 4-4"/></svg>',
};

function renderSidebarMenu(user) {
  const nav = document.getElementById("nav-list-menu");
  nav.innerHTML = "";

  const hasL2 = user.permissions.includes("l2") || user.is_super_admin;
  const hasL3 = user.permissions.includes("l3") || user.is_super_admin;
  const isSuper = user.is_super_admin;

  // Compute live badge counts
  const leads = Api.getLeads();
  const newAndAssigned = leads.filter(
    (l) => l.status === "new" || l.status === "assigned",
  ).length;
  const pendingApproval = leads.filter(
    (l) => l.status === "pending_approval",
  ).length;
  const paymentsDue = leads.filter(
    (l) => l.status === "approved" || l.status === "payment_initiated",
  ).length;

  // OVERVIEW section
  addNavLabel(nav, "Overview");
  addNavItem(nav, "overview", "Overview", NAV_ICONS.overview);

  // DASHBOARDS section
  addNavLabel(nav, "Dashboards");
  addNavItem(
    nav,
    "l1",
    "L1 — Leads",
    NAV_ICONS.l1,
    newAndAssigned > 0 ? { count: newAndAssigned, color: "" } : null,
  );
  if (hasL2)
    addNavItem(
      nav,
      "l2",
      "L2 — Approvals",
      NAV_ICONS.l2,
      pendingApproval > 0 ? { count: pendingApproval, color: "amber" } : null,
    );
  if (hasL3)
    addNavItem(
      nav,
      "l3",
      "L3 — Payments",
      NAV_ICONS.l3,
      paymentsDue > 0 ? { count: paymentsDue, color: "blue" } : null,
    );
  if (isSuper) addNavItem(nav, "l4", "L4 — Picker", NAV_ICONS.l4);

  // CARS section
  if (hasL2 || hasL3 || isSuper) {
    addNavLabel(nav, "Cars");
    addNavItem(nav, "finalized", "Finalized Cars", NAV_ICONS.finalized);
  }

  // ADMIN section
  if (isSuper) {
    addNavLabel(nav, "Admin");
    addNavItem(nav, "users", "Users", NAV_ICONS.users);
    addNavItem(nav, "audit", "Audit Log", NAV_ICONS.audit);
  }
}

function addNavLabel(container, text) {
  const label = document.createElement("div");
  label.className = "nav-label";
  label.textContent = text;
  container.appendChild(label);
}

function addNavItem(container, id, label, iconSvg, badge) {
  const item = document.createElement("div");
  item.className = "nav-item";
  item.id = `nav-${id}`;
  item.onclick = () => switchTab(id);

  let badgeHtml = "";
  if (badge) {
    badgeHtml = `<span class="nav-badge${badge.color ? " " + badge.color : ""}">${badge.count}</span>`;
  }

  item.innerHTML = `${iconSvg} <span>${label}</span>${badgeHtml}`;
  container.appendChild(item);
}

// ──────────────────────────────────────────────
// TAB SWITCHING
// ──────────────────────────────────────────────
const TAB_TITLES = {
  overview: "Overview",
  l1: "L1 — Agent Leads",
  l2: "L2 — Purchase Approvals",
  l3: "L3 — Payments",
  l4: "L4 — Picker & Scrapper",
  finalized: "Finalized Cars",
  users: "User Management",
  audit: "Audit Log",
};

function switchTab(tabId, updateHash = true) {
  activeTab = tabId;
  selectedL2LeadId = null;
  selectedL3LeadId = null;
  selectedFinalizedLeadId = null;

  // Reset pagination page for this tab
  if (pagesState[tabId]) {
    pagesState[tabId] = 1;
  }

  // Active nav highlight
  document
    .querySelectorAll(".nav-item")
    .forEach((item) => item.classList.remove("active"));
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) activeNav.classList.add("active");

  // Update page title
  document.getElementById("page-title").textContent =
    TAB_TITLES[tabId] || tabId;

  // Toggle panels
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  const panel = document.getElementById(`panel-${tabId}`);
  if (panel) {
    panel.classList.add("active");
    loadTabData(tabId);
  }

  if (updateHash) {
    window.location.hash = tabId;
  }
}

function loadTabData(tabId) {
  switch (tabId) {
    case "overview":
      loadOverview();
      break;
    case "l1":
      loadL1Panel();
      break;
    case "l2":
      showL2TableView();
      loadL2Panel();
      break;
    case "l3":
      showL3TableView();
      loadL3Panel();
      break;
    case "l4":
      loadL4Panel();
      break;
    case "finalized":
      showFinalizedTableView();
      loadFinalizedPanel();
      break;
    case "users":
      loadUsersPanel();
      break;
    case "audit":
      loadAuditPanel();
      break;
  }
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function formatStatus(status) {
  const map = {
    new: "New",
    assigned: "Assigned",
    pending_approval: "Pending",
    approved: "Approved",
    payment_initiated: "Payment initiated",
    payment_confirmed: "Paid",
    picked_up: "Picked Up",
    rejected: "Rejected",
    info_needed: "Info needed",
    scrapped: "Scrapped",
  };
  return map[status] || status;
}

function getAgentName(userId) {
  if (!userId) return "—";
  const u = Api.getUsers().find((u) => u.id === userId);
  return u ? u.name : "—";
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function renderPagination(
  containerId,
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (totalItems <= pageSize) {
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Left side: text
  const textEl = document.createElement("div");
  textEl.className = "pagination-text";
  textEl.innerHTML = `Showing <strong>${startIdx}</strong> to <strong>${endIdx}</strong> of <strong>${totalItems}</strong> entries`;

  // Right side: buttons
  const btnsEl = document.createElement("div");
  btnsEl.className = "pagination-btns";

  // Prev Button
  const prevBtn = document.createElement("button");
  prevBtn.className = "pagination-btn";
  prevBtn.innerText = "Prev";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => onPageChange(currentPage - 1);
  btnsEl.appendChild(prevBtn);

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `pagination-btn${i === currentPage ? " active" : ""}`;
    pageBtn.innerText = i;
    pageBtn.onclick = () => onPageChange(i);
    btnsEl.appendChild(pageBtn);
  }

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.className = "pagination-btn";
  nextBtn.innerText = "Next";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => onPageChange(currentPage + 1);
  btnsEl.appendChild(nextBtn);

  container.appendChild(textEl);
  container.appendChild(btnsEl);
}

// ──────────────────────────────────────────────
// OVERVIEW PANEL
// ──────────────────────────────────────────────
function loadOverview() {
  const leads = Api.getLeads();
  const total = leads.length;
  const pending = leads.filter((l) => l.status === "pending_approval").length;
  const paymentsDue = leads.filter((l) => l.status === "approved").length;
  const scrapped = leads.filter((l) => l.status === "scrapped").length;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const thisMonthLeads = leads.filter(l => {
    if (!l.createdAt) return false;
    const d = new Date(l.createdAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).length;

  document.getElementById("ov-total").textContent = total;
  document.getElementById("ov-total-sub").textContent =
    `+${thisMonthLeads} this month`;
  document.getElementById("ov-pending").textContent = pending;
  document.getElementById("ov-payments").textContent = paymentsDue;
  document.getElementById("ov-scrapped").textContent = scrapped;
  document.getElementById("ov-scrapped-sub").textContent =
    scrapped > 0 ? `+${scrapped} this month` : "—";

  // Recent leads table
  const tbody = document.getElementById("ov-table-body");
  tbody.innerHTML = "";

  const sorted = [...leads].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  sorted.slice(0, 8).forEach((lead) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:monospace; font-size:12px; color:var(--text-secondary);">#${lead.id.split("-")[1]}</td>
      <td>${lead.ownerName}</td>
      <td>${lead.make || ""} ${lead.model} ${lead.year || ""}</td>
      <td>Seller</td>
      <td><span class="status-badge ${lead.status}">${formatStatus(lead.status)}</span></td>
      <td>${getAgentName(lead.assignedTo)}</td>
      <td><button class="action-btn" onclick="viewLeadFromOverview('${lead.id}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function viewLeadFromOverview(leadId) {
  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  if (lead.status === "pending_approval") {
    switchTab("l2");
    setTimeout(() => reviewL2Lead(leadId), 100);
  } else if (lead.status === "payment_confirmed") {
    highlightedL4LeadId = leadId;
    switchTab("l4");
  } else if (
    lead.status === "approved" ||
    lead.status === "payment_initiated"
  ) {
    switchTab("l3");
    setTimeout(() => reviewL3Lead(leadId), 100);
  } else if (
    lead.status === "picker_assigned" ||
    lead.status === "picked" ||
    lead.status === "scrapped"
  ) {
    switchTab("finalized");
    setTimeout(() => viewFinalizedLead(leadId), 100);
  } else {
    openLeadDetailModal(leadId);
  }
}

// ──────────────────────────────────────────────
// L1 — LEADS PANEL
// ──────────────────────────────────────────────
function loadL1Panel() {
  const leads = Api.getLeads();

  // Metrics
  document.getElementById("l1-new-count").textContent = leads.filter(
    (l) => l.status === "new",
  ).length;
  document.getElementById("l1-assigned-count").textContent = leads.filter(
    (l) => l.status === "assigned",
  ).length;
  document.getElementById("l1-submitted-count").textContent = leads.filter(
    (l) => l.status === "pending_approval",
  ).length;
  document.getElementById("l1-rejected-count").textContent = leads.filter(
    (l) => l.status === "rejected" || l.status === "info_needed",
  ).length;

  renderL1Table(l1ActiveFilter);
}

function filterL1(filter, el) {
  l1ActiveFilter = filter;
  pagesState.l1 = 1;
  document
    .querySelectorAll("#l1-filters .chip")
    .forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
  renderL1Table(filter);
}

function renderL1Table(filter) {
  const leads = Api.getLeads();
  let filtered = leads;
  if (filter !== "all") {
    filtered = leads.filter((l) => l.status === filter);
  }

  const tbody = document.getElementById("l1-table-body");
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">No leads found.</td></tr>';
    document.getElementById("pagination-l1").style.display = "none";
    return;
  }

  // Pagination logic
  const pageSize = 10;
  const currentPage = pagesState.l1 || 1;
  const totalItems = filtered.length;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);

  paginated.forEach((lead) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:monospace; font-size:12px; color:var(--text-secondary);">#${lead.id.split("-")[1]}</td>
      <td>${lead.ownerName}</td>
      <td>${lead.make || ""} ${lead.model} ${lead.year || ""}</td>
      <td>${Utils.formatCurrency(lead.expectedPrice)}</td>
      <td><span class="status-badge ${lead.status}">${formatStatus(lead.status)}</span></td>
      <td>${getAgentName(lead.assignedTo)}</td>
      <td><button class="action-btn" onclick="viewLeadFromOverview('${lead.id}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(
    "pagination-l1",
    totalItems,
    pageSize,
    currentPage,
    (newPage) => {
      pagesState.l1 = newPage;
      renderL1Table(filter);
    },
  );
}

// ── Lead Detail Modal (New/Assigned/Rejected/Info Needed) ──
let currentViewingLeadId = null;

function openLeadDetailModal(leadId) {
  currentViewingLeadId = leadId;
  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  document.getElementById("lead-detail-id").innerText =
    `#${lead.id.split("-")[1]}`;

  const statusBadge = document.getElementById("lead-detail-status");
  statusBadge.className = `status-badge ${lead.status}`;
  statusBadge.innerText = formatStatus(lead.status);

  document.getElementById("lead-detail-owner").innerText =
    lead.ownerName || "—";
  document.getElementById("lead-detail-phone").innerText = lead.phone || "—";
  document.getElementById("lead-detail-altphone").innerText =
    lead.altPhone || "—";
  document.getElementById("lead-detail-address").innerText =
    lead.address || "—";

  document.getElementById("lead-detail-reg").innerText =
    lead.vehicleNumber || "—";
  document.getElementById("lead-detail-vehicle").innerText =
    `${lead.make || ""} ${lead.model}`;
  document.getElementById("lead-detail-year-fuel").innerText =
    `${lead.year || "—"} | ${lead.fuelType || "—"}`;
  document.getElementById("lead-detail-kms").innerText = lead.kmsDriven
    ? lead.kmsDriven.toLocaleString("en-IN")
    : "—";
  document.getElementById("lead-detail-expected").innerText =
    Utils.formatCurrency(lead.expectedPrice);
  document.getElementById("lead-detail-exchange").innerText = lead.wantsNewCar
    ? "Yes"
    : "No";

  // Body condition
  const rating = lead.bodyCondition;
  const ratingBadge = document.getElementById("lead-detail-rating-badge");
  const ratingText = document.getElementById("lead-detail-rating-text");
  if (ratingBadge && ratingText) {
    if (rating !== undefined && rating !== null) {
      ratingBadge.innerText = `${rating}/10`;
      ratingBadge.style.display = "inline-block";
      if (rating >= 8) ratingText.innerText = "Excellent";
      else if (rating >= 6) ratingText.innerText = "Good";
      else if (rating >= 4) ratingText.innerText = "Average";
      else ratingText.innerText = "Poor";
    } else {
      ratingBadge.innerText = "—";
      ratingText.innerText = "Not Rated";
    }
  }

  // Accessories present
  const optionsContainer = document.getElementById("lead-detail-options");
  if (optionsContainer) {
    optionsContainer.innerHTML = "";
    const options = lead.optionsPresent || [];
    if (options.length === 0) {
      optionsContainer.innerHTML =
        '<span style="color:var(--text-secondary); font-size:0.8rem;">No accessories listed.</span>';
    } else {
      options.forEach((opt) => {
        const badge = document.createElement("span");
        badge.style.cssText =
          "background:rgba(14, 165, 233, 0.1); color:var(--primary-color); border:1px solid rgba(14, 165, 233, 0.2); font-size:0.75rem; font-weight:600; padding:4px 8px; border-radius:4px; margin-right: 4px; margin-bottom: 4px; display: inline-block;";
        badge.innerText = opt;
        optionsContainer.appendChild(badge);
      });
    }
  }

  // Hide assignment section if status is post-valuation (already approved/paid/picked/scrapped)
  const assignmentSection = document.getElementById("lead-detail-assignment-section");
  if (assignmentSection) {
    const isPostValuation = ["approved", "payment_initiated", "payment_confirmed", "picked_up", "scrapped"].includes(lead.status);
    assignmentSection.style.display = isPostValuation ? "none" : "block";
  }

  // Initialize L1 Coordinator Autocomplete
  initL1CoordinatorAutocomplete(lead);

  // Assign Button text change depending on status
  const assignBtn = document.getElementById("lead-detail-assign-btn");
  if (lead.assignedTo) {
    assignBtn.innerText = "Re-assign";
  } else {
    assignBtn.innerText = "Assign";
  }

  // L1 Valuation Details (only if l1Details exists)
  const valuationSection = document.getElementById(
    "lead-detail-valuation-section",
  );
  const l1 = lead.l1Details;
  if (l1) {
    document.getElementById("lead-detail-val-recommended").innerText =
      Utils.formatCurrency(l1.recommendedPrice || 0);
    document.getElementById("lead-detail-val-offered").innerText =
      Utils.formatCurrency(l1.offeredPrice || l1.agreedPrice || l1.recommendedPrice || 0);
    document.getElementById("lead-detail-val-accident").innerText =
      l1.accidentHistory || "None logged";
    document.getElementById("lead-detail-val-chassis").innerText =
      l1.chassisNumber || "—";
  } else {
    valuationSection.style.display = "none";
  }
  // Handle visibility of global Reject/Cancel button
  const rejectBtn = document.getElementById("lead-detail-reject-btn");
  if (rejectBtn) {
    const isFinalState = ["rejected", "scrapped"].includes(lead.status);
    rejectBtn.style.display = isFinalState ? "none" : "block";
  }

  document.getElementById("lead-detail-modal").classList.add("open");
}

function initL1CoordinatorAutocomplete(lead) {
  const searchInput = document.getElementById("lead-detail-agent-search");
  const hiddenInput = document.getElementById("lead-detail-agent-select");
  const dropdown = document.getElementById("lead-detail-agent-dropdown");
  if (!searchInput || !dropdown) return;

  const l1Agents = Api.getUsers().filter(
    (u) => u.permissions.includes("l1") && u.is_active,
  );

  // Set initial value
  if (lead.assignedTo) {
    const agent = l1Agents.find(a => a.id === lead.assignedTo);
    searchInput.value = agent ? agent.name : "";
    hiddenInput.value = lead.assignedTo;
  } else {
    searchInput.value = "";
    hiddenInput.value = "";
  }

  // Render function
  const renderList = (filterText = "") => {
    dropdown.innerHTML = "";
    const filtered = l1Agents.filter(a => 
      a.name.toLowerCase().includes(filterText.toLowerCase()) || 
      a.email.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-item no-matches">No matching L1 coordinators found</div>`;
      dropdown.style.display = "block";
      return;
    }

    filtered.forEach(agent => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.onclick = (e) => {
        e.stopPropagation();
        searchInput.value = agent.name;
        hiddenInput.value = agent.id;
        dropdown.style.display = "none";
      };

      const initials = agent.name ? agent.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "AG";
      item.innerHTML = `
        <div class="autocomplete-avatar">${initials}</div>
        <div class="autocomplete-item-details">
          <span class="autocomplete-item-name">${agent.name}</span>
          <span class="autocomplete-item-sub">${agent.email}</span>
        </div>
      `;
      dropdown.appendChild(item);
    });

    dropdown.style.display = "block";
  };

  // Bind input events
  searchInput.oninput = (e) => {
    renderList(e.target.value);
  };

  searchInput.onfocus = () => {
    renderList(searchInput.value);
  };

  // Close dropdown when clicking outside
  const closeHandler = (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
      document.removeEventListener("click", closeHandler);
    }
  };
  document.addEventListener("click", closeHandler);
}

function closeLeadDetailModal() {
  document.getElementById("lead-detail-modal").classList.remove("open");
  currentViewingLeadId = null;
}

// Close detail drawer when clicking outside
document.addEventListener("click", (e) => {
  const drawer = document.getElementById("lead-detail-modal");
  if (drawer && drawer.classList.contains("open")) {
    // If click is not inside the drawer, and not on a table row, close it
    if (!drawer.contains(e.target) && !e.target.closest("tr")) {
      closeLeadDetailModal();
    }
  }
});

async function saveL1AssignmentFromModal() {
  if (!currentViewingLeadId) return;
  const agentSelect = document.getElementById("lead-detail-agent-select");
  const agentId = agentSelect.value;
  if (!agentId) {
    Utils.showAlert("Please select an agent first.", "warning");
    return;
  }

  const user = Auth.getCurrentUser();
  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === currentViewingLeadId);
  if (idx !== -1) {
    const lead = leads[idx];
    const originalAssignedTo = lead.assignedTo;
    const originalStatus = lead.status;

    // Update lead values
    leads[idx].assignedTo = agentId;
    if (leads[idx].status === "new") {
      leads[idx].status = "assigned";
    }

    try {
      await Api.saveLeads(leads);
      refreshSidebarBadges();

      const agent = Api.getUsers().find((u) => u.id === agentId);
      await Api.logAction(
        user.id,
        "L1_AGENT_ASSIGNED",
        "leads",
        currentViewingLeadId,
        null,
        `Assigned L1 Agent: ${agent.name}`,
      );
      Api.addNotification(
        agentId,
        currentViewingLeadId,
        `New lead ${lead.vehicleNumber} assigned to you!`,
      );

      Utils.showAlert(`Successfully assigned lead to ${agent.name}`, "success");
      closeLeadDetailModal();

      // Reload whatever panel we are on
      if (activeTab === "l1") {
        loadL1Panel();
      } else if (activeTab === "overview") {
        loadOverview();
      }
    } catch (err) {
      console.error("Assignment failed:", err);
      // Revert local modifications
      leads[idx].assignedTo = originalAssignedTo;
      leads[idx].status = originalStatus;
      Utils.showAlert(`Assignment failed: ${err.message}`, "error");
      await Api.syncAll();
      if (activeTab === "l1") {
        loadL1Panel();
      } else if (activeTab === "overview") {
        loadOverview();
      }
    }
  }
}

// ──────────────────────────────────────────────
// L2 — APPROVALS PANEL
// ──────────────────────────────────────────────
function showL2TableView() {
  document.getElementById("l2-table-view").style.display = "block";
  document.getElementById("l2-detail-view").style.display = "none";
  selectedL2LeadId = null;
}

function reviewL2Lead(leadId) {
  selectedL2LeadId = leadId;
  document.getElementById("l2-table-view").style.display = "none";
  document.getElementById("l2-detail-view").style.display = "block";
  selectL2Lead(leadId);
}

function loadL2Panel() {
  const leads = Api.getLeads();
  const pending = leads.filter((l) => l.status === "pending_approval");
  const allLogs = Api.getAuditLogs();
  const todayApproved = allLogs.filter(
    (l) =>
      l.action === "STATUS_CHANGE" &&
      l.newVal &&
      l.newVal.includes("approved") &&
      isToday(l.timestamp),
  ).length;
  const todayRejected = allLogs.filter(
    (l) =>
      l.action === "STATUS_CHANGE" &&
      l.newVal &&
      l.newVal.includes("Rejected") &&
      isToday(l.timestamp),
  ).length;
  const infoNeeded = leads.filter((l) => l.status === "info_needed").length;

  document.getElementById("l2-pending-count").textContent = pending.length;
  document.getElementById("l2-approved-today").textContent = todayApproved;
  document.getElementById("l2-rejected-today").textContent = todayRejected;
  document.getElementById("l2-info-count").textContent = infoNeeded;

  const tbody = document.getElementById("l2-table-body");
  tbody.innerHTML = "";

  if (pending.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">No pending approvals in queue.</td></tr>';
    document.getElementById("pagination-l2").style.display = "none";
    return;
  }

  // Pagination logic
  const pageSize = 10;
  const currentPage = pagesState.l2 || 1;
  const totalItems = pending.length;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginated = pending.slice(start, end);

  paginated.forEach((lead) => {
    const agreedPrice = lead.l1Details
      ? lead.l1Details.agreedPrice ||
        lead.l1Details.recommendedPrice ||
        lead.expectedPrice
      : lead.expectedPrice;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:monospace; font-size:12px; color:var(--text-secondary);">#${lead.id.split("-")[1]}</td>
      <td>${lead.ownerName}</td>
      <td>${lead.make || ""} ${lead.model} ${lead.year || ""}</td>
      <td>${Utils.formatCurrency(agreedPrice)}</td>
      <td>${getAgentName(lead.assignedTo)}</td>
      <td>${timeAgo(lead.createdAt)}</td>
      <td><button class="action-btn" onclick="reviewL2Lead('${lead.id}')">Review</button></td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(
    "pagination-l2",
    totalItems,
    pageSize,
    currentPage,
    (newPage) => {
      pagesState.l2 = newPage;
      loadL2Panel();
    },
  );
}

// ── L2 Detail Population (preserves all existing logic) ──
function selectL2Lead(leadId) {
  selectedL2LeadId = leadId;
  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  // Header & expected price
  document.getElementById("l2-car-model").innerText =
    `${lead.make || ""} ${lead.model}`;
  document.getElementById("l2-reg-no").innerText = lead.vehicleNumber;
  document.getElementById("l2-price-expected").innerText = Utils.formatCurrency(
    lead.expectedPrice,
  );

  // 1. Owner & Lead Identification
  document.getElementById("l2-owner-name").innerText = lead.ownerName || "-";
  document.getElementById("l2-owner-phone").innerText = lead.phone || "-";
  document.getElementById("l2-owner-email").innerText =
    lead.email || (lead.l1Details && lead.l1Details.ownerEmail) || "-";
  document.getElementById("l2-owner-address").innerText =
    lead.address || (lead.l1Details && lead.l1Details.ownerAddress) || "-";

  // 2. Vehicle Specifications
  document.getElementById("l2-spec-make").innerText = lead.make || "-";
  document.getElementById("l2-spec-model").innerText = lead.model || "-";
  document.getElementById("l2-spec-year").innerText =
    lead.year || (lead.l1Details && lead.l1Details.year) || "-";
  document.getElementById("l2-spec-colour").innerText =
    lead.colour || (lead.l1Details && lead.l1Details.colour) || "-";
  document.getElementById("l2-spec-fuel").innerText =
    lead.fuelType || (lead.l1Details && lead.l1Details.fuelType) || "-";
  document.getElementById("l2-spec-kms").innerText = lead.kmsDriven
    ? lead.kmsDriven.toLocaleString()
    : lead.l1Details && lead.l1Details.kmsDriven
      ? lead.l1Details.kmsDriven.toLocaleString()
      : "-";
  document.getElementById("l2-spec-reg").innerText = lead.vehicleNumber || "-";
  document.getElementById("l2-spec-chassis").innerText =
    (lead.l1Details && lead.l1Details.chassisNumber) || "-";

  // Vahan API Report
  let vahan = lead.vahanDetails;
  if (!vahan) {
    vahan = Api.mockVahanCheck(lead.vehicleNumber);
  }
  document.getElementById("vahan-fitness").innerText = (
    vahan.fitnessUpto || ""
  ).startsWith("Valid to")
    ? vahan.fitnessUpto
    : `Valid to ${vahan.fitnessUpto || "-"}`;
  document.getElementById("vahan-hp").innerText = vahan.hypothecation || "-";
  document.getElementById("vahan-challans").innerText =
    `${vahan.challansCount !== undefined ? vahan.challansCount : 0} Active`;
  document.getElementById("vahan-challans").style.color =
    vahan.challansCount > 0 ? "var(--error-color)" : "var(--success-color)";
  const blacklistEl = document.getElementById("vahan-blacklist");
  if (blacklistEl) {
    blacklistEl.innerText = (vahan.blacklistStatus || "Clean").includes("Clean")
      ? "Clean"
      : vahan.blacklistStatus;
    blacklistEl.style.color = (vahan.blacklistStatus || "Clean").includes(
      "Clean",
    )
      ? "var(--success-color)"
      : "var(--error-color)";
  }

  // 3. Condition Assessment
  const bodyRating =
    (lead.l1Details && lead.l1Details.bodyCondition) || lead.bodyCondition || 0;
  const bodyDescMap = {
    10: "Showroom condition, flawless panels",
    9: "Excellent, negligible surface scratches",
    8: "Very good, minor scratches on 1-2 panels",
    7: "Good, minor wear, small dent on 1 panel",
    6: "Fair, multiple scratches, slight paint chipping",
    5: "Moderate, small dents on 2-3 panels",
    4: "Average wear and tear, scratches on 3+ panels",
    3: "Poor, major dents and paint damage",
    2: "Very poor, severe rusting or deep dents",
    1: "Extremely damaged, major panel distortion",
  };
  document.getElementById("l2-body-rating-badge").innerText = bodyRating || "-";
  document.getElementById("l2-body-rating-desc").innerText =
    bodyDescMap[bodyRating] || "Not specified";

  const engineRating = (lead.l1Details && lead.l1Details.engineCondition) || 5;
  const engineDescMap = {
    10: "Whisper quiet, perfect compression",
    9: "Smooth running, no noise or vibration",
    8: "Very healthy, starts instantly",
    7: "Good running, minor belt squeak",
    6: "Decent running, minor oil dampness",
    5: "Moderate noise, slight smoke",
    4: "Loud sound, noticeable smoke, active leak",
    3: "Misfiring, rough idle, heavy smoke",
    2: "Severe mechanical noise, heavy leaks",
    1: "Non-functional, seized engine",
  };
  document.getElementById("l2-engine-rating-badge").innerText =
    engineRating || "-";
  document.getElementById("l2-engine-rating-desc").innerText =
    engineDescMap[engineRating] || "Not specified";

  const tyreRating = (lead.l1Details && lead.l1Details.tyreCondition) || 6;
  const tyreDescMap = {
    10: "Brand new, 100% tread depth",
    9: "Nearly new, 80-90% depth",
    8: "Very good, 70-80% depth",
    7: "Good, 60-70% depth",
    6: "Average, 40-50% depth",
    5: "Moderate, 30-40% depth",
    4: "Low tread, replace soon",
    3: "Worn out, cracking on sidewalls",
    2: "Bald tyres, dangerous",
    1: "Damaged/punctured",
  };
  document.getElementById("l2-tyre-rating-badge").innerText = tyreRating || "-";
  document.getElementById("l2-tyre-rating-desc").innerText =
    tyreDescMap[tyreRating] || "Not specified";

  document.getElementById("l2-accident-records").innerText =
    (lead.l1Details && lead.l1Details.accidentHistory) || "None declared.";

  // Accessories tiles
  const optionsBox = document.getElementById("l2-options-tiles");
  optionsBox.innerHTML = "";
  const accessoriesList = [
    "Battery",
    "AC",
    "Music System",
    "Airbags",
    "Sunroof",
    "Spare Tyre",
    "Jack & Tools",
    "Central Locking",
  ];
  accessoriesList.forEach((acc) => {
    const isPresent =
      lead.optionsPresent.includes(acc) ||
      (lead.l1Details &&
        lead.l1Details.missingParts &&
        !lead.l1Details.missingParts.includes(acc));
    const tile = document.createElement("div");
    tile.className = `option-tile ${isPresent ? "active" : ""}`;
    tile.style.padding = "8px 12px";
    tile.style.cursor = "default";
    tile.innerHTML = `
      <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
      <span>${acc}</span>
    `;
    optionsBox.appendChild(tile);
  });

  // 4. Pricing
  const recVal =
    (lead.l1Details && lead.l1Details.recommendedPrice) ||
    lead.expectedPrice * 0.8;
  const agreedVal =
    (lead.l1Details &&
      (lead.l1Details.agreedPrice || lead.l1Details.offeredPrice || lead.l1Details.recommendedPrice)) ||
    lead.expectedPrice;
  document.getElementById("l2-pricing-expected").innerText =
    Utils.formatCurrency(lead.expectedPrice);
  document.getElementById("l2-pricing-recommended").innerText =
    Utils.formatCurrency(recVal);
  document.getElementById("l2-pricing-agreed").innerText =
    Utils.formatCurrency(agreedVal);

  // 5. KYC Documents
  const kycBox = document.getElementById("l2-kyc-gallery");
  kycBox.innerHTML = "";
  const docLabels = {
    rcFront: "RC Book (Front)",
    rcBack: "RC Book (Back)",
    aadhar: "Aadhar Card",
    pan: "PAN Card",
    insurance: "Insurance",
    noc: "NOC",
    form35: "Form 35",
  };
  const docsToDisplay = (lead.l1Details && lead.l1Details.documents) || {};
  if (Object.keys(docsToDisplay).length === 0) {
    docsToDisplay.rcFront = "rc_front.jpg";
    docsToDisplay.rcBack = "rc_back.jpg";
    docsToDisplay.aadhar = "aadhar.jpg";
    docsToDisplay.pan = "pan.jpg";
  }
  Object.entries(docsToDisplay).forEach(([key, val]) => {
    if (!val) return;
    const label = docLabels[key] || key.toUpperCase();
    const item = document.createElement("div");
    item.className = "option-tile";
    item.style.cssText =
      "padding:0; overflow:hidden; height:96px; cursor:pointer; border-radius:var(--border-radius-md); border:1px solid var(--border-color);";
    item.innerHTML = `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--surface-variant); font-size:0.75rem; color:var(--success-color); transition:all 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--success-color)'"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span style="font-weight:600; text-align:center; padding:0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; font-size:0.75rem;">${label}</span></div>`;
    item.onclick = () => openMediaLightbox(label, "Uploaded Document");
    kycBox.appendChild(item);
  });

  // 6. Media Uploads
  const mediaBox = document.getElementById("l2-media-gallery");
  mediaBox.innerHTML = "";
  const mediaLabels = {
    extFront: "Exterior Front",
    extRear: "Exterior Rear",
    extLeft: "Exterior Left",
    extRight: "Exterior Right",
    interior: "Interior View",
    engine: "Engine Bay",
    odometer: "Odometer",
    damage: "Damage Spots",
    video: "Walkaround Video",
  };
  const mediaToDisplay = (lead.l1Details && lead.l1Details.media) || {};
  if (Object.keys(mediaToDisplay).length === 0) {
    const photosList = (lead.l1Details && lead.l1Details.photos) || [
      "exterior_front.jpg",
      "exterior_rear.jpg",
      "interior_view.jpg",
      "engine_bay.jpg",
    ];
    photosList.forEach((photo, i) => {
      mediaToDisplay[
        ["extFront", "extRear", "interior", "engine", "extLeft", "extRight"][
          i
        ] || `photo_${i}`
      ] = photo;
    });
  }
  Object.entries(mediaToDisplay).forEach(([key, val]) => {
    if (!val) return;
    const label = mediaLabels[key] || key.toUpperCase();
    const isVideo = key === "video" || val.endsWith(".mp4");
    const item = document.createElement("div");
    item.className = "option-tile";
    item.style.cssText =
      "padding:0; overflow:hidden; height:96px; cursor:pointer; border-radius:var(--border-radius-md); border:1px solid var(--border-color);";
    item.innerHTML = `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--surface-variant); font-size:0.75rem; color:var(--text-secondary); transition:all 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-secondary)'">${isVideo ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:6px;"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:6px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'}<span style="font-weight:600; text-align:center; padding:0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; font-size:0.75rem;">${label}</span></div>`;
    item.onclick = () =>
      openMediaLightbox(label, isVideo ? "Walkaround Video" : "Vehicle Photo");
    mediaBox.appendChild(item);
  });

  // 7. Payment Mode
  const payMode = (lead.l1Details && lead.l1Details.paymentMode) || "upi";
  const payDetails = (lead.l1Details &&
    (lead.l1Details.paymentDetails || lead.l1Details.bankDetails)) || {
    upiId: "seller@okaxis",
  };
  const modeLabelMap = {
    upi: "UPI (Unified Payments Interface)",
    cash: "CASH payment",
    bank: "Bank Transfer (NEFT/IMPS)",
  };
  document.getElementById("l2-payment-method").innerText =
    modeLabelMap[payMode] || payMode.toUpperCase();
  const detailsBox = document.getElementById("l2-payment-details-box");
  detailsBox.style.display = "block";
  if (payMode === "upi") {
    const upiVal = payDetails.upiId || "";
    const copyBtn = upiVal
      ? `<svg onclick="copyToClipboard('${upiVal}', 'UPI ID')" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer; margin-left:6px; vertical-align:middle; opacity:0.7; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
      : "";
    detailsBox.innerHTML = `<div style="display:flex; align-items:center;"><strong>UPI ID:</strong> <span style="font-family:monospace; margin-left:6px;">${upiVal || "-"}</span>${copyBtn}</div>`;
  } else if (payMode === "cash") {
    detailsBox.innerHTML = `<strong>Cash Handover:</strong> <span style="color:var(--success-color); font-weight:600;">✓ Confirmed</span>`;
  } else if (payMode === "bank") {
    const holder = payDetails.accountHolder || "";
    const bankName = payDetails.bankName || "";
    const accNum = payDetails.accountNumber || "";
    const ifsc = payDetails.ifscCode || "";
    const copyIcon = (text, name) =>
      text
        ? `<svg onclick="copyToClipboard('${text}', '${name}')" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer; margin-left:6px; vertical-align:middle; opacity:0.7; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
        : "";
    detailsBox.innerHTML = `
      <div style="display:grid; gap:8px;">
        <div style="display:flex; align-items:center;"><strong>Holder:</strong> <span style="margin-left:6px;">${holder || "-"}</span>${copyIcon(holder, "Account Holder")}</div>
        <div style="display:flex; align-items:center;"><strong>Bank:</strong> <span style="margin-left:6px;">${bankName || "-"}</span>${copyIcon(bankName, "Bank Name")}</div>
        <div style="display:flex; align-items:center;"><strong>A/C No:</strong> <span style="font-family:monospace; margin-left:6px;">${accNum || "-"}</span>${copyIcon(accNum, "Account Number")}</div>
        <div style="display:flex; align-items:center;"><strong>IFSC:</strong> <span style="font-family:monospace; margin-left:6px;">${ifsc || "-"}</span>${copyIcon(ifsc, "IFSC Code")}</div>
      </div>
    `;
  } else {
    detailsBox.style.display = "none";
  }
}

// L2 Action Handlers
async function handleL2Approve() {
  if (!selectedL2LeadId) return;
  const user = Auth.getCurrentUser();
  const lead = Api.getLeadById(selectedL2LeadId);
  await Api.updateLeadStatus(
    selectedL2LeadId,
    "approved",
    user.id,
    `Approved by ${user.name}`,
  );
  const financeUsers = Api.getUsers().filter((u) =>
    u.permissions.includes("l3"),
  );
  financeUsers.forEach((f) => {
    Api.addNotification(
      f.id,
      selectedL2LeadId,
      `Purchase approved for ${lead.vehicleNumber}! Initiate payout.`,
    );
  });
  Utils.showAlert(
    `Vehicle ${lead.vehicleNumber} approved. Forwarded to finance.`,
    "success",
  );
  selectedL2LeadId = null;
  showL2TableView();
  loadL2Panel();
  refreshSidebarBadges();
}

function openRejectDialog() {
  document.getElementById("reject-reason").value = "";
  document.getElementById("reject-modal").style.display = "flex";
}
function closeRejectDialog() {
  document.getElementById("reject-modal").style.display = "none";
}
window.openLeadDetailRejectDialog = function() {
  selectedL2LeadId = currentViewingLeadId;
  openRejectDialog();
};
async function handleL2Reject() {
  const reason = document.getElementById("reject-reason").value.trim();
  if (!reason) {
    alert("Please enter a rejection reason.");
    return;
  }
  const user = Auth.getCurrentUser();
  const lead = Api.getLeadById(selectedL2LeadId);
  await Api.updateLeadStatus(
    selectedL2LeadId,
    "rejected",
    user.id,
    `Rejected: ${reason}`,
  );
  if (lead.assignedTo)
    Api.addNotification(
      lead.assignedTo,
      selectedL2LeadId,
      `Your submission ${lead.vehicleNumber} was rejected: ${reason}`,
    );
  Utils.showAlert(`Vehicle ${lead.vehicleNumber} rejected.`, "error");
  closeRejectDialog();
  closeLeadDetailModal();
  selectedL2LeadId = null;

  // Refresh active panel/tab data
  await Api.syncAll();
  if (typeof activeTab !== "undefined" && activeTab) {
    loadTabData(activeTab);
  } else {
    showL2TableView();
    loadL2Panel();
  }
  refreshSidebarBadges();
}

// ──────────────────────────────────────────────
// L3 — PAYMENTS PANEL
// ──────────────────────────────────────────────
function showL3TableView() {
  document.getElementById("l3-table-view").style.display = "block";
  document.getElementById("l3-detail-view").style.display = "none";
  selectedL3LeadId = null;
}

function reviewL3Lead(leadId) {
  selectedL3LeadId = leadId;
  document.getElementById("l3-table-view").style.display = "none";
  document.getElementById("l3-detail-view").style.display = "block";
  selectL3Lead(leadId);
}

function loadL3Panel() {
  const leads = Api.getLeads();
  const payable = leads.filter(
    (l) => l.status === "approved" || l.status === "payment_initiated",
  );
  const paidAll = leads.filter(
    (l) => l.status === "payment_confirmed" || l.status === "picked_up" || l.status === "scrapped",
  );
  const paidToday = paidAll.filter(
    (l) => l.paymentDetails && isToday(l.paymentDetails.confirmedAt),
  ).length;
  let totalPaid = 0;
  paidAll.forEach((l) => {
    totalPaid += (l.paymentDetails && l.paymentDetails.amount) || 0;
  });
  const avgPayment =
    paidAll.length > 0 ? Math.round(totalPaid / paidAll.length) : 0;

  document.getElementById("l3-awaiting-count").textContent = payable.length;
  document.getElementById("l3-paid-today").textContent = paidToday;
  document.getElementById("l3-total-paid").textContent =
    totalPaid >= 100000
      ? `₹${(totalPaid / 100000).toFixed(1)}L`
      : Utils.formatCurrency(totalPaid);
  document.getElementById("l3-avg-payment").textContent =
    avgPayment >= 1000
      ? `₹${Math.round(avgPayment / 1000)}K`
      : Utils.formatCurrency(avgPayment);

  const tbody = document.getElementById("l3-table-body");
  tbody.innerHTML = "";

  if (payable.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">No payout orders pending.</td></tr>';
    document.getElementById("pagination-l3").style.display = "none";
    return;
  }

  // Pagination logic
  const pageSize = 10;
  const currentPage = pagesState.l3 || 1;
  const totalItems = payable.length;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginated = payable.slice(start, end);

  paginated.forEach((lead) => {
    const amount = lead.l1Details
      ? lead.l1Details.agreedPrice ||
        lead.l1Details.offeredPrice ||
        lead.l1Details.recommendedPrice ||
        lead.expectedPrice
      : lead.expectedPrice;
    const payMode = (lead.l1Details && lead.l1Details.paymentMode) || "NEFT";
    const methodLabel =
      { upi: "UPI", cash: "Cash", bank: "NEFT" }[payMode] ||
      payMode.toUpperCase();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:monospace; font-size:12px; color:var(--text-secondary);">#${lead.id.split("-")[1]}</td>
      <td>${lead.ownerName}</td>
      <td>${lead.make || ""} ${lead.model} ${lead.year || ""}</td>
      <td>${Utils.formatCurrency(amount)}</td>
      <td>${methodLabel}</td>
      <td>${timeAgo(lead.createdAt)}</td>
      <td><button class="action-btn" onclick="reviewL3Lead('${lead.id}')">${lead.status === "payment_initiated" ? "Confirm" : "Pay"}</button></td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(
    "pagination-l3",
    totalItems,
    pageSize,
    currentPage,
    (newPage) => {
      pagesState.l3 = newPage;
      loadL3Panel();
    },
  );
}

// ── L3 Detail Population ──
function selectL3Lead(leadId) {
  selectedL3LeadId = leadId;
  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  document.getElementById("l3-car-model").innerText =
    `${lead.make || ""} ${lead.model}`;
  document.getElementById("l3-reg-no").innerText = lead.vehicleNumber;
  const agreedPrice = lead.l1Details
    ? lead.l1Details.agreedPrice || lead.l1Details.offeredPrice || lead.l1Details.recommendedPrice
    : lead.expectedPrice;
  document.getElementById("l3-price-agreed").innerText =
    Utils.formatCurrency(agreedPrice);

  // Payment Coordinates — dynamic based on payment mode
  const payMode = (lead.l1Details && lead.l1Details.paymentMode) || "bank";
  const payDetails = (lead.l1Details && lead.l1Details.paymentDetails) || {};
  const coordsBox = document.getElementById("l3-payment-coordinates-box");

  const copyIconSvg = (text, name) =>
    text
      ? `<svg onclick="copyToClipboard('${text.replace(/'/g, "\\'")}', '${name}')" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer; margin-left:6px; opacity:0.7; transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
      : "";

  if (payMode === "upi") {
    const upiId = payDetails.upiId || "—";
    coordsBox.innerHTML = `
      <div class="vahan-row"><span>Payment Mode</span><div style="display:flex; align-items:center;"><strong style="color:var(--primary-color);">UPI</strong></div></div>
      <div class="vahan-row"><span>UPI ID</span><div style="display:flex; align-items:center;"><strong style="font-family:monospace;">${upiId}</strong>${copyIconSvg(upiId, 'UPI ID')}</div></div>
    `;
  } else if (payMode === "cash") {
    coordsBox.innerHTML = `
      <div class="vahan-row"><span>Payment Mode</span><div style="display:flex; align-items:center;"><strong style="color:var(--warning-color);">Cash</strong></div></div>
      <div class="vahan-row"><span>Cash Handover</span><div style="display:flex; align-items:center;"><strong style="color:var(--success-color);">✓ Confirmed by Agent</strong></div></div>
    `;
  } else {
    // Bank transfer (default)
    const holder = payDetails.accountHolder || lead.ownerName || "—";
    const bankName = payDetails.bankName || "—";
    const accNum = payDetails.accountNumber || "—";
    const ifsc = payDetails.ifscCode || "—";
    coordsBox.innerHTML = `
      <div class="vahan-row"><span>Payment Mode</span><div style="display:flex; align-items:center;"><strong style="color:var(--info-color);">Bank Transfer</strong></div></div>
      <div class="vahan-row"><span>Account Holder</span><div style="display:flex; align-items:center;"><strong>${holder}</strong>${copyIconSvg(holder, 'Account Holder')}</div></div>
      <div class="vahan-row"><span>Bank Name</span><div style="display:flex; align-items:center;"><strong>${bankName}</strong>${copyIconSvg(bankName, 'Bank Name')}</div></div>
      <div class="vahan-row"><span>Account Number</span><div style="display:flex; align-items:center;"><strong style="font-family:monospace;">${accNum}</strong>${copyIconSvg(accNum, 'Account Number')}</div></div>
      <div class="vahan-row"><span>IFSC Code</span><div style="display:flex; align-items:center;"><strong style="font-family:monospace;">${ifsc}</strong>${copyIconSvg(ifsc, 'IFSC Code')}</div></div>
    `;
  }

  // KYC Documents
  const l3MediaBox = document.getElementById("l3-media-gallery");
  if (l3MediaBox) {
    l3MediaBox.innerHTML = "";
    if (lead.l1Details && lead.l1Details.documents) {
      Object.entries(lead.l1Details.documents).forEach(([key, val]) => {
        if (!val) return;
        const item = document.createElement("div");
        item.className = "option-tile";
        item.style.cssText =
          "padding:0; overflow:hidden; height:96px; cursor:pointer; border-radius:var(--border-radius-md); border:1px solid var(--border-color);";
        const label = key.replace("rc", "RC ").toUpperCase();
        item.innerHTML = `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--surface-variant); font-size:0.75rem; color:var(--success-color);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span style="font-weight:600; text-align:center; padding:0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; font-size:0.75rem;">${label}</span></div>`;
        item.onclick = () => openMediaLightbox(label, "Uploaded Document");
        l3MediaBox.appendChild(item);
      });
    }
  }

  // Stage workflows
  const form = document.getElementById("stage-1-form");
  const completedMessage = document.getElementById("stage-1-completed-message");
  const stage2Box = document.getElementById("payment-stage-2-box");

  if (lead.status === "approved") {
    form.style.display = "block";
    completedMessage.style.display = "none";
    stage2Box.style.opacity = "0.5";
    stage2Box.style.pointerEvents = "none";
    document.getElementById("payout-utr").value = "";
    document.getElementById("payout-receipt").value = "";
    // Reset file upload button visual state
    const receiptStatus = document.getElementById("payout-receipt-status");
    if (receiptStatus) {
      receiptStatus.innerText = "Upload Receipt PDF / Photo";
      const uploadBtn = document.getElementById("payout-receipt-upload-btn");
      uploadBtn.style.borderColor = "var(--border-color)";
      uploadBtn.style.color = "var(--text-secondary)";
    }
    const fileInput = document.getElementById("payout-receipt-file");
    if (fileInput) fileInput.value = "";
  } else if (lead.status === "payment_initiated") {
    form.style.display = "none";
    completedMessage.style.display = "block";
    const payDtls = (lead.l3Details && lead.l3Details.paymentDetails) || lead.paymentDetails || {};
    document.getElementById("stage-1-saved-utr").innerText =
      payDtls.utrNumber || "—";
    stage2Box.style.opacity = "1";
    stage2Box.style.pointerEvents = "auto";
  }
}

async function handleStage1Initiate(event) {
  event.preventDefault();
  if (!selectedL3LeadId) return;
  const utr = document.getElementById("payout-utr").value.trim();
  const receipt = document.getElementById("payout-receipt").value.trim();
  const user = Auth.getCurrentUser();
  const lead = Api.getLeadById(selectedL3LeadId);
  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === selectedL3LeadId);
  if (idx !== -1) {
    leads[idx].status = "payment_initiated";
    leads[idx].l3Details = {
      ...(leads[idx].l3Details || {}),
      paymentDetails: {
        utrNumber: utr,
        receiptUrl: receipt,
        amount: lead.l1Details
          ? lead.l1Details.agreedPrice || lead.l1Details.offeredPrice || lead.l1Details.recommendedPrice
          : lead.expectedPrice,
        initiatedBy: user.id,
      },
    };
    // Keep root-level reference for in-memory reads
    leads[idx].paymentDetails = leads[idx].l3Details.paymentDetails;
    await Api.saveLeads(leads);
    await Api.logAction(
      user.id,
      "PAYMENT_INITIATED",
      "leads",
      selectedL3LeadId,
      "approved",
      `UTR: ${utr}`,
    );
  }
  Utils.showAlert("Payout stage 1 initiated successfully.", "success");
  selectL3Lead(selectedL3LeadId);
  refreshSidebarBadges();
}

async function handleStage2Confirm() {
  if (!selectedL3LeadId) return;
  const user = Auth.getCurrentUser();
  const lead = Api.getLeadById(selectedL3LeadId);
  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === selectedL3LeadId);
  if (idx !== -1) {
    leads[idx].status = "payment_confirmed";
    const payDtls = (leads[idx].l3Details && leads[idx].l3Details.paymentDetails) || leads[idx].paymentDetails || {};
    payDtls.confirmedAt = new Date().toISOString();
    leads[idx].l3Details = {
      ...(leads[idx].l3Details || {}),
      paymentDetails: payDtls,
    };
    leads[idx].paymentDetails = payDtls;
    await Api.saveLeads(leads);
    await Api.logAction(
      user.id,
      "PAYMENT_CONFIRMED",
      "leads",
      selectedL3LeadId,
      "payment_initiated",
      "Fund receipt confirmed",
    );
  }
  Api.addNotification(
    "usr-8",
    selectedL3LeadId,
    `Payment confirmed for ${lead.vehicleNumber}. Ready for Picker assignment.`,
  );
  Utils.showAlert(
    "Funds confirmed in seller account! Ready for pickup schedule.",
    "success",
  );
  selectedL3LeadId = null;
  showL3TableView();
  loadL3Panel();
  refreshSidebarBadges();
}

function mockDownloadVoucher() {
  if (!selectedL3LeadId) return;
  const lead = Api.getLeadById(selectedL3LeadId);
  Utils.mockDownloadReceiptPDF(lead);
}

// ──────────────────────────────────────────────
// L4 — PICKER PANEL
// ──────────────────────────────────────────────
let changingPickerLeads = new Set();
let selectedPickerTemp = {};

window.storeTempPickerSelection = function(leadId, val) {
  selectedPickerTemp[leadId] = val;
};

function enableChangePicker(leadId) {
  changingPickerLeads.add(leadId);
  loadL4Panel();
}

function cancelChangePicker(leadId) {
  changingPickerLeads.delete(leadId);
  delete selectedPickerTemp[leadId];
  loadL4Panel();
}

function loadL4Panel() {
  const leads = Api.getLeads();
  let paymentConfirmed = leads.filter((l) => l.status === "payment_confirmed");
  const pickedUp = leads.filter(
    (l) => l.assignedPicker && l.status !== "payment_confirmed",
  ).length;
  const scrapped = leads.filter((l) => l.status === "scrapped").length;

  const scrapReadyCount = leads.filter(l => l.status === "picked_up").length;
  const scrappedTodayCount = leads.filter(l => l.status === "scrapped" && l.scrapDetails && l.scrapDetails.scrappedAt && new Date(l.scrapDetails.scrappedAt).toDateString() === new Date().toDateString()).length;

  document.getElementById("l4-ready-count").textContent =
    paymentConfirmed.length;
  document.getElementById("l4-picked-count").textContent = pickedUp;
  document.getElementById("l4-scrap-ready").textContent = scrapReadyCount;
  document.getElementById("l4-scrapped-today").textContent = scrappedTodayCount;

  const tbody = document.getElementById("l4-table-body");
  const emptyEl = document.getElementById("l4-empty");
  tbody.innerHTML = "";

  if (highlightedL4LeadId) {
    const highlightedLead = leads.find((l) => l.id === highlightedL4LeadId);
    if (
      highlightedLead &&
      !paymentConfirmed.some((l) => l.id === highlightedL4LeadId)
    ) {
      paymentConfirmed = [highlightedLead, ...paymentConfirmed];
    }
  }

  emptyEl.style.display = "none";
  tbody.closest(".table-wrap").style.display = "";

  if (paymentConfirmed.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">No paid vehicles require picker assignment at this time.</td></tr>';
    document.getElementById("pagination-l4").style.display = "none";
    return;
  }

  const pickers = Api.getUsers().filter(
    (u) => u.permissions.includes("l4_picker") && u.is_active,
  );

  // Pagination logic
  const pageSize = 10;
  const currentPage = pagesState.l4 || 1;
  const totalItems = paymentConfirmed.length;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginated = paymentConfirmed.slice(start, end);

  paginated.forEach((lead) => {
    const hasPicker = !!lead.assignedPicker;
    const isEditing = changingPickerLeads.has(lead.id);
    const isAssigned = hasPicker && !isEditing;
    const isHighlighted = lead.id === highlightedL4LeadId;

    // Autocomplete input HTML (disabled if assigned)
    const tempSel = selectedPickerTemp[lead.id];
    const currentSelectedId = tempSel !== undefined ? tempSel : (lead.assignedPicker || "");
    const currentSelectedUser = pickers.find(p => p.id === currentSelectedId);
    const currentSelectedName = currentSelectedUser ? currentSelectedUser.name : "";

    let selectHtml = `
      <div class="table-autocomplete-wrapper" style="position: relative;" data-lead-id="${lead.id}">
        <input type="text" 
               class="premium-input picker-search-input" 
               value="${currentSelectedName}" 
               placeholder="Search picker..." 
               style="height: 32px; font-size: 0.8rem; width: 160px; margin: 0;" 
               autocomplete="off" 
               ${isAssigned ? "disabled" : ""} 
               onfocus="showTablePickerDropdown('${lead.id}', this)"
               oninput="filterTablePickerDropdown('${lead.id}', this.value)"
        >
        <input type="hidden" class="assign-dropdown" value="${currentSelectedId}">
        <div class="autocomplete-dropdown table-picker-dropdown" style="display: none;"></div>
      </div>
    `;

    // Action button(s) HTML
    let actionHtml = "";
    if (isEditing) {
      actionHtml = `
        <div style="display:inline-flex; gap:8px;">
          <button class="action-btn" onclick="assignPickerFromBtn('${lead.id}', this)" style="color:var(--success-color); border-color:var(--success-color);">Assign</button>
          <button class="action-btn" onclick="cancelChangePicker('${lead.id}')">Cancel</button>
        </div>
      `;
    } else if (hasPicker) {
      actionHtml = `
        <div style="display:inline-flex; gap:8px;">
          <button class="action-btn" disabled style="opacity:0.6; cursor:not-allowed;">Assigned</button>
          <button class="action-btn" onclick="enableChangePicker('${lead.id}')" style="color:var(--primary-color); border-color:var(--primary-color);">Change</button>
        </div>
      `;
    } else {
      actionHtml = `<button class="action-btn" onclick="assignPickerFromBtn('${lead.id}', this)">Assign</button>`;
    }

    const address =
      lead.address || (lead.l1Details && lead.l1Details.ownerAddress) || "—";
    const paidDate =
      lead.paymentDetails && lead.paymentDetails.confirmedAt
        ? timeAgo(lead.paymentDetails.confirmedAt)
        : "—";

    const tr = document.createElement("tr");
    if (isHighlighted) {
      tr.className = "highlighted-row";
      tr.id = `l4-row-${lead.id}`;
    }
    tr.innerHTML = `
      <td style="font-family:monospace; font-size:12px; color:var(--text-secondary);">#${lead.id.split("-")[1]}</td>
      <td>${lead.ownerName}</td>
      <td>${lead.make || ""} ${lead.model} ${lead.year || ""}</td>
      <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${address}</td>
      <td>${paidDate}</td>
      <td>${selectHtml}</td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(
    "pagination-l4",
    totalItems,
    pageSize,
    currentPage,
    (newPage) => {
      pagesState.l4 = newPage;
      loadL4Panel();
    },
  );

  if (highlightedL4LeadId) {
    const rowId = `l4-row-${highlightedL4LeadId}`;
    setTimeout(() => {
      const row = document.getElementById(rowId);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      highlightedL4LeadId = null;
    }, 200);
  }
}

window.showTablePickerDropdown = function(leadId, input) {
  const wrapper = input.closest('.table-autocomplete-wrapper');
  const dropdown = wrapper.querySelector('.table-picker-dropdown');
  const pickers = Api.getUsers().filter(
    (u) => u.permissions.includes("l4_picker") && u.is_active,
  );

  const renderDropdown = (filterText = "") => {
    dropdown.innerHTML = "";
    const filtered = pickers.filter(p => 
      p.name.toLowerCase().includes(filterText.toLowerCase()) || 
      p.email.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-item no-matches">No matching pickers found</div>`;
      dropdown.style.display = "block";
      return;
    }

    filtered.forEach(p => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.onclick = (e) => {
        e.stopPropagation();
        input.value = p.name;
        const hiddenInput = wrapper.querySelector('.assign-dropdown');
        hiddenInput.value = p.id;
        storeTempPickerSelection(leadId, p.id);
        dropdown.style.display = "none";
      };

      const initials = p.name ? p.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "PK";
      item.innerHTML = `
        <div class="autocomplete-avatar">${initials}</div>
        <div class="autocomplete-item-details">
          <span class="autocomplete-item-name">${p.name}</span>
          <span class="autocomplete-item-sub">${p.email}</span>
        </div>
      `;
      dropdown.appendChild(item);
    });

    dropdown.style.display = "block";
  };

  renderDropdown(input.value);

  // Bind close click handler
  const closeHandler = (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = "none";
      document.removeEventListener("click", closeHandler);
    }
  };
  document.addEventListener("click", closeHandler);
};

window.filterTablePickerDropdown = function(leadId, filterText) {
  const input = document.querySelector(`.table-autocomplete-wrapper[data-lead-id="${leadId}"] .picker-search-input`);
  if (input) {
    const wrapper = input.closest('.table-autocomplete-wrapper');
    const dropdown = wrapper.querySelector('.table-picker-dropdown');
    const pickers = Api.getUsers().filter(
      (u) => u.permissions.includes("l4_picker") && u.is_active,
    );

    dropdown.innerHTML = "";
    const filtered = pickers.filter(p => 
      p.name.toLowerCase().includes(filterText.toLowerCase()) || 
      p.email.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-item no-matches">No matching pickers found</div>`;
      dropdown.style.display = "block";
      return;
    }

    filtered.forEach(p => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.onclick = (e) => {
        e.stopPropagation();
        input.value = p.name;
        const hiddenInput = wrapper.querySelector('.assign-dropdown');
        hiddenInput.value = p.id;
        storeTempPickerSelection(leadId, p.id);
        dropdown.style.display = "none";
      };

      const initials = p.name ? p.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "PK";
      item.innerHTML = `
        <div class="autocomplete-avatar">${initials}</div>
        <div class="autocomplete-item-details">
          <span class="autocomplete-item-name">${p.name}</span>
          <span class="autocomplete-item-sub">${p.email}</span>
        </div>
      `;
      dropdown.appendChild(item);
    });
  }
};

function assignPickerFromBtn(leadId, btn) {
  const select = btn.closest("tr").querySelector(".assign-dropdown");
  if (select) {
    assignPicker(leadId, select.value);
  }
}

async function assignPicker(leadId, pickerId) {
  if (!pickerId) {
    Utils.showAlert("Please select a picker agent first.", "warning");
    return;
  }
  const user = Auth.getCurrentUser();
  const lead = Api.getLeadById(leadId);
  const picker = Api.getUsers().find((u) => u.id === pickerId);
  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === leadId);
  if (idx !== -1) {
    leads[idx].assignedPicker = pickerId;
    leads[idx].scheduledDate = new Date(
      Date.now() + 3600000 * 24,
    ).toISOString();
    await Api.saveLeads(leads);
    refreshSidebarBadges();
    await Api.logAction(
      user.id,
      "PICKER_ASSIGNED",
      "leads",
      leadId,
      null,
      `Assigned Picker: ${picker.name}`,
    );
  }
  Api.addNotification(
    pickerId,
    leadId,
    `New pickup assigned for vehicle ${lead.vehicleNumber}!`,
  );
  Utils.showAlert(
    `Picker ${picker.name} allocated to lead ${lead.vehicleNumber}`,
    "success",
  );
  changingPickerLeads.delete(leadId);
  delete selectedPickerTemp[leadId];
  loadL4Panel();
}

// ──────────────────────────────────────────────
// USERS PANEL
// ──────────────────────────────────────────────
function loadUsersPanel() {
  const users = Api.getUsers();
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";

  if (users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-state">No users found.</td></tr>';
    document.getElementById("pagination-users").style.display = "none";
    return;
  }

  // Pagination logic
  const pageSize = 10;
  const currentPage = pagesState.users || 1;
  const totalItems = users.length;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginated = users.slice(start, end);

  paginated.forEach((u) => {
    const permStr = u.is_super_admin
      ? "Super Admin"
      : u.permissions.length > 0
        ? u.permissions.map((p) => p.toUpperCase()).join(", ")
        : "—";
    const tr = document.createElement("tr");

    // Action column Edit button (disabled/system label for super admin)
    const actionBtnHtml = u.is_super_admin
      ? `<button class="action-btn" disabled style="opacity:0.5; cursor:not-allowed;">System</button>`
      : `<button class="action-btn" onclick="openEditUserModal('${u.id}')">Edit</button>`;

    tr.innerHTML = `
      <td style="font-weight:500;">${u.name} ${u.is_super_admin ? "★" : ""}</td>
      <td style="color:var(--text-secondary);">${u.email}</td>
      <td style="font-size:12px;">${permStr}</td>
      <td><span class="status-badge ${u.is_active ? "active-st" : "inactive-st"}">${u.is_active ? "Active" : "Blocked"}</span></td>
      <td>${actionBtnHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(
    "pagination-users",
    totalItems,
    pageSize,
    currentPage,
    (newPage) => {
      pagesState.users = newPage;
      loadUsersPanel();
    },
  );
}

// ── Edit User Modal Helpers ──
let currentEditingUserId = null;

function openEditUserModal(userId) {
  currentEditingUserId = userId;
  const user = Api.getUsers().find((u) => u.id === userId);
  if (!user) return;

  document.getElementById("edit-user-modal-title").innerText =
    `Edit Staff Member — ${user.name}`;

  document.getElementById("edit-user-name").value = user.name || "";
  document.getElementById("edit-user-email").value = user.email || "";
  document.getElementById("edit-user-phone").value = user.phone || "";
  document.getElementById("edit-user-pass").value = user.password || "";

  // Reset checkboxes based on current permissions
  document.getElementById("edit-user-perm-l1").checked =
    user.permissions.includes("l1");
  document.getElementById("edit-user-perm-l2").checked =
    user.permissions.includes("l2");
  document.getElementById("edit-user-perm-l3").checked =
    user.permissions.includes("l3");
  document.getElementById("edit-user-perm-picker").checked =
    user.permissions.includes("l4_picker");
  document.getElementById("edit-user-perm-scrapper").checked =
    user.permissions.includes("l4_scrapper");
  document.getElementById("edit-user-perm-inspect").checked =
    user.permissions.includes("onsite_inspect");

  // Account status block check
  document.getElementById("edit-user-blocked").checked = !user.is_active;

  document.getElementById("edit-user-modal").style.display = "flex";
}

function closeEditUserModal() {
  document.getElementById("edit-user-modal").style.display = "none";
  currentEditingUserId = null;
}

async function saveUserDetails() {
  if (!currentEditingUserId) return;
  const name = document.getElementById("edit-user-name").value.trim();
  const email = document.getElementById("edit-user-email").value.trim();
  const phone = document.getElementById("edit-user-phone").value.trim();
  const pass = document.getElementById("edit-user-pass").value.trim();

  if (!name || !email || !phone || !pass) {
    alert("Please fill out all credentials.");
    return;
  }

  const users = Api.getUsers();
  const idx = users.findIndex((u) => u.id === currentEditingUserId);
  if (idx !== -1) {
    const user = users[idx];

    // Permissions
    const newPerms = [];
    if (document.getElementById("edit-user-perm-l1").checked)
      newPerms.push("l1");
    if (document.getElementById("edit-user-perm-l2").checked)
      newPerms.push("l2");
    if (document.getElementById("edit-user-perm-l3").checked)
      newPerms.push("l3");
    if (document.getElementById("edit-user-perm-picker").checked)
      newPerms.push("l4_picker");
    if (document.getElementById("edit-user-perm-scrapper").checked)
      newPerms.push("l4_scrapper");
    if (document.getElementById("edit-user-perm-inspect").checked)
      newPerms.push("onsite_inspect");

    // Blocked status
    const isBlocked = document.getElementById("edit-user-blocked").checked;

    // Save
    users[idx].name = name;
    users[idx].email = email;
    users[idx].phone = phone;
    users[idx].password = pass;
    users[idx].permissions = newPerms;
    users[idx].is_active = !isBlocked;

    await Api.saveUsers(users);
    await Api.logAction(
      Auth.getCurrentUser().id,
      "USER_UPDATED",
      "users",
      currentEditingUserId,
      null,
      JSON.stringify(users[idx]),
    );
    Utils.showAlert(`Staff details updated for ${name}`, "success");

    closeEditUserModal();
    loadUsersPanel();
  }
}

// User Modal
function openNewUserModal() {
  document.getElementById("new-user-name").value = "";
  document.getElementById("new-user-email").value = "";
  document.getElementById("new-user-phone").value = "";
  document.getElementById("new-user-pass").value = "";
  document
    .querySelectorAll('#user-modal input[type="checkbox"]')
    .forEach((cb) => (cb.checked = false));
  document.getElementById("user-modal").style.display = "flex";
}
function closeNewUserModal() {
  document.getElementById("user-modal").style.display = "none";
}
async function handleCreateUser() {
  const name = document.getElementById("new-user-name").value.trim();
  const email = document.getElementById("new-user-email").value.trim();
  const phone = document.getElementById("new-user-phone").value.trim();
  const pass = document.getElementById("new-user-pass").value.trim();
  if (!name || !email || !phone || !pass) {
    alert("Please fill out all credentials.");
    return;
  }
  const permissions = [];
  if (document.getElementById("perm-l1").checked) permissions.push("l1");
  if (document.getElementById("perm-l2").checked) permissions.push("l2");
  if (document.getElementById("perm-l3").checked) permissions.push("l3");
  if (document.getElementById("perm-picker").checked)
    permissions.push("l4_picker");
  if (document.getElementById("perm-scrapper").checked)
    permissions.push("l4_scrapper");
  if (document.getElementById("perm-inspect").checked)
    permissions.push("onsite_inspect");
  const users = Api.getUsers();
  const newUser = {
    id: "usr-" + Math.floor(1000 + Math.random() * 9000),
    name,
    email,
    phone,
    password: pass,
    permissions,
    is_super_admin: false,
    is_active: true,
  };
  users.push(newUser);
  await Api.saveUsers(users);
  await Api.logAction(
    Auth.getCurrentUser().id,
    "USER_ENROLLED",
    "users",
    newUser.id,
    null,
    JSON.stringify(newUser),
  );
  Utils.showAlert(`Staff member ${name} enrolled successfully!`, "success");
  closeNewUserModal();
  loadUsersPanel();
}

// ──────────────────────────────────────────────
// AUDIT LOG PANEL
// ──────────────────────────────────────────────
function loadAuditPanel() {
  const tbody = document.getElementById("audit-table-body");
  tbody.innerHTML = "";
  const logs = Api.getAuditLogs();

  if (logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty-state">No audit logs recorded.</td></tr>';
    document.getElementById("pagination-audit").style.display = "none";
    return;
  }

  // Pagination logic
  const pageSize = 10;
  const currentPage = pagesState.audit || 1;
  const totalItems = logs.length;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginated = logs.slice(start, end);

  paginated.forEach((l) => {
    const userName = getAgentName(l.userId);
    const tr = document.createElement("tr");

    // Attempt to parse newVal as JSON if it looks like a JSON object/array
    let parsedNew = null;
    if (typeof l.newVal === 'string' && (l.newVal.startsWith('{') || l.newVal.startsWith('['))) {
      try {
        parsedNew = JSON.parse(l.newVal);
      } catch (e) {
        parsedNew = null;
      }
    }

    // Helper to format permissions
    const formatPerms = (perms) => {
      if (!perms || perms.length === 0) return 'None';
      const mapping = {
        l1: 'L1 Agent',
        l2: 'L2 Manager',
        l3: 'L3 Payments',
        l4_picker: 'L4 Picker',
        l4_scrapper: 'L4 Scrapper',
        onsite_inspect: 'Onsite Inspector',
        super_admin: 'Super Admin'
      };
      return perms.map(p => mapping[p] || p).join(', ');
    };

    // Helper to get string value safely
    const getStringValue = (val, parsed) => {
      if (!val) return '';
      if (parsed && parsed.value !== undefined) return parsed.value;
      if (parsed && typeof parsed === 'object') return ''; // don't show full JSON objects
      return val;
    };

    let detail = '';
    const action = l.action || '';

    if (action === 'USER_ENROLLED') {
      if (parsedNew) {
        detail = `Enrolled staff member: <strong>${parsedNew.name}</strong> (${parsedNew.email}) &bull; Roles: [${formatPerms(parsedNew.permissions)}]`;
      } else {
        detail = `Enrolled staff member: ${l.newVal}`;
      }
    } else if (action === 'USER_UPDATED') {
      if (parsedNew) {
        const activeText = parsedNew.is_active ? 'Active' : 'Blocked';
        detail = `Updated staff member: <strong>${parsedNew.name}</strong> (${parsedNew.email}) &bull; Roles: [${formatPerms(parsedNew.permissions)}] &bull; Status: ${activeText}`;
      } else {
        detail = `Updated staff member: ${l.newVal}`;
      }
    } else if (action === 'LEAD_CREATED') {
      if (parsedNew) {
        detail = `Registered vehicle <strong>${parsedNew.vehicle_number || parsedNew.vehicleNumber || ''}</strong> (${parsedNew.make || ''} ${parsedNew.model || ''}) &bull; Owner: ${parsedNew.owner_name || parsedNew.ownerName || ''}`;
      } else {
        detail = `Created lead: ${l.newVal}`;
      }
    } else if (action === 'LEAD_ASSIGNED' || action === 'L1_AGENT_ASSIGNED') {
      if (parsedNew && typeof parsedNew === 'object' && !parsedNew.value) {
        const agentName = getAgentName(parsedNew.assigned_to || parsedNew.assignedTo);
        detail = `Assigned L1 Agent: <strong>${agentName}</strong>`;
      } else {
        const displayVal = getStringValue(l.newVal, parsedNew);
        detail = `Assigned L1 Agent: <strong>${displayVal}</strong>`;
      }
    } else if (action === 'PICKER_ASSIGNED' || action === 'L4_PICKER_ASSIGNED') {
      if (parsedNew && typeof parsedNew === 'object' && !parsedNew.value) {
        const pickerName = getAgentName(parsedNew.assigned_picker || parsedNew.assignedPicker);
        detail = `Assigned Picker: <strong>${pickerName}</strong>`;
      } else {
        const displayVal = getStringValue(l.newVal, parsedNew);
        detail = `Assigned Picker: <strong>${displayVal}</strong>`;
      }
    } else if (action === 'L1_SUBMITTED' || action === 'VALUATION_SUBMITTED') {
      if (parsedNew) {
        const l1 = parsedNew.l1_details || parsedNew.l1Details || parsedNew;
        const agreed = l1 ? (l1.agreed_price || l1.agreedPrice || l1.offered_price || l1.offeredPrice || l1.recommended_price || l1.recommendedPrice) : null;
        const priceText = agreed ? ` &bull; Agreed Price: <strong>${Utils.formatCurrency(agreed)}</strong>` : '';
        const kms = parsedNew.kms_driven || parsedNew.kmsDriven || (l1 && (l1.kmsDriven || l1.kms_driven)) || '—';
        detail = `L1 physical valuation details submitted &bull; Odometer: <strong>${kms} KMs</strong>${priceText}`;
      } else {
        detail = `L1 valuation details submitted: ${l.newVal || ''}`;
      }
    } else if (action.startsWith('L2_')) {
      const status = action.replace('L2_', '').toLowerCase();
      const statusLabels = {
        approved: '<span class="status-badge approved">Approved</span>',
        rejected: '<span class="status-badge rejected">Rejected</span>',
        info_needed: '<span class="status-badge info_needed">Info Needed</span>'
      };
      const l2 = parsedNew ? (parsedNew.l2_details || parsedNew.l2Details) : null;
      const comment = l2 ? (l2.manager_remarks || l2.managerRemarks) : '';
      const commentText = comment ? ` &bull; Remarks: "<em>${comment}</em>"` : '';
      detail = `L2 Manager marked as ${statusLabels[status] || status}${commentText}`;
    } else if (action.startsWith('L3_') || action === 'PAYMENT_INITIATED' || action === 'PAYMENT_CONFIRMED') {
      let status = action.replace('L3_', '').toLowerCase();
      if (status === 'payment_initiated') status = 'payment_initiated';
      if (status === 'payment_confirmed') status = 'payment_confirmed';
      
      const statusLabels = {
        payment_initiated: '<span class="status-badge payment_initiated">Payment Initiated</span>',
        payment_confirmed: '<span class="status-badge approved">Payment Confirmed</span>'
      };
      let utrText = '';
      const l3 = parsedNew ? (parsedNew.l3_details || parsedNew.l3Details || parsedNew) : null;
      if (l3) {
        const utr = l3.utr_number || l3.utrNumber || (l3.paymentDetails && (l3.paymentDetails.utrNumber || l3.paymentDetails.utr_number)) || (l3.payment_details && (l3.payment_details.utrNumber || l3.payment_details.utr_number));
        if (utr) {
          utrText = ` &bull; UTR: <code>${utr}</code>`;
        } else {
          const displayVal = getStringValue(l.newVal, parsedNew);
          if (displayVal && displayVal.includes('UTR:')) {
            utrText = ` &bull; <code>${displayVal}</code>`;
          }
        }
      }
      detail = `L3 Finance marked as ${statusLabels[status] || status}${utrText}`;
    } else if (action.startsWith('L4_') || action === 'VEHICLE_PICKED_UP' || action === 'VEHICLE_SCRAPPED') {
      let status = action.replace('L4_', '').toLowerCase();
      if (status === 'vehicle_picked_up') status = 'picked_up';
      if (status === 'vehicle_scrapped') status = 'scrapped';
      
      const statusLabels = {
        picked_up: '<span class="status-badge new">Picked Up</span>',
        scrapped: '<span class="status-badge scrapped">Scrapped</span>'
      };
      
      let extraText = '';
      if (parsedNew && typeof parsedNew === 'object' && !parsedNew.value) {
        const l4 = parsedNew.l4_details || parsedNew.l4Details || parsedNew;
        const scrap = l4.scrapDetails || l4.scrap_details || {};
        const pickup = l4.pickupDetails || l4.pickup_details || {};
        
        if (status === 'scrapped') {
          const weight = scrap.weightKg || scrap.weight_kg || '—';
          const val = scrap.scrapValue || scrap.scrap_value || 0;
          extraText = ` &bull; Weight: <strong>${weight}kg</strong> &bull; Value: <strong>${Utils.formatCurrency(val)}</strong>`;
        } else if (status === 'picked_up') {
          const proof = pickup.proofPhoto || pickup.proof_photo || 'None';
          extraText = ` &bull; Proof: <strong>${proof}</strong>`;
        }
      } else {
        const valStr = getStringValue(l.newVal, parsedNew);
        if (valStr) extraText = ` — ${valStr}`;
      }
      detail = `L4 Yard marked as ${statusLabels[status] || status}${extraText}`;
    } else {
      // Fallback
      const cleanAction = action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const valStr = getStringValue(l.newVal, parsedNew);
      detail = `<strong>${cleanAction}</strong>${valStr ? ' — ' + valStr : ''}`;
    }

    const diffHtml = formatAuditDiff(l.oldVal, l.newVal);
    const hasDiff = diffHtml && !diffHtml.includes('No detail changes logged');

    let detailAndDiff = `<div>${detail}</div>`;
    if (hasDiff) {
      const uniqueId = `audit-diff-${l.id}`;
      detailAndDiff += `
        <button class="action-btn" onclick="toggleAuditDiff('${uniqueId}', event)" style="margin-top: 6px; font-size: 10px; padding: 2px 6px; height: auto; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;" class="chevron-icon"><path d="m6 9 6 6 6-6"/></svg>
          Inspect Changes
        </button>
        <div id="${uniqueId}" style="display: none; border-top: 1px dashed var(--border-color); margin-top: 8px; padding-top: 6px;">
          ${diffHtml}
        </div>
      `;
    }

    tr.innerHTML = `
      <td style="color:var(--text-secondary); font-size:12px;">${new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
      <td style="font-weight:500;">${userName}</td>
      <td>${detailAndDiff}</td>
      <td style="font-family:monospace; font-size:12px; color:var(--text-secondary);">${l.entityId || "—"}</td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(
    "pagination-audit",
    totalItems,
    pageSize,
    currentPage,
    (newPage) => {
      pagesState.audit = newPage;
      loadAuditPanel();
    },
  );
}

window.toggleAuditDiff = function(id, event) {
  event.stopPropagation();
  const el = document.getElementById(id);
  if (el) {
    const isHidden = el.style.display === "none";
    el.style.display = isHidden ? "block" : "none";
    
    const button = event.currentTarget;
    if (isHidden) {
      button.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(180deg); transition: transform 0.2s;" class="chevron-icon"><path d="m6 9 6 6 6-6"/></svg> Hide Changes`;
    } else {
      button.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(0deg); transition: transform 0.2s;" class="chevron-icon"><path d="m6 9 6 6 6-6"/></svg> Inspect Changes`;
    }
  }
};

function formatAuditDiff(oldVal, newVal) {
  let oldObj = null;
  let newObj = null;

  try {
    if (oldVal && typeof oldVal === 'string') oldObj = JSON.parse(oldVal);
    else if (oldVal && typeof oldVal === 'object') oldObj = oldVal;
  } catch (e) {}

  try {
    if (newVal && typeof newVal === 'string') newObj = JSON.parse(newVal);
    else if (newVal && typeof newVal === 'object') newObj = newVal;
  } catch (e) {}

  const keysToSkip = [
    'password_hash',
    'password',
    'created_at',
    'id',
    'token',
    'assigned_to',
    'submitted_by',
    'l1_details',
    'l2_details',
    'l3_details',
    'l4_details'
  ];

  const formatValue = (v) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length > 0 ? `[${v.join(', ')}]` : 'None';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  };

  // If both are objects, compute and format diff
  if (oldObj && newObj && typeof oldObj === 'object' && typeof newObj === 'object') {
    const diffs = [];
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      if (keysToSkip.includes(key)) continue;

      const oldRaw = oldObj[key];
      const newRaw = newObj[key];

      const oldValStr = formatValue(oldRaw);
      const newValStr = formatValue(newRaw);

      if (oldValStr !== newValStr) {
        const prettyKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (oldRaw === undefined) {
          diffs.push(`<li><span class="diff-key">${prettyKey}:</span> <span class="diff-added">+ ${newValStr}</span></li>`);
        } else if (newRaw === undefined) {
          diffs.push(`<li><span class="diff-key">${prettyKey}:</span> <span class="diff-removed">- ${oldValStr}</span></li>`);
        } else {
          diffs.push(`<li><span class="diff-key">${prettyKey}:</span> <span class="diff-changed">${oldValStr} ➔ ${newValStr}</span></li>`);
        }
      }
    }

    if (diffs.length > 0) {
      return `<ul class="audit-diff-list">${diffs.join('')}</ul>`;
    }
  }

  // Fallback: If only newVal is present (creation/enrolment)
  if (newObj && typeof newObj === 'object') {
    const details = [];
    for (const [key, val] of Object.entries(newObj)) {
      if (keysToSkip.includes(key)) continue;
      const prettyKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const valStr = formatValue(val);
      if (valStr !== undefined && valStr !== '—' && valStr !== '') {
        details.push(`<li><span class="diff-key">${prettyKey}:</span> <span>${valStr}</span></li>`);
      }
    }
    if (details.length > 0) {
      return `<ul class="audit-diff-list">${details.join('')}</ul>`;
    }
  }

  // Fallback if raw text
  if (typeof newVal === 'string' && newVal.trim() !== '') {
    if (!(newVal.startsWith('{') || newVal.startsWith('['))) {
      return `<div class="audit-diff-text">${newVal}</div>`;
    }
  }
  return '<div style="color:var(--text-secondary); font-size:11px; padding: 2px 0;">No detail changes logged.</div>';
}

// ──────────────────────────────────────────────
// SIDEBAR BADGE REFRESH
// ──────────────────────────────────────────────
function refreshSidebarBadges() {
  const user = Auth.getCurrentUser();
  if (user) renderSidebarMenu(user);
  // Re-highlight active tab
  const activeNav = document.getElementById(`nav-${activeTab}`);
  if (activeNav) activeNav.classList.add("active");
}

// ──────────────────────────────────────────────
// NOTIFICATIONS
// ──────────────────────────────────────────────
function loadNotificationsCount() {
  const user = Auth.getCurrentUser();
  if (!user) return;
  const list = Api.getNotifications(user.id);
  const unread = list.filter((n) => !n.isRead);
  const dot = document.getElementById("notification-dot");
  if (dot) dot.style.display = unread.length > 0 ? "block" : "none";

  const box = document.getElementById("notification-list-box");
  box.innerHTML = "";
  if (list.length === 0) {
    box.innerHTML =
      '<div style="text-align:center; padding:16px; color:var(--text-secondary); font-size:0.8rem;">No notifications.</div>';
    return;
  }
  list.slice(0, 5).forEach((n) => {
    const item = document.createElement("div");
    item.className = "ntf-item";
    item.style.backgroundColor = n.isRead
      ? "transparent"
      : "var(--primary-container)";
    item.style.cursor = "pointer";
    item.innerText = n.message;
    item.onclick = () => {
      n.isRead = true;
      const allNtfs =
        JSON.parse(localStorage.getItem("rvsf_notifications")) || [];
      const idx = allNtfs.findIndex((x) => x.id === n.id);
      if (idx !== -1) {
        allNtfs[idx].isRead = true;
        localStorage.setItem("rvsf_notifications", JSON.stringify(allNtfs));
      }
      loadNotificationsCount();

      const dd = document.getElementById("notification-dropdown");
      if (dd) dd.style.display = "none";

      if (n.leadId) {
        viewLeadFromOverview(n.leadId);
      }
    };
    box.appendChild(item);
  });
}

function toggleNtfDropdown(event) {
  event.stopPropagation();
  const dd = document.getElementById("notification-dropdown");
  const isVisible = dd.style.display === "block";
  dd.style.display = "none";
  if (!isVisible) {
    dd.style.display = "block";
    const closeListener = () => {
      dd.style.display = "none";
      document.removeEventListener("click", closeListener);
    };
    document.addEventListener("click", closeListener);
  }
}

// ──────────────────────────────────────────────
// MEDIA LIGHTBOX
// ──────────────────────────────────────────────
function openMediaLightbox(label, type) {
  document.getElementById("lightbox-title").innerText = label;
  document.getElementById("lightbox-label").innerText =
    label.toLowerCase().replace(/ /g, "_") +
    (type === "Vehicle Photo" ? ".jpg" : ".pdf");
  document.getElementById("lightbox-type").innerText = type;
  const icon = document.getElementById("lightbox-icon");
  if (type === "Vehicle Photo") {
    icon.innerHTML =
      '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>';
    icon.style.stroke = "var(--primary-color)";
  } else {
    icon.innerHTML =
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>';
    icon.style.stroke = "var(--success-color)";
  }
  document.getElementById("lightbox-modal").style.display = "flex";
}

function closeMediaLightbox() {
  document.getElementById("lightbox-modal").style.display = "none";
}

function mockDownloadFile() {
  const fileName = document.getElementById("lightbox-label").innerText;
  Utils.showAlert(`Downloading document ${fileName}...`, "success");
  closeMediaLightbox();
}

async function copyToClipboard(text, fieldName) {
  if (!text || text === "—" || text === "-") {
    Utils.showAlert("No value to copy", "info");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    Utils.showAlert(`${fieldName} copied to clipboard!`, "success");
  } catch (err) {
    console.error("Failed to copy: ", err);
    Utils.showAlert("Failed to copy text", "error");
  }
}

function openEditVahanDialog() {
  if (!selectedL2LeadId) return;
  const lead = Api.getLeadById(selectedL2LeadId);
  if (!lead) return;

  let vahan = lead.vahanDetails;
  if (!vahan) {
    vahan = Api.mockVahanCheck(lead.vehicleNumber);
  }

  // Strip "Valid to" prefix from fitness value if present to clean it up for editing
  let fitnessVal = vahan.fitnessUpto || "";
  if (fitnessVal.toLowerCase().startsWith("valid to ")) {
    fitnessVal = fitnessVal.substring(9).trim();
  } else if (fitnessVal.toLowerCase().startsWith("valid to")) {
    fitnessVal = fitnessVal.substring(8).trim();
  }

  document.getElementById("edit-vahan-fitness").value = fitnessVal;
  document.getElementById("edit-vahan-hp").value = vahan.hypothecation || "";
  document.getElementById("edit-vahan-challans").value =
    vahan.challansCount !== undefined ? vahan.challansCount : 0;
  document.getElementById("edit-vahan-blacklist").value =
    vahan.blacklistStatus || "Clean";

  document.getElementById("edit-vahan-modal").style.display = "flex";
}

function closeEditVahanDialog() {
  document.getElementById("edit-vahan-modal").style.display = "none";
}

async function handleSaveVahanDetails() {
  if (!selectedL2LeadId) return;
  const fitness = document.getElementById("edit-vahan-fitness").value.trim();
  const hp = document.getElementById("edit-vahan-hp").value.trim();
  const challans =
    parseInt(document.getElementById("edit-vahan-challans").value) || 0;
  const blacklist = document
    .getElementById("edit-vahan-blacklist")
    .value.trim();

  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === selectedL2LeadId);
  if (idx !== -1) {
    leads[idx].vahanDetails = {
      vehicleNumber: leads[idx].vehicleNumber,
      fitnessUpto: fitness,
      hypothecation: hp,
      challansCount: challans,
      blacklistStatus: blacklist,
      checkedAt: new Date().toISOString(),
    };
    await Api.saveLeads(leads);

    // Log audit trail
    const user = Auth.getCurrentUser();
    await Api.logAction(
      user.id,
      "VAHAN_DETAILS_UPDATE",
      "leads",
      selectedL2LeadId,
      null,
      `Updated Vahan details manually`,
    );

    Utils.showAlert(
      "Vahan Verification details updated successfully!",
      "success",
    );
  }

  closeEditVahanDialog();
  // Refresh detail view
  selectL2Lead(selectedL2LeadId);
}

// ──────────────────────────────────────────────
// L2 EDIT REQUEST DETAILS
// ──────────────────────────────────────────────
let activeEditSection = "";

function openEditL2Section(sectionName) {
  if (!selectedL2LeadId) return;
  const lead = Api.getLeadById(selectedL2LeadId);
  if (!lead) return;

  activeEditSection = sectionName;
  const l1 = lead.l1Details || {};

  // Update modal title dynamically
  const titles = {
    owner: "Edit Owner Details",
    specs: "Edit Vehicle Specifications",
    condition: "Edit Condition & Accessories",
    pricing: "Edit Pricing Valuation",
    kyc: "Edit KYC Documents",
    media: "Edit Media Uploads",
    payment: "Edit Payment Coordinates",
  };
  document.getElementById("edit-l2-modal-title").innerText =
    titles[sectionName] || "Edit Request Details";

  // Toggle visibility of sections in modal
  const sections = [
    "owner",
    "specs",
    "condition",
    "pricing",
    "kyc",
    "media",
    "payment",
  ];
  sections.forEach((sec) => {
    document.getElementById(`edit-l2-section-${sec}`).style.display =
      sec === sectionName ? "block" : "none";
  });

  // 1. Owner info
  document.getElementById("edit-l2-owner-name").value = lead.ownerName || "";
  document.getElementById("edit-l2-owner-phone").value = lead.phone || "";
  document.getElementById("edit-l2-owner-email").value =
    lead.email || l1.ownerEmail || "";
  document.getElementById("edit-l2-owner-address").value =
    lead.address || l1.ownerAddress || "";

  // 2. Vehicle specs
  document.getElementById("edit-l2-make").value = lead.make || "";
  document.getElementById("edit-l2-model").value = lead.model || "";
  document.getElementById("edit-l2-year").value = lead.year || l1.year || "";
  document.getElementById("edit-l2-colour").value =
    lead.colour || l1.colour || "";
  document.getElementById("edit-l2-fuel").value =
    lead.fuelType || l1.fuelType || "Petrol";
  document.getElementById("edit-l2-kms").value =
    lead.kmsDriven !== undefined && lead.kmsDriven !== null
      ? lead.kmsDriven
      : l1.kmsDriven || "";
  document.getElementById("edit-l2-reg-no").value = lead.vehicleNumber || "";
  document.getElementById("edit-l2-chassis").value = l1.chassisNumber || "";

  // 3. Condition ratings
  document.getElementById("edit-l2-cond-body").value =
    l1.bodyCondition || lead.bodyCondition || "";
  document.getElementById("edit-l2-cond-engine").value =
    l1.engineCondition || "";
  document.getElementById("edit-l2-cond-tyre").value = l1.tyreCondition || "";
  document.getElementById("edit-l2-accident").value = l1.accidentHistory || "";

  // 4. Options checkboxes
  const accessoriesList = {
    battery: "Battery",
    ac: "AC",
    music: "Music System",
    airbags: "Airbags",
    sunroof: "Sunroof",
    spare: "Spare Tyre",
    jack: "Jack & Tools",
    lock: "Central Locking",
  };

  Object.entries(accessoriesList).forEach(([key, accName]) => {
    const isPresent =
      (lead.optionsPresent && lead.optionsPresent.includes(accName)) ||
      (l1.missingParts && !l1.missingParts.includes(accName));
    document.getElementById(`edit-l2-opt-${key}`).checked = !!isPresent;
  });

  // 5. Pricing
  document.getElementById("edit-l2-price-expected").value =
    lead.expectedPrice || "";
  document.getElementById("edit-l2-price-recommended").value =
    l1.recommendedPrice || "";
  document.getElementById("edit-l2-price-agreed").value =
    l1.agreedPrice || l1.offeredPrice || l1.recommendedPrice || lead.expectedPrice || "";

  // 6. Payment method coordinates
  const payMode = l1.paymentMode || "upi";
  document.getElementById("edit-l2-pay-mode").value = payMode;

  const payDetails = l1.paymentDetails || {};
  document.getElementById("edit-l2-pay-upi").value = payDetails.upiId || "";

  const bankDetails = l1.bankDetails || {};
  document.getElementById("edit-l2-pay-holder").value =
    bankDetails.accountHolder || "";
  document.getElementById("edit-l2-pay-bankname").value =
    bankDetails.bankName || "";
  document.getElementById("edit-l2-pay-account").value =
    bankDetails.accountNumber || "";
  document.getElementById("edit-l2-pay-ifsc").value =
    bankDetails.ifscCode || "";

  // 7. KYC Files
  const kycDocs = l1.documents || {};
  document.getElementById("edit-l2-kyc-rcfront").value = kycDocs.rcFront || "";
  document.getElementById("edit-l2-kyc-rcback").value = kycDocs.rcBack || "";
  document.getElementById("edit-l2-kyc-aadhar").value = kycDocs.aadhar || "";
  document.getElementById("edit-l2-kyc-pan").value = kycDocs.pan || "";
  document.getElementById("edit-l2-kyc-insurance").value =
    kycDocs.insurance || "";
  document.getElementById("edit-l2-kyc-noc").value = kycDocs.noc || "";
  document.getElementById("edit-l2-kyc-form35").value = kycDocs.form35 || "";

  updateEditL2Thumbnail("kyc-rcfront", kycDocs.rcFront);
  updateEditL2Thumbnail("kyc-rcback", kycDocs.rcBack);
  updateEditL2Thumbnail("kyc-aadhar", kycDocs.aadhar);
  updateEditL2Thumbnail("kyc-pan", kycDocs.pan);
  updateEditL2Thumbnail("kyc-insurance", kycDocs.insurance);
  updateEditL2Thumbnail("kyc-noc", kycDocs.noc);
  updateEditL2Thumbnail("kyc-form35", kycDocs.form35);

  // 8. Media Files
  const mediaFiles = l1.media || {};
  document.getElementById("edit-l2-media-extfront").value =
    mediaFiles.extFront || "";
  document.getElementById("edit-l2-media-extrear").value =
    mediaFiles.extRear || "";
  document.getElementById("edit-l2-media-extleft").value =
    mediaFiles.extLeft || "";
  document.getElementById("edit-l2-media-extright").value =
    mediaFiles.extRight || "";
  document.getElementById("edit-l2-media-interior").value =
    mediaFiles.interior || "";
  document.getElementById("edit-l2-media-engine").value =
    mediaFiles.engine || "";
  document.getElementById("edit-l2-media-odometer").value =
    mediaFiles.odometer || "";
  document.getElementById("edit-l2-media-damage").value =
    mediaFiles.damage || "";
  document.getElementById("edit-l2-media-walkaround").value =
    mediaFiles.walkaround || mediaFiles.video || "";

  updateEditL2Thumbnail("media-extfront", mediaFiles.extFront);
  updateEditL2Thumbnail("media-extrear", mediaFiles.extRear);
  updateEditL2Thumbnail("media-extleft", mediaFiles.extLeft);
  updateEditL2Thumbnail("media-extright", mediaFiles.extRight);
  updateEditL2Thumbnail("media-interior", mediaFiles.interior);
  updateEditL2Thumbnail("media-engine", mediaFiles.engine);
  updateEditL2Thumbnail("media-odometer", mediaFiles.odometer);
  updateEditL2Thumbnail("media-damage", mediaFiles.damage);
  updateEditL2Thumbnail(
    "media-walkaround",
    mediaFiles.walkaround || mediaFiles.video,
  );

  toggleEditL2PaymentFields();

  document.getElementById("edit-l2-request-modal").style.display = "flex";
}

function closeEditL2RequestDialog() {
  document.getElementById("edit-l2-request-modal").style.display = "none";
}

function updateEditL2Thumbnail(id, fileName, fileObject = null) {
  const img = document.getElementById(`prev-img-${id}`);
  const icon = document.getElementById(`prev-icon-${id}`);
  if (!img || !icon) return;

  if (fileName) {
    let src = "";
    if (fileObject) {
      src = URL.createObjectURL(fileObject);
    } else {
      src = getFileUrl(fileName);
    }

    // Check if filename is an image or video
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
    if (isImage) {
      img.src = src;
      img.style.display = "block";
      icon.style.display = "none";
    } else {
      img.style.display = "none";
      icon.style.display = "block";
    }
  } else {
    img.style.display = "none";
    icon.style.display = "block";
  }
}

function handleL2FileSelected(event, id) {
  const file = event.target.files[0];
  if (!file) return;
  document.getElementById(`edit-l2-${id}`).value = file.name;
  updateEditL2Thumbnail(id, file.name, file);
}

function toggleEditL2PaymentFields() {
  const mode = document.getElementById("edit-l2-pay-mode").value;
  const upiBox = document.getElementById("edit-l2-pay-upi-box");
  const bankBox = document.getElementById("edit-l2-pay-bank-box");

  if (mode === "upi") {
    upiBox.style.display = "block";
    bankBox.style.display = "none";
  } else if (mode === "bank") {
    upiBox.style.display = "none";
    bankBox.style.display = "flex";
  } else {
    upiBox.style.display = "none";
    bankBox.style.display = "none";
  }
}

async function handleSaveL2RequestDetails() {
  if (!selectedL2LeadId) return;

  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === selectedL2LeadId);
  if (idx === -1) return;

  const originalLead = leads[idx];
  if (!originalLead.l1Details) {
    originalLead.l1Details = {};
  }
  const l1 = originalLead.l1Details;

  // 1. Save Owner Details
  if (activeEditSection === "owner") {
    originalLead.ownerName = document
      .getElementById("edit-l2-owner-name")
      .value.trim();
    originalLead.phone = document
      .getElementById("edit-l2-owner-phone")
      .value.trim();
    originalLead.email = document
      .getElementById("edit-l2-owner-email")
      .value.trim();
    originalLead.address = document
      .getElementById("edit-l2-owner-address")
      .value.trim();

    l1.ownerName = originalLead.ownerName;
    l1.ownerPhone = originalLead.phone;
    l1.ownerEmail = originalLead.email;
    l1.ownerAddress = originalLead.address;
  }

  // 2. Save Vehicle Specifications
  if (activeEditSection === "specs") {
    const regNo = document
      .getElementById("edit-l2-reg-no")
      .value.trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    if (regNo.length < 5) {
      alert("Please enter a valid registration number.");
      return;
    }

    originalLead.make = document.getElementById("edit-l2-make").value.trim();
    originalLead.model = document.getElementById("edit-l2-model").value.trim();
    originalLead.year =
      parseInt(document.getElementById("edit-l2-year").value) || null;
    originalLead.colour = document
      .getElementById("edit-l2-colour")
      .value.trim();
    originalLead.fuelType = document.getElementById("edit-l2-fuel").value;
    originalLead.kmsDriven =
      parseInt(document.getElementById("edit-l2-kms").value) || null;
    originalLead.vehicleNumber = regNo;

    l1.vehicleRegNumber = regNo;
    l1.chassisNumber = document
      .getElementById("edit-l2-chassis")
      .value.trim()
      .toUpperCase();
    l1.make = originalLead.make;
    l1.model = originalLead.model;
    l1.year = originalLead.year;
    l1.colour = originalLead.colour;
    l1.fuelType = originalLead.fuelType;
    l1.kmsDriven = originalLead.kmsDriven;
  }

  // 3. Save Condition & Accessories
  if (activeEditSection === "condition") {
    const bodyCond = parseInt(
      document.getElementById("edit-l2-cond-body").value,
    );
    const engineCond = parseInt(
      document.getElementById("edit-l2-cond-engine").value,
    );
    const tyreCond = parseInt(
      document.getElementById("edit-l2-cond-tyre").value,
    );

    // Validate ratings
    if (
      isNaN(bodyCond) ||
      bodyCond < 1 ||
      bodyCond > 10 ||
      isNaN(engineCond) ||
      engineCond < 1 ||
      engineCond > 10 ||
      isNaN(tyreCond) ||
      tyreCond < 1 ||
      tyreCond > 10
    ) {
      alert("Please enter valid condition ratings between 1 and 10.");
      return;
    }

    // Gather accessories
    const accessoriesList = {
      battery: "Battery",
      ac: "AC",
      music: "Music System",
      airbags: "Airbags",
      sunroof: "Sunroof",
      spare: "Spare Tyre",
      jack: "Jack & Tools",
      lock: "Central Locking",
    };

    const optionsPresent = [];
    const missingParts = [];

    Object.entries(accessoriesList).forEach(([key, accName]) => {
      const isChecked = document.getElementById(`edit-l2-opt-${key}`).checked;
      if (isChecked) {
        optionsPresent.push(accName);
      } else {
        missingParts.push(accName);
      }
    });

    originalLead.bodyCondition = bodyCond;
    originalLead.optionsPresent = optionsPresent;

    l1.bodyCondition = bodyCond;
    l1.engineCondition = engineCond;
    l1.tyreCondition = tyreCond;
    l1.accidentHistory = document
      .getElementById("edit-l2-accident")
      .value.trim();
    l1.missingParts = missingParts;
  }

  // 4. Save Pricing Valuation
  if (activeEditSection === "pricing") {
    originalLead.expectedPrice =
      parseInt(document.getElementById("edit-l2-price-expected").value) || 0;
    l1.expectedPrice = originalLead.expectedPrice;
    l1.recommendedPrice =
      parseInt(document.getElementById("edit-l2-price-recommended").value) || 0;

    const agreedPrice =
      parseInt(document.getElementById("edit-l2-price-agreed").value) || 0;
    l1.agreedPrice = agreedPrice;
    l1.offeredPrice = agreedPrice; // Sync both keys to make sure payout view is correct
  }

  // 5. Save Payment Method & Coordinates
  if (activeEditSection === "payment") {
    const mode = document.getElementById("edit-l2-pay-mode").value;
    l1.paymentMode = mode;

    if (mode === "upi") {
      l1.paymentDetails = {
        upiId: document.getElementById("edit-l2-pay-upi").value.trim(),
      };
      delete l1.bankDetails;
    } else if (mode === "bank") {
      l1.bankDetails = {
        accountHolder: document
          .getElementById("edit-l2-pay-holder")
          .value.trim(),
        bankName: document.getElementById("edit-l2-pay-bankname").value.trim(),
        accountNumber: document
          .getElementById("edit-l2-pay-account")
          .value.trim(),
        ifscCode: document
          .getElementById("edit-l2-pay-ifsc")
          .value.trim()
          .toUpperCase(),
      };
      l1.paymentDetails = { ...l1.bankDetails }; // copy for compatibility in some older reads
    } else {
      delete l1.paymentDetails;
      delete l1.bankDetails;
    }
  }

  // 6. Save KYC Documents
  if (activeEditSection === "kyc") {
    if (!l1.documents) l1.documents = {};
    l1.documents.rcFront = document
      .getElementById("edit-l2-kyc-rcfront")
      .value.trim();
    l1.documents.rcBack = document
      .getElementById("edit-l2-kyc-rcback")
      .value.trim();
    l1.documents.aadhar = document
      .getElementById("edit-l2-kyc-aadhar")
      .value.trim();
    l1.documents.pan = document.getElementById("edit-l2-kyc-pan").value.trim();
    l1.documents.insurance = document
      .getElementById("edit-l2-kyc-insurance")
      .value.trim();
    l1.documents.noc = document.getElementById("edit-l2-kyc-noc").value.trim();
    l1.documents.form35 = document
      .getElementById("edit-l2-kyc-form35")
      .value.trim();
  }

  // 7. Save Media Uploads
  if (activeEditSection === "media") {
    if (!l1.media) l1.media = {};
    l1.media.extFront = document
      .getElementById("edit-l2-media-extfront")
      .value.trim();
    l1.media.extRear = document
      .getElementById("edit-l2-media-extrear")
      .value.trim();
    l1.media.extLeft = document
      .getElementById("edit-l2-media-extleft")
      .value.trim();
    l1.media.extRight = document
      .getElementById("edit-l2-media-extright")
      .value.trim();
    l1.media.interior = document
      .getElementById("edit-l2-media-interior")
      .value.trim();
    l1.media.engine = document
      .getElementById("edit-l2-media-engine")
      .value.trim();
    l1.media.odometer = document
      .getElementById("edit-l2-media-odometer")
      .value.trim();
    l1.media.damage = document
      .getElementById("edit-l2-media-damage")
      .value.trim();
    l1.media.video = document
      .getElementById("edit-l2-media-walkaround")
      .value.trim();

    // Sync with photos array for display compatibility
    l1.photos = Object.values(l1.media).filter(Boolean);
  }

  // Save changes to database
  await Api.saveLeads(leads);

  // Log action
  const user = Auth.getCurrentUser();
  await Api.logAction(
    user.id,
    "L2_REQUEST_EDITED",
    "leads",
    selectedL2LeadId,
    null,
    `L2 Manager edited section: ${activeEditSection} manually`,
  );

  Utils.showAlert("Purchase request details updated successfully!", "success");
  closeEditL2RequestDialog();

  // Refresh active details panel and lists
  selectL2Lead(selectedL2LeadId);
  loadL2Panel();
}

function handleReceiptFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById("payout-receipt-status").innerText = file.name;
  const uploadBtn = document.getElementById("payout-receipt-upload-btn");
  uploadBtn.style.borderColor = "var(--success-color)";
  uploadBtn.style.color = "var(--success-color)";

  // Set the hidden input value so the existing form validation passes
  document.getElementById("payout-receipt").value = file.name;
}

// ──────────────────────────────────────────────
// FINALIZED CARS PANEL
// ──────────────────────────────────────────────
function showFinalizedTableView() {
  selectedFinalizedLeadId = null;
  document.getElementById("finalized-table-view").style.display = "block";
  document.getElementById("finalized-detail-view").style.display = "none";
}

function getFileUrl(file) {
  if (!file) return "#";
  if (
    file.startsWith("http://") ||
    file.startsWith("https://") ||
    file.startsWith("file://")
  ) {
    return file;
  }
  return "../uploads/" + file;
}

function viewFinalizedLead(leadId) {
  selectedFinalizedLeadId = leadId;
  document.getElementById("finalized-table-view").style.display = "none";
  document.getElementById("finalized-detail-view").style.display = "block";

  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  const paymentDetails = lead.paymentDetails || {};
  const vahan = lead.vahanDetails || {};
  const l1 = lead.l1Details || {};

  document.getElementById("fin-car-model").innerText =
    `${lead.make || ""} ${lead.model}`;
  document.getElementById("fin-reg-no").innerText = lead.vehicleNumber;

  const agreedAmount = paymentDetails.amount || lead.expectedPrice;
  document.getElementById("fin-price-paid").innerText =
    Utils.formatCurrency(agreedAmount);

  // Left Information
  document.getElementById("fin-info-model").innerText =
    `${lead.make || ""} ${lead.model}`;
  document.getElementById("fin-info-reg").innerText = lead.vehicleNumber || "-";
  document.getElementById("fin-info-year").innerText =
    lead.year || l1.year || "-";
  document.getElementById("fin-info-fuel").innerText =
    lead.fuelType || l1.fuelType || "-";
  document.getElementById("fin-info-kms").innerText = lead.kmsDriven
    ? lead.kmsDriven.toLocaleString("en-IN")
    : l1.kmsDriven
      ? l1.kmsDriven.toLocaleString("en-IN")
      : "-";
  document.getElementById("fin-info-colour").innerText = lead.colour || l1.colour || "-";
  document.getElementById("fin-info-engine").innerText = l1.engineNumber || "-";
  document.getElementById("fin-info-chassis").innerText =
    l1.chassisNumber || "-";

  // Right Information
  document.getElementById("fin-info-owner").innerText = lead.ownerName || "-";
  document.getElementById("fin-info-phone").innerText = lead.phone || "-";
  document.getElementById("fin-info-email").innerText = lead.email || l1.ownerEmail || "-";
  document.getElementById("fin-info-address").innerText = lead.address || l1.ownerAddress || "-";
  document.getElementById("fin-info-method").innerText =
    l1.paymentMode || "NEFT";
  document.getElementById("fin-info-utr").innerText =
    paymentDetails.utrNumber || "-";
  document.getElementById("fin-info-date").innerText =
    paymentDetails.confirmedAt
      ? new Date(paymentDetails.confirmedAt).toLocaleDateString("en-IN")
      : "-";

  const payMode = l1.paymentMode || "bank";
  const payDetails = l1.paymentDetails || l1.bankDetails || {};
  const payoutRow = document.getElementById("fin-info-payout-details-row");
  const payoutDetails = document.getElementById("fin-info-payout-details");

  if (payoutRow && payoutDetails) {
    if (payMode === "upi") {
      payoutRow.style.display = "flex";
      payoutDetails.innerText = `UPI ID: ${payDetails.upiId || "-"}`;
    } else if (payMode === "bank") {
      payoutRow.style.display = "flex";
      payoutDetails.innerText = `Holder: ${payDetails.accountHolder || lead.ownerName || "-"}\nBank: ${payDetails.bankName || "-"}\nA/C: ${payDetails.accountNumber || "-"}\nIFSC: ${payDetails.ifscCode || "-"}`;
    } else if (payMode === "cash") {
      payoutRow.style.display = "flex";
      payoutDetails.innerText = `Cash Handover Confirmed`;
    } else {
      payoutRow.style.display = "none";
      payoutDetails.innerText = "—";
    }
  }

  // Vahan details
  document.getElementById("fin-vahan-fitness").innerText = (
    vahan.fitnessUpto || ""
  ).startsWith("Valid to")
    ? vahan.fitnessUpto
    : `Valid to ${vahan.fitnessUpto || "-"}`;
  document.getElementById("fin-vahan-hp").innerText =
    vahan.hypothecation || "-";
  document.getElementById("fin-vahan-challans").innerText =
    `${vahan.challansCount !== undefined ? vahan.challansCount : 0} Active`;
  document.getElementById("fin-vahan-blacklist").innerText =
    vahan.blacklistStatus || "Clean";

  // Condition details
  document.getElementById("fin-cond-body").innerText =
    l1.bodyCondition || lead.bodyCondition || "-";
  document.getElementById("fin-cond-engine").innerText =
    l1.engineCondition || "-";
  document.getElementById("fin-cond-tyre").innerText = l1.tyreCondition || "-";
  document.getElementById("fin-cond-accident").innerText =
    l1.accidentHistory || "None logged";

  // Accessories present
  const optionsList = document.getElementById("fin-options-list");
  optionsList.innerHTML = "";
  const options = lead.optionsPresent || l1.optionsPresent || [];
  if (options.length === 0) {
    optionsList.innerHTML =
      '<span style="color:var(--text-secondary); font-size:0.8rem; padding:4px;">No accessories specified.</span>';
  } else {
    options.forEach((opt) => {
      const badge = document.createElement("span");
      badge.style.cssText =
        "background:rgba(14, 165, 233, 0.1); color:var(--primary-color); border:1px solid rgba(14, 165, 233, 0.2); font-size:0.7rem; font-weight:600; padding:4px 8px; border-radius:4px; margin:2px;";
      badge.innerText = opt;
      optionsList.appendChild(badge);
    });
  }

  // KYC list with downloadable / viewable links
  const kycList = document.getElementById("fin-kyc-list");
  kycList.innerHTML = "";
  const docs = l1.documents || {};
  const docLabels = {
    rcFront: "RC Book (Front)",
    rcBack: "RC Book (Back)",
    aadhar: "Aadhar Card",
    pan: "PAN Card",
    insurance: "Insurance",
    noc: "NOC",
    form35: "Form 35",
  };
  let docsCount = 0;
  Object.entries(docLabels).forEach(([key, label]) => {
    const fileVal = docs[key];
    if (fileVal) {
      docsCount++;
      const fileUrl = getFileUrl(fileVal);
      const row = document.createElement("div");
      row.className = "vahan-row";
      row.innerHTML = `<span>${label}</span><strong><a href="${fileUrl}" target="_blank" style="color:var(--primary-color); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">${fileVal} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a></strong>`;
      kycList.appendChild(row);
    }
  });
  if (docsCount === 0) {
    kycList.innerHTML =
      '<div class="vahan-row"><span style="color:var(--text-secondary);">No documents uploaded.</span><strong>—</strong></div>';
  }

  // Media list with links
  const mediaList = document.getElementById("fin-media-list");
  mediaList.innerHTML = "";
  const media = l1.media || {};
  const mediaLabels = {
    extFront: "Exterior Front",
    extRear: "Exterior Rear",
    extLeft: "Exterior Left",
    extRight: "Exterior Right",
    interior: "Interior View",
    engine: "Engine Bay",
    odometer: "Odometer",
    damage: "Damage Spots",
    video: "Walkaround Video",
  };
  let mediaCount = 0;
  Object.entries(mediaLabels).forEach(([key, label]) => {
    const fileVal = media[key];
    if (fileVal) {
      mediaCount++;
      const fileUrl = getFileUrl(fileVal);
      const row = document.createElement("div");
      row.className = "vahan-row";
      row.innerHTML = `<span>${label}</span><strong><a href="${fileUrl}" target="_blank" style="color:var(--primary-color); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">${fileVal} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a></strong>`;
      mediaList.appendChild(row);
    }
  });
  if (mediaCount === 0) {
    mediaList.innerHTML =
      '<div class="vahan-row"><span style="color:var(--text-secondary);">No media files uploaded.</span><strong>—</strong></div>';
  }

  // Picker & Scrapper Box details
  const pickup = lead.pickupDetails || {};
  const scrap = lead.scrapDetails || {};
  const pickerScrapperBox = document.getElementById("fin-picker-scrapper-box");

  if (lead.status === "scrapped" || lead.status === "payment_confirmed" || lead.status === "picked_up") {
    pickerScrapperBox.style.display = "block";

    // Picker details
    const pickerUser = pickup.pickedBy
      ? Api.getUsers().find((u) => u.id === pickup.pickedBy)
      : null;
    const pickerName = pickerUser
      ? pickerUser.name
      : lead.assignedPicker
        ? Api.getUsers().find((u) => u.id === lead.assignedPicker)?.name ||
          lead.assignedPicker
        : "—";
    document.getElementById("fin-pick-name").innerText = pickerName;
    document.getElementById("fin-pick-date").innerText = pickup.pickedUpAt
      ? new Date(pickup.pickedUpAt).toLocaleString("en-IN")
      : "—";

    const proofUrl = getFileUrl(pickup.proofPhoto);
    document.getElementById("fin-pick-proof").innerHTML = pickup.proofPhoto
      ? `<a href="${proofUrl}" target="_blank" style="color:var(--primary-color); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">${pickup.proofPhoto} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`
      : "—";

    const sigRow = document.getElementById("fin-pick-sig-row");
    const sigImg = document.getElementById("fin-pick-sig-img");
    if (sigRow && sigImg) {
      if (pickup.signature) {
        sigRow.style.display = "flex";
        sigImg.src = pickup.signature;
      } else {
        sigRow.style.display = "none";
        sigImg.src = "";
      }
    }

    // Scrapper details
    if (lead.status === "scrapped") {
      document.getElementById("fin-scrapper-subbox").style.display = "block";
      document.getElementById("fin-scrap-weight").innerText = scrap.weightKg
        ? `${scrap.weightKg} kg`
        : "—";
      document.getElementById("fin-scrap-value").innerText = scrap.scrapValue
        ? Utils.formatCurrency(scrap.scrapValue)
        : "—";
      document.getElementById("fin-scrap-salvage").innerText =
        scrap.recoveredSalvage && scrap.recoveredSalvage.length > 0
          ? scrap.recoveredSalvage.join(", ")
          : "None";
    } else {
      document.getElementById("fin-scrapper-subbox").style.display = "none";
    }
  } else {
    pickerScrapperBox.style.display = "none";
  }

  // Status Badge
  const statusBadge = document.getElementById("fin-status-badge");
  statusBadge.className = `status-badge ${lead.status}`;
  statusBadge.innerText = lead.status.toUpperCase().replace("_", " ");

  // Download PDF Action
  document.getElementById("btn-download-pdf").onclick = () =>
    downloadFinalizedVehiclePDF(leadId);
}

function loadFinalizedPanel() {
  const leads = Api.getLeads();
  const searchVal = document
    .getElementById("finalized-search")
    .value.toLowerCase()
    .trim();
  const filterVal = document.getElementById("finalized-filter").value;

  // Filter finalized cars: those that are payment_confirmed, picked_up, or scrapped
  let filtered = leads.filter(
    (l) => l.status === "payment_confirmed" || l.status === "picked_up" || l.status === "scrapped",
  );

  if (filterVal !== "all") {
    filtered = filtered.filter((l) => l.status === filterVal);
  }

  if (searchVal) {
    filtered = filtered.filter(
      (l) =>
        l.vehicleNumber.toLowerCase().includes(searchVal) ||
        (l.ownerName && l.ownerName.toLowerCase().includes(searchVal)),
    );
  }

  const tbody = document.getElementById("finalized-table-body");
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">No finalized cars found.</td></tr>';
    document.getElementById("pagination-finalized").style.display = "none";
    return;
  }

  // Pagination logic
  const pageSize = 10;
  const currentPage = pagesState.finalized || 1;
  const totalItems = filtered.length;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);

  paginated.forEach((lead) => {
    const paymentDetails = lead.paymentDetails || {};
    const agreedAmount = paymentDetails.amount || lead.expectedPrice;

    let statusLabel = "Paid";
    if (lead.status === "picked_up") statusLabel = "Picked Up";
    else if (lead.status === "scrapped") statusLabel = "Scrapped";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:monospace; font-size:12px; color:var(--text-secondary);">#${lead.id.split("-")[1]}</td>
      <td>${lead.ownerName}</td>
      <td>${lead.make || ""} ${lead.model}</td>
      <td style="font-family:monospace; font-weight:600;">${lead.vehicleNumber}</td>
      <td>${Utils.formatCurrency(agreedAmount)}</td>
      <td><span class="status-badge ${lead.status}">${statusLabel}</span></td>
      <td><button class="action-btn" onclick="viewFinalizedLead('${lead.id}')">View</button></td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(
    "pagination-finalized",
    totalItems,
    pageSize,
    currentPage,
    (newPage) => {
      pagesState.finalized = newPage;
      loadFinalizedPanel();
    },
  );
}

function downloadFinalizedVehiclePDF(leadId) {
  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    Utils.showAlert(
      "Popup blocker prevented PDF generation. Please enable popups.",
      "error",
    );
    return;
  }

  const paymentDetails = lead.paymentDetails || {};
  const vahan = lead.vahanDetails || {};
  const l1 = lead.l1Details || {};

  // Extract fields
  const ownerEmail = lead.email || l1.ownerEmail || "—";
  const ownerAddress = lead.address || l1.ownerAddress || "—";
  const engineNumber = l1.engineNumber || "—";
  const colour = lead.colour || l1.colour || "—";

  const condBody = l1.bodyCondition || lead.bodyCondition || "—";
  const condEngine = l1.engineCondition || "—";
  const condTyre = l1.tyreCondition || "—";
  const accidentHist = l1.accidentHistory || "None logged";

  const payMode = l1.paymentMode || "bank";
  const payDetails = l1.paymentDetails || l1.bankDetails || {};
  let payoutHtml = "";
  if (payMode === "upi") {
    payoutHtml = `<div class="row"><span>UPI ID</span><strong>${payDetails.upiId || "—"}</strong></div>`;
  } else if (payMode === "bank") {
    payoutHtml = `
      <div class="row"><span>A/C Holder</span><strong>${payDetails.accountHolder || lead.ownerName || "—"}</strong></div>
      <div class="row"><span>Bank Name</span><strong>${payDetails.bankName || "—"}</strong></div>
      <div class="row"><span>Account No</span><strong>${payDetails.accountNumber || "—"}</strong></div>
      <div class="row"><span>IFSC Code</span><strong>${payDetails.ifscCode || "—"}</strong></div>
    `;
  } else if (payMode === "cash") {
    payoutHtml = `<div class="row"><span>Payout Info</span><strong>Cash Handover Confirmed</strong></div>`;
  }

  // Accessories
  const options = lead.optionsPresent || l1.optionsPresent || [];
  const optionsHtml =
    options.length > 0
      ? options
          .map(
            (opt) =>
              `<span style="display:inline-block; padding:3px 6px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; font-size:11px; font-weight:500; color:#15803d; margin:2px;">${opt}</span>`,
          )
          .join("")
      : '<span style="color:#9ca3af; font-size:12px;">No accessories specified</span>';

  // KYC Links
  const docs = l1.documents || {};
  const docLabels = {
    rcFront: "RC Book (Front)",
    rcBack: "RC Book (Back)",
    aadhar: "Aadhar Card",
    pan: "PAN Card",
    insurance: "Insurance",
    noc: "NOC",
    form35: "Form 35",
  };
  let docLinksHtml = "";
  Object.entries(docLabels).forEach(([key, label]) => {
    const val = docs[key];
    if (val) {
      const url = getFileUrl(val);
      docLinksHtml += `<div class="row"><span>${label}</span><strong><a href="${url}" target="_blank" style="color:#0ea5e9; text-decoration:none; font-weight:500; display:inline-flex; align-items:center; gap:3px;">${val} ↗</a></strong></div>`;
    }
  });
  if (!docLinksHtml)
    docLinksHtml =
      '<div style="color:#9ca3af; font-size:12px; padding:8px 0;">No KYC documents uploaded</div>';

  // Media Links
  const media = l1.media || {};
  const mediaLabels = {
    extFront: "Exterior Front",
    extRear: "Exterior Rear",
    extLeft: "Exterior Left",
    extRight: "Exterior Right",
    interior: "Interior View",
    engine: "Engine Bay",
    odometer: "Odometer",
    damage: "Damage Spots",
    video: "Walkaround Video",
  };
  let mediaLinksHtml = "";
  Object.entries(mediaLabels).forEach(([key, label]) => {
    const val = media[key];
    if (val) {
      const url = getFileUrl(val);
      mediaLinksHtml += `<div class="row"><span>${label}</span><strong><a href="${url}" target="_blank" style="color:#0ea5e9; text-decoration:none; font-weight:500; display:inline-flex; align-items:center; gap:3px;">${val} ↗</a></strong></div>`;
    }
  });
  if (!mediaLinksHtml)
    mediaLinksHtml =
      '<div style="color:#9ca3af; font-size:12px; padding:8px 0;">No media files uploaded</div>';

  // Operations Logs
  let operationsHtml = "";
  if (lead.status === "scrapped" || lead.status === "payment_confirmed" || lead.status === "picked_up") {
    const pickup = lead.pickupDetails || {};
    const scrap = lead.scrapDetails || {};
    const pickerUser = pickup.pickedBy
      ? Api.getUsers().find((u) => u.id === pickup.pickedBy)
      : null;
    const pickerName = pickerUser
      ? pickerUser.name
      : lead.assignedPicker
        ? Api.getUsers().find((u) => u.id === lead.assignedPicker)?.name ||
          lead.assignedPicker
        : "—";
    const pickDate = pickup.pickedUpAt
      ? new Date(pickup.pickedUpAt).toLocaleString("en-IN")
      : "—";
    const pickProof = pickup.proofPhoto
      ? `<a href="${getFileUrl(pickup.proofPhoto)}" target="_blank" style="color:#0ea5e9; text-decoration:none;">${pickup.proofPhoto} ↗</a>`
      : "—";
    const pickSig = pickup.signature
      ? `<img src="${pickup.signature}" alt="Seller Signature" style="max-height:36px; vertical-align:middle; border:1px solid #e5e7eb; border-radius:4px; padding:2px; background:#fff;" />`
      : "—";

    operationsHtml = `
      <div class="card full-width" style="margin-top: 20px;">
        <h3>Collection & Operations Log</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Picker Collection</h4>
            <div class="row"><span>Assigned Picker</span><strong>${pickerName}</strong></div>
            <div class="row"><span>Collection Date</span><strong>${pickDate}</strong></div>
            <div class="row"><span>Handover Proof</span><strong>${pickProof}</strong></div>
            <div class="row"><span>Seller Signature</span><strong>${pickSig}</strong></div>
          </div>
          <div>
            <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Scrapper Dismantling</h4>
            <div class="row"><span>Dry Metal Weight</span><strong>${scrap.weightKg ? scrap.weightKg + " kg" : "—"}</strong></div>
            <div class="row"><span>Scrap Value Realized</span><strong>${scrap.scrapValue ? "₹ " + scrap.scrapValue.toLocaleString("en-IN") : "—"}</strong></div>
            <div class="row"><span>Recovered Salvage</span><strong>${scrap.recoveredSalvage && scrap.recoveredSalvage.length > 0 ? scrap.recoveredSalvage.join(", ") : "None"}</strong></div>
          </div>
        </div>
      </div>
    `;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Vehicle Acquisition Report - ${lead.vehicleNumber}</title>
        <style>
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; margin: 40px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #0f172a; }
          .logo span { color: #0ea5e9; }
          .title { text-align: right; }
          .title h1 { margin: 0; font-size: 20px; color: #0f172a; }
          .title p { margin: 5px 0 0 0; font-size: 12px; color: #6b7280; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #f9fafb; }
          .card h3 { margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; font-size: 14px; text-transform: uppercase; color: #0ea5e9; letter-spacing: 0.5px; }
          
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .row span { color: #6b7280; }
          .row strong { color: #111827; font-weight: 500; }
          
          .full-width { grid-column: span 2; }
          .price-box { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin-top: 15px; }
          .price-box span { font-weight: bold; color: #166534; }
          .price-box strong { font-size: 18px; color: #15803d; }
          
          .footer { text-align: center; margin-top: 50px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo" style="font-size: 15px; letter-spacing: 0.5px;">RVSF | LDR<span>TRADERS</span> - LEAD MANAGEMENT PORTAL</div>
          <div class="title">
            <h1>VEHICLE ACQUISITION REPORT</h1>
            <p>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>
        
        <div class="grid">
          <!-- Specifications -->
          <div class="card">
            <h3>Vehicle Specification</h3>
            <div class="row"><span>Make / Model</span><strong>${lead.make || ""} ${lead.model}</strong></div>
            <div class="row"><span>Year</span><strong>${lead.year || l1.year || "—"}</strong></div>
            <div class="row"><span>Fuel Type</span><strong>${lead.fuelType || l1.fuelType || "—"}</strong></div>
            <div class="row"><span>KMs Driven</span><strong>${lead.kmsDriven ? lead.kmsDriven.toLocaleString("en-IN") : l1.kmsDriven ? l1.kmsDriven.toLocaleString("en-IN") : "—"}</strong></div>
            <div class="row"><span>Reg No.</span><strong>${lead.vehicleNumber}</strong></div>
            <div class="row"><span>Chassis No.</span><strong>${l1.chassisNumber || "—"}</strong></div>
            <div class="row"><span>Engine No.</span><strong>${engineNumber}</strong></div>
            <div class="row"><span>Colour</span><strong>${colour}</strong></div>
          </div>
          
          <!-- Seller Info -->
          <div class="card">
            <h3>Acquisition & Payout Details</h3>
            <div class="row"><span>Seller Name</span><strong>${lead.ownerName || "—"}</strong></div>
            <div class="row"><span>Phone</span><strong>${lead.phone || "—"}</strong></div>
            <div class="row"><span>Email</span><strong>${ownerEmail}</strong></div>
            <div class="row"><span>Address</span><strong>${ownerAddress}</strong></div>
            <div class="row"><span>Payment Method</span><strong>${l1.paymentMode || "NEFT"}</strong></div>
            ${payoutHtml}
            <div class="row"><span>UTR / Ref ID</span><strong>${paymentDetails.utrNumber || "—"}</strong></div>
            <div class="row"><span>Transaction Date</span><strong>${paymentDetails.confirmedAt ? new Date(paymentDetails.confirmedAt).toLocaleDateString("en-IN") : "—"}</strong></div>
            <div class="row"><span>Status</span><strong>${lead.status.toUpperCase().replace("_", " ")}</strong></div>
          </div>

          <!-- Ratings & History -->
          <div class="card">
            <h3>Condition Ratings</h3>
            <div class="row"><span>Body Rating (1-10)</span><strong>${condBody}</strong></div>
            <div class="row"><span>Engine Rating (1-10)</span><strong>${condEngine}</strong></div>
            <div class="row"><span>Tyre Rating (1-10)</span><strong>${condTyre}</strong></div>
            <div class="row" style="flex-direction:column; align-items:flex-start; margin-top:10px;">
              <span style="font-size:11px; margin-bottom:4px;">Accident History Remarks:</span>
              <strong style="font-weight:400; line-height:1.4; color:#374151;">${accidentHist}</strong>
            </div>
          </div>

          <!-- Present Accessories -->
          <div class="card">
            <h3>Accessories Present</h3>
            <div style="margin-top:5px; line-height:1.6;">
              ${optionsHtml}
            </div>
          </div>
          
          <!-- Vahan Details -->
          <div class="card full-width">
            <h3>Vahan Verification & Sign-offs</h3>
            <div class="row"><span>Fitness Validity</span><strong>${vahan.fitnessUpto || "—"}</strong></div>
            <div class="row"><span>Hypothecation (HP)</span><strong>${vahan.hypothecation || "—"}</strong></div>
            <div class="row"><span>Blacklist Check</span><strong>${vahan.blacklistStatus || "—"}</strong></div>
            <div class="row"><span>Challan Records</span><strong>${vahan.challansCount !== undefined ? vahan.challansCount : 0} Active</strong></div>
            
            <div class="price-box">
              <span>Final Acquisition Price:</span>
              <strong>₹ ${paymentDetails.amount ? paymentDetails.amount.toLocaleString("en-IN") : lead.expectedPrice.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </div>
        
        <!-- Page 2 content starts here -->
        <div class="grid" style="page-break-before: always; break-before: page; margin-top: 20px;">
          <!-- Document Links -->
          <div class="card">
            <h3>KYC Documents</h3>
            ${docLinksHtml}
          </div>

          <!-- Media Links -->
          <div class="card">
            <h3>Vehicle Photos & Video</h3>
            ${mediaLinksHtml}
          </div>

          <!-- Operational Logs -->
          ${operationsHtml}
        </div>
        
        <div class="footer">
          This is an official transaction summary generated by RVSF - LDR TRADERS. Secured with 256-bit SSL encryption.
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

// ── Create Lead Modal Helpers (Admin-initiated L1 leads) ──
function openCreateLeadModal() {
  document.getElementById("create-lead-owner-name").value = "";
  document.getElementById("create-lead-phone").value = "";
  document.getElementById("create-lead-alt-phone").value = "";
  document.getElementById("create-lead-address").value = "";
  document.getElementById("create-lead-vehicle-no").value = "";
  document.getElementById("create-lead-make").value = "";
  document.getElementById("create-lead-model").value = "";
  document.getElementById("create-lead-year").value = "";
  document.getElementById("create-lead-colour").value = "";
  document.getElementById("create-lead-fuel").value = "";
  document.getElementById("create-lead-kms").value = "";
  document.getElementById("create-lead-expected").value = "";
  document.getElementById("create-lead-new-car").checked = false;
  
  document.getElementById("create-lead-modal").style.display = "flex";
}

function closeCreateLeadModal() {
  document.getElementById("create-lead-modal").style.display = "none";
}

async function handleCreateLeadSubmit() {
  const ownerName = document.getElementById("create-lead-owner-name").value.trim();
  const phone = document.getElementById("create-lead-phone").value.trim();
  const altPhone = document.getElementById("create-lead-alt-phone").value.trim();
  const address = document.getElementById("create-lead-address").value.trim();
  const vehicleNumber = document.getElementById("create-lead-vehicle-no").value.trim();
  const make = document.getElementById("create-lead-make").value.trim();
  const model = document.getElementById("create-lead-model").value.trim();
  const year = document.getElementById("create-lead-year").value.trim();
  const colour = document.getElementById("create-lead-colour").value.trim();
  const fuelType = document.getElementById("create-lead-fuel").value;
  const kmsDriven = document.getElementById("create-lead-kms").value.trim();
  const expectedPrice = document.getElementById("create-lead-expected").value.trim();
  const wantsNewCar = document.getElementById("create-lead-new-car").checked;

  if (!ownerName || !phone || !vehicleNumber || !make || !model || !year || !fuelType || !kmsDriven || !expectedPrice) {
    alert("Please fill in all required fields (marked with *).");
    return;
  }

  const leadData = {
    ownerName,
    phone,
    altPhone,
    address,
    vehicleNumber,
    make,
    model,
    year: parseInt(year) || 0,
    colour,
    fuelType,
    kmsDriven: parseInt(kmsDriven) || 0,
    expectedPrice: parseInt(expectedPrice) || 0,
    wantsNewCar,
  };

  try {
    await Api.createSellerLead(leadData);
    alert("Lead created and saved to database successfully!");
    closeCreateLeadModal();
    // Refresh data from backend to ensure UI is in sync
    await Api.syncAll();
    if (typeof loadL1Panel === "function") {
      loadL1Panel();
    }
    if (typeof loadOverviewPanel === "function") {
      loadOverviewPanel();
    }
  } catch (err) {
    console.error('Error creating lead:', err);
    alert("Error creating lead: " + err.message);
  }
}

