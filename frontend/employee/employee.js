/**
 * Employee Portal — Home-Screen Hub Navigation
 */

// Active screen tracker
let activeScreen = "home";
let selectedL1LeadId = null;
let selectedPickerLeadId = null;
let selectedScrapLeadId = null;

// L1 interactive state
let currentL1BodyCondition = 5;
let currentL1EngineCondition = 5;
let currentL1TyreCondition = 5;
let currentL1Options = [];
let l1UploadedDocs = {
  rcFront: null,
  rcBack: null,
  aadhar: null,
  pan: null,
  insurance: null,
  noc: null,
  form35: null,
};
let l1UploadedMedia = {
  extFront: null,
  extRear: null,
  extLeft: null,
  extRight: null,
  interior: null,
  engine: null,
  odometer: null,
  damage: null,
  video: null,
};

let activeUploadCategory = null; // 'doc' or 'media'
let activeUploadType = null;

// Canvas digital signature state
let isDrawing = false;
let sigCanvas = null;
let sigContext = null;
let hasSigned = false;
let isProofSnapped = false;

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await Auth.checkSession();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await Api.syncAll();

  const hasStaffRole =
    user.permissions.includes("l1_employee") ||
    user.permissions.includes("l4_picker_employee") ||
    user.permissions.includes("l4_scrapper") ||
    user.is_super_admin ||
    user.permissions.includes("super_admin");

  if (!hasStaffRole) {
    alert("Access Denied: You do not have employee permissions.");
    Auth.logout();
    return;
  }

  Utils.initTheme();
  renderHomeScreen(user);
  loadNotificationsCount();

  window.addEventListener('hashchange', () => {
    const screen = window.location.hash.substring(1) || 'home';
    if (screen !== activeScreen) {
      if (screen === 'home') {
        navigateHome(false);
      } else {
        navigateTo(screen, false);
      }
    }
  });

  const initialScreen = window.location.hash.substring(1) || 'home';
  if (!window.location.hash) {
    window.location.replace('#' + initialScreen);
  }
  if (initialScreen === 'home') {
    navigateHome(false);
  } else {
    navigateTo(initialScreen, false);
  }

  // Polling disabled: replaced by real-time event-driven updates in socket-client.js
});

function getStaffDescription(user) {
  const roles = [];
  if (user.permissions.includes("l1_employee")) roles.push("L1 Agent");
  if (user.permissions.includes("l4_picker_employee")) roles.push("Picker");
  if (user.permissions.includes("l4_scrapper")) roles.push("Scrapper");
  return roles.join(" & ") || "Employee";
}

// =============================================
// HOME SCREEN — render action cards
// =============================================
function renderHomeScreen(user) {
  const grid = document.getElementById("home-cards-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const firstName = user.name ? user.name.split(" ")[0] : "there";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "EE";

  // Greeting + avatar
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetEl = document.getElementById("home-greeting");
  if (greetEl) greetEl.textContent = `${greeting}, ${firstName}`;
  const initEl = document.getElementById("home-initials");
  if (initEl) initEl.textContent = initials;
  const roleEl = document.getElementById("home-role-badge");
  if (roleEl)
    roleEl.innerHTML = `
    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
    ${getStaffDescription(user)}
  `;

  const hasL1 = user.permissions.includes("l1_employee");
  const hasPicker = user.permissions.includes("l4_picker_employee");

  // Leads card (L1)
  const leadsCard = buildActionCard({
    id: "card-leads",
    style: hasL1 ? "primary" : "locked",
    label: "Leads",
    sub: hasL1 ? "Assigned valuation jobs" : "No L1 permission",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    onclick: hasL1 ? () => navigateTo("l1-leads") : null,
    locked: !hasL1,
  });
  if (!hasL1) {
    const badge = document.createElement("span");
    badge.className = "card-lock-badge";
    badge.textContent = "Locked";
    leadsCard.appendChild(badge);
  }
  grid.appendChild(leadsCard);

  // Add Vehicle card (L1)
  const addCard = buildActionCard({
    id: "card-add-vehicle",
    style: hasL1 ? "primary" : "locked",
    label: "Add Vehicle",
    sub: hasL1 ? "Valuation from scratch" : "No L1 permission",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
    onclick: hasL1 ? () => navigateTo("l1-add") : null,
    locked: !hasL1,
  });
  if (!hasL1) {
    const badge = document.createElement("span");
    badge.className = "card-lock-badge";
    badge.textContent = "Locked";
    addCard.appendChild(badge);
  }
  grid.appendChild(addCard);

  // Pickup card (Picker)
  const pickCard = buildActionCard({
    id: "card-pickup",
    style: hasPicker ? "secondary" : "locked",
    label: "Pickup",
    sub: hasPicker ? "Collection jobs" : "No pickup permission",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    onclick: hasPicker ? () => navigateTo("picker") : null,
    locked: !hasPicker,
  });
  if (!hasPicker) {
    const badge = document.createElement("span");
    badge.className = "card-lock-badge";
    badge.textContent = "Locked";
    pickCard.appendChild(badge);
  }
  grid.appendChild(pickCard);

  // Scrapper card (Scrapper)
  const hasScrapper = user.permissions.includes("l4_scrapper");
  const scrapCard = buildActionCard({
    id: "card-scrap",
    style: hasScrapper ? "secondary" : "locked",
    label: "Scrap Bay",
    sub: hasScrapper ? "Dismantle & scrap" : "No scrapper permission",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    onclick: hasScrapper ? () => navigateTo("scrapper") : null,
    locked: !hasScrapper,
  });
  if (!hasScrapper) {
    const badge = document.createElement("span");
    badge.className = "card-lock-badge";
    badge.textContent = "Locked";
    scrapCard.appendChild(badge);
  }
  grid.appendChild(scrapCard);

  // History card — wide, always available
  const histCard = buildActionCard({
    id: "card-history",
    style: "secondary",
    label: "View History",
    sub: "Your past submissions",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    onclick: () => navigateTo("history"),
    wide: true,
  });
  grid.appendChild(histCard);
}

function buildActionCard({
  id,
  style,
  label,
  sub,
  icon,
  onclick,
  locked,
  wide,
}) {
  const card = document.createElement("div");
  card.id = id;
  card.className = `action-card ${style}${wide ? " wide" : ""}`;
  if (onclick && !locked) card.onclick = onclick;

  const textDiv = document.createElement("div");
  textDiv.className = "card-text";
  textDiv.innerHTML = `
    <div class="card-label">${label}</div>
    <div class="card-sub">${sub}</div>
  `;

  const iconWrap = document.createElement("div");
  iconWrap.className = "card-icon-wrap";
  const iconBox = document.createElement("div");
  iconBox.className = "card-icon";
  iconBox.innerHTML = icon;
  iconWrap.appendChild(iconBox);

  card.appendChild(textDiv);
  card.appendChild(iconWrap);

  return card;
}

// =============================================
// SCREEN NAVIGATION
// =============================================
function navigateTo(screen, updateHash = true) {
  activeScreen = screen;

  // Hide all screens
  document.getElementById("screen-home").style.display = "none";
  document
    .querySelectorAll(".emp-screen")
    .forEach((s) => (s.style.display = "none"));

  // Show back button and section title
  const backBtn = document.getElementById("emp-back-btn");
  backBtn.classList.add("visible");

  const topLogo = document.getElementById("topbar-logo");
  const topTitle = document.getElementById("topbar-section-title");

  const titles = {
    "l1-leads": `<div style="display:flex; align-items:center; gap:10px; color:var(--primary-color);"><div style="width:32px; height:32px; border-radius:8px; background:rgba(14,165,233,0.15); display:flex; align-items:center; justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg></div> Leads</div>`,
    "l1-add": `<div style="display:flex; align-items:center; gap:10px; color:var(--primary-color);"><div style="width:32px; height:32px; border-radius:8px; background:rgba(14,165,233,0.15); display:flex; align-items:center; justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></div> Add Vehicle</div>`,
    picker: `<div style="display:flex; align-items:center; gap:10px; color:var(--primary-color);"><div style="width:32px; height:32px; border-radius:8px; background:rgba(14,165,233,0.15); display:flex; align-items:center; justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div> Pickup</div>`,
    scrapper: `<div style="display:flex; align-items:center; gap:10px; color:var(--primary-color);"><div style="width:32px; height:32px; border-radius:8px; background:rgba(14,165,233,0.15); display:flex; align-items:center; justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div> Scrap Bay</div>`,
    history: `<div style="display:flex; align-items:center; gap:10px; color:var(--primary-color);"><div style="width:32px; height:32px; border-radius:8px; background:rgba(14,165,233,0.15); display:flex; align-items:center; justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div> View History</div>`,
  };

  if (topLogo) topLogo.style.display = "none";
  if (topTitle) {
    topTitle.style.display = "block";
    topTitle.innerHTML = titles[screen] || "Employee Portal";
  }

  // Show correct screen (both l1-leads and l1-add render in screen-l1 container)
  let targetScreenId = `screen-${screen}`;
  if (screen === "l1-leads" || screen === "l1-add") {
    targetScreenId = "screen-l1";
  }

  const targetScreen = document.getElementById(targetScreenId);
  if (targetScreen) {
    targetScreen.style.display = "block";
    loadScreenData(screen);
  }

  if (updateHash) {
    window.location.hash = screen;
  }
}

function navigateHome(updateHash = true) {
  // If we are currently viewing a lead's details inside L1 leads, go back to the queue list first
  if (activeScreen === "l1-leads" && selectedL1LeadId !== null) {
    selectedL1LeadId = null;
    const queueContainer = document.getElementById("l1-queue-container");
    if (queueContainer) queueContainer.style.display = "block";
    document.getElementById("l1-valuation-form").style.display = "none";
    document.getElementById("l1-form-empty").style.display = "block";
    initL1Queue();
    return;
  }
  
  // If we are currently viewing details inside Picker leads, go back to the list first
  if (activeScreen === "picker" && selectedPickerLeadId !== null) {
    selectedPickerLeadId = null;
    const queue = document.getElementById("picker-queue");
    if (queue) queue.style.display = "block";
    document.getElementById("picker-detail-card").style.display = "none";
    initPickerQueue();
    return;
  }

  // If we are currently viewing details inside Scrapper leads, go back to the list first
  if (activeScreen === "scrapper" && selectedScrapLeadId !== null) {
    selectedScrapLeadId = null;
    const queue = document.getElementById("scrapper-queue");
    if (queue) queue.style.display = "block";
    document.getElementById("scrapper-detail-card").style.display = "none";
    initScrapQueue();
    return;
  }

  activeScreen = "home";

  document
    .querySelectorAll(".emp-screen")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById("screen-home").style.display = "flex";

  const backBtn = document.getElementById("emp-back-btn");
  backBtn.classList.remove("visible");

  const topLogo = document.getElementById("topbar-logo");
  const topTitle = document.getElementById("topbar-section-title");
  if (topLogo) topLogo.style.display = "flex";
  if (topTitle) topTitle.style.display = "none";

  if (updateHash) {
    window.location.hash = "home";
  }
}

function loadScreenData(screen) {
  if (screen === "l1-leads" || screen === "l1-add") initL1Screen(screen);
  else if (screen === "picker") initPickerQueue();
  else if (screen === "scrapper") initScrapQueue();
  else if (screen === "history") initHistoryScreen();
}

// =============================================
// HISTORY SCREEN
// =============================================
function initHistoryScreen() {
  const user = Auth.getCurrentUser();
  const listEl = document.getElementById("history-list");
  const emptyEl = document.getElementById("history-empty");
  listEl.innerHTML = "";

  const leads = Api.getLeads().filter(
    (l) => l.submittedBy === user.id || l.assignedTo === user.id,
  );

  if (leads.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  leads.forEach((l) => {
    const card = document.createElement("div");
    card.className = "history-card";

    const statusMap = {
      pending_approval: ["md-badge-pending", "Pending L2 Approval"],
      approved: ["md-badge-approved", "Approved"],
      payment_initiated: ["md-badge-pending", "Payment Initiated"],
      payment_confirmed: ["md-badge-approved", "Payment Done"],
      picked_up: ["md-badge-new", "Picked Up"],
      scrapped: ["md-badge-approved", "Scrapped"],
      rejected: ["md-badge-rejected", "Rejected"],
    };
    const [badgeClass, badgeLabel] = statusMap[l.status] || [
      "md-badge-pending",
      l.status,
    ];

    card.innerHTML = `
      <div class="history-card-info">
        <div class="history-card-title">${l.make || ""} ${l.model} — <span style="font-family:monospace;">${l.vehicleNumber}</span></div>
        <div class="history-card-meta">${l.ownerName} &bull; ${new Date(l.createdAt || Date.now()).toLocaleDateString("en-IN")}</div>
      </div>
      <span class="premium-badge ${badgeClass}" style="white-space:nowrap;">${badgeLabel}</span>
    `;
    listEl.appendChild(card);
  });
}

// ====================================================
// SECTION 1: L1 EVALUATION WORKFLOW
// ====================================================
function initL1Screen(screenMode) {
  const queueContainer = document.getElementById("l1-queue-container");
  
  if (screenMode === "l1-add") {
    // Hide queue, show blank form directly
    if (queueContainer) queueContainer.style.display = "none";
    startNewL1Valuation();
  } else {
    // Show queue
    if (queueContainer) queueContainer.style.display = "block";
    
    // Hide form, show empty state
    document.getElementById("l1-valuation-form").style.display = "none";
    document.getElementById("l1-form-empty").style.display = "block";
    
    // Reset selected lead
    selectedL1LeadId = null;
    
    // Render the queue
    const queue = document.getElementById("l1-queue");
    if (queue) {
      queue.innerHTML = "";
      const user = Auth.getCurrentUser();
      const allLeads = Api.getLeads();
      const leads = allLeads.filter((l) => {
        return l.status === "assigned" && l.assignedTo === (user ? user.id : null);
      });

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
  }
}

function initL1Queue() {
  initL1Screen("l1-leads");
}

function selectL1Lead(leadId) {
  selectedL1LeadId = leadId;

  // Toggle selection classes in L1 queue
  document.querySelectorAll("#l1-queue .queue-card").forEach((c) => {
    if (c.getAttribute("data-id") === leadId) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  // Hide the queue container to open form in the "next page" view
  const queueContainer = document.getElementById("l1-queue-container");
  if (queueContainer) queueContainer.style.display = "none";

  loadL1LeadForm(leadId);
}

function startNewL1Valuation() {
  selectedL1LeadId = null;

  // De-select cards
  document.querySelectorAll("#l1-queue .queue-card").forEach((c) => {
    c.classList.remove("selected");
  });

  document.getElementById("l1-form-empty").style.display = "none";
  document.getElementById("l1-valuation-form").style.display = "block";

  // Reset all form fields
  document.getElementById("l1-valuation-form").reset();

  currentL1BodyCondition = 5;
  currentL1EngineCondition = 5;
  currentL1TyreCondition = 5;
  currentL1Options = [];

  renderL1ConditionGrids();
  updateL1RatingLabel("body", currentL1BodyCondition);
  updateL1RatingLabel("engine", currentL1EngineCondition);
  updateL1RatingLabel("tyre", currentL1TyreCondition);
  renderL1OptionsChecklist(null);

  // Reset uploads
  Object.keys(l1UploadedDocs).forEach((k) => (l1UploadedDocs[k] = null));
  Object.keys(l1UploadedMedia).forEach((k) => (l1UploadedMedia[k] = null));
  updateAllDocCards();
  updateAllMediaCards();
  resetPayMode();
}

function loadL1LeadForm(leadId) {
  if (!leadId) {
    selectedL1LeadId = null;
    document.getElementById("l1-valuation-form").style.display = "none";
    document.getElementById("l1-form-empty").style.display = "block";
    return;
  }

  selectedL1LeadId = leadId;
  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  document.getElementById("l1-form-empty").style.display = "none";
  document.getElementById("l1-valuation-form").style.display = "block";

  // Load Owner Details
  document.getElementById("l1-owner-name").value =
    lead.l1Details && lead.l1Details.ownerName
      ? lead.l1Details.ownerName
      : lead.ownerName || "";
  document.getElementById("l1-owner-phone").value =
    lead.l1Details && lead.l1Details.ownerPhone
      ? lead.l1Details.ownerPhone
      : lead.phone || "";
  
  const emailInput = document.getElementById("l1-owner-email");
  if (emailInput) {
    emailInput.value = lead.l1Details && lead.l1Details.ownerEmail
      ? lead.l1Details.ownerEmail
      : lead.email || "";
  }
  const addrInput = document.getElementById("l1-owner-address");
  if (addrInput) {
    addrInput.value = lead.l1Details && lead.l1Details.ownerAddress
      ? lead.l1Details.ownerAddress
      : lead.address || "";
  }

  document.getElementById("l1-expected-price").value =
    lead.l1Details && lead.l1Details.expectedPrice
      ? lead.l1Details.expectedPrice
      : lead.expectedPrice || "";
  document.getElementById("l1-vehicle-reg-no").value =
    lead.l1Details && lead.l1Details.vehicleRegNumber
      ? lead.l1Details.vehicleRegNumber
      : lead.vehicleNumber || "";

  // Load Vehicle Specs
  document.getElementById("l1-vehicle-make").value =
    lead.l1Details && lead.l1Details.make
      ? lead.l1Details.make
      : lead.make || "";
  document.getElementById("l1-vehicle-model").value =
    lead.l1Details && lead.l1Details.model
      ? lead.l1Details.model
      : lead.model || "";
  document.getElementById("l1-vehicle-year").value =
    lead.l1Details && lead.l1Details.year
      ? lead.l1Details.year
      : lead.year || "";
  document.getElementById("l1-vehicle-colour").value =
    lead.l1Details && lead.l1Details.colour
      ? lead.l1Details.colour
      : lead.colour || "";
  document.getElementById("l1-vehicle-fuel").value =
    lead.l1Details && lead.l1Details.fuelType
      ? lead.l1Details.fuelType
      : lead.fuelType || "";
  document.getElementById("l1-vehicle-kms").value =
    lead.l1Details && lead.l1Details.kmsDriven
      ? lead.l1Details.kmsDriven
      : lead.kmsDriven || "";
  
  const elEngineNo = document.getElementById("l1-engine-no");
  if (elEngineNo) {
    elEngineNo.value =
      lead.l1Details && lead.l1Details.engineNumber
        ? lead.l1Details.engineNumber
        : "";
  }
  document.getElementById("l1-chassis-no").value =
    lead.l1Details && lead.l1Details.chassisNumber
      ? lead.l1Details.chassisNumber
      : "";

  // Load Condition ratings
  currentL1BodyCondition =
    lead.l1Details && lead.l1Details.bodyCondition
      ? lead.l1Details.bodyCondition
      : lead.bodyCondition || 5;
  currentL1EngineCondition =
    lead.l1Details && lead.l1Details.engineCondition
      ? lead.l1Details.engineCondition
      : 5;
  currentL1TyreCondition =
    lead.l1Details && lead.l1Details.tyreCondition
      ? lead.l1Details.tyreCondition
      : 5;

  renderL1ConditionGrids();
  updateL1RatingLabel("body", currentL1BodyCondition);
  updateL1RatingLabel("engine", currentL1EngineCondition);
  updateL1RatingLabel("tyre", currentL1TyreCondition);

  // Setup options pills selection
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
  currentL1Options =
    lead.l1Details && lead.l1Details.missingParts
      ? accessoriesList.filter((x) => !lead.l1Details.missingParts.includes(x))
      : [...(lead.optionsPresent || [])];
  renderL1OptionsChecklist(lead);

  // Load accident remarks
  document.getElementById("l1-accident").value =
    lead.l1Details && lead.l1Details.accidentHistory
      ? lead.l1Details.accidentHistory
      : "";

  // Load dynamic uploaded doc & media states
  l1UploadedDocs =
    lead.l1Details && lead.l1Details.documents
      ? { ...lead.l1Details.documents }
      : {
          rcFront: null,
          rcBack: null,
          aadhar: null,
          pan: null,
          insurance: null,
          noc: null,
          form35: null,
        };

  l1UploadedMedia =
    lead.l1Details && lead.l1Details.media
      ? { ...lead.l1Details.media }
      : {
          extFront: null,
          extRear: null,
          extLeft: null,
          extRight: null,
          interior: null,
          engine: null,
          odometer: null,
          damage: null,
          video: null,
        };

  updateL1DocVisualCards();
  updateL1MediaVisualCards();

  // Load recommended price if available
  const recPriceInput = document.getElementById("l1-recommended-price");
  if (recPriceInput) {
    recPriceInput.value = lead.l1Details && lead.l1Details.recommendedPrice
      ? lead.l1Details.recommendedPrice
      : "";
  }

  // Load payment mode if available
  if (lead.l1Details && lead.l1Details.paymentMode) {
    selectPayMode(lead.l1Details.paymentMode);
    if (lead.l1Details.paymentMode === "upi" && lead.l1Details.paymentDetails) {
      document.getElementById("l1-upi-id").value = lead.l1Details.paymentDetails.upiId || "";
    } else if (lead.l1Details.paymentMode === "cash" && lead.l1Details.paymentDetails) {
      document.getElementById("l1-cash-confirm").checked = lead.l1Details.paymentDetails.cashConfirmed || false;
    } else if (lead.l1Details.paymentMode === "bank" && lead.l1Details.paymentDetails) {
      document.getElementById("l1-bank-holder").value = lead.l1Details.paymentDetails.accountHolder || "";
      document.getElementById("l1-bank-name").value = lead.l1Details.paymentDetails.bankName || "";
      document.getElementById("l1-bank-account").value = lead.l1Details.paymentDetails.accountNumber || "";
      document.getElementById("l1-bank-ifsc").value = lead.l1Details.paymentDetails.ifscCode || "";
    }
  } else {
    resetPayMode();
  }
  
  // Check for saved draft
  const regNo = document.getElementById("l1-vehicle-reg-no").value.trim();
  checkL1Draft(regNo);
}

function renderL1OptionsChecklist(lead) {
  const container = document.getElementById("l1-options-tiles-select");
  if (!container) return;
  container.innerHTML = "";

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
    const isPresent = currentL1Options.includes(acc);
    const labelEl = document.createElement("label");
    labelEl.style.cssText =
      "display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; font-size:0.9rem; font-weight:500; color:var(--text-primary); margin-bottom:4px;";
    labelEl.innerHTML = `
      <input type="checkbox" class="options-checkbox" data-acc="${acc}" ${isPresent ? "checked" : ""} style="width:18px; height:18px; accent-color:var(--primary-color); cursor:pointer;">
      <span>${acc}</span>
    `;
    const checkbox = labelEl.querySelector("input");
    checkbox.onchange = () => {
      if (checkbox.checked) {
        if (!currentL1Options.includes(acc)) currentL1Options.push(acc);
      } else {
        currentL1Options = currentL1Options.filter((x) => x !== acc);
      }
      renderL1OptionsChecklist(lead);
    };
    container.appendChild(labelEl);
  });
}

function renderL1ConditionGrids() {
  renderSingleConditionGrid("body", currentL1BodyCondition, (score) => {
    currentL1BodyCondition = score;
    renderL1ConditionGrids();
  });
  renderSingleConditionGrid("engine", currentL1EngineCondition, (score) => {
    currentL1EngineCondition = score;
    renderL1ConditionGrids();
  });
  renderSingleConditionGrid("tyre", currentL1TyreCondition, (score) => {
    currentL1TyreCondition = score;
    renderL1ConditionGrids();
  });
}

function renderSingleConditionGrid(type, currentVal, onClickCallback) {
  const container = document.getElementById(`l1-${type}-condition-grid`);
  if (!container) return;
  container.innerHTML = "";

  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement("div");
    btn.className = `rating-touch-btn ${currentVal === i ? "active" : ""}`;
    btn.innerText = i;
    btn.onclick = () => {
      onClickCallback(i);
      updateL1RatingLabel(type, i);
    };
    container.appendChild(btn);
  }
}

function updateL1RatingLabel(type, score) {
  const label = document.getElementById(`l1-${type}-rating-label`);
  if (!label) return;

  const descriptions = {
    body: {
      1: "Body Scrap: Completely rusted, paneled, or severely dented frame",
      2: "Severe body rust, multiple panels mismatch or missing panels",
      3: "Chassis/structural frame impact, severe rust and panels dented",
      4: "Operational but multiple panels dented & interior heavily worn",
      5: "Average wear and tear, small dents and scratches on 3+ panels",
      6: "Good body condition with minor exterior touch-ups or scratches",
      7: "Well maintained, no accident dents, interior clean and original",
      8: "High resale potential, minimal minor scratches, perfect paint sheen",
      9: "Near perfect showroom finish, all panels original alignment",
      10: "Absolutely perfect mint condition, brand new visual preservation",
    },
    engine: {
      1: "Engine Seized: Completely locked up, non-functional block",
      2: "Major block crack, head gasket blown or missing vital parts",
      3: "Heavy smoking, severe misfiring, or deep internal knock sounds",
      4: "Starts with jumpstart, heavy oil leaks, check engine light on",
      5: "Starts, but moderate noise, slight smoke, average coolant leak",
      6: "Starts reliably, minor oil sweating, slight idle vibration",
      7: "Reliable running, quiet idle, no visible leakage under block",
      8: "Excellent acceleration, highly responsive, zero smoke, dry clean block",
      9: "Near brand new technical specs, super smooth gear transitions",
      10: "Factory-perfect engine casing and high performance compression",
    },
    tyre: {
      1: "Tyres Bald: Under 10% thread remaining, exposed steel cord wires",
      2: "Severe cracks, thread dry rot, major alignment uneven wear",
      3: "Flat or heavily worn, uneven balding, side walls damaged",
      4: "Highly worn, needs immediate replacement, minor sidewall dry rot",
      5: "Average tread wear, around 40-50% thread depth remaining",
      6: "Moderate tread depth (around 60% remaining), uniform wear",
      7: "Good tread depth (around 70%), side walls intact and rubber soft",
      8: "Excellent tyres (80%+ thread), minor usage, no alignment issues",
      9: "Near-new tyre condition (90%+ thread), brand name fresh rubber",
      10: "Brand new tyres with absolute showroom tread nipples intact",
    },
  };

  label.innerText = descriptions[type]
    ? descriptions[type][score] || "Select score"
    : "Select score";
}

function triggerMockUpload(docType) {
  activeUploadCategory = "doc";
  activeUploadType = docType;
  const input = document.getElementById("global-media-upload");
  if(input) input.click();
}

function triggerMockMediaUpload(mediaType) {
  activeUploadCategory = "media";
  activeUploadType = mediaType;
  const input = document.getElementById("global-media-upload");
  if(input) input.click();
}

function updateL1DocVisualCards() {
  updateSingleDocCard("rc-front", "RC Book (Front)", l1UploadedDocs.rcFront);
  updateSingleDocCard("rc-back", "RC Book (Back)", l1UploadedDocs.rcBack);
  updateSingleDocCard("aadhar", "Aadhar Card", l1UploadedDocs.aadhar);
  updateSingleDocCard("pan", "PAN Card", l1UploadedDocs.pan);
  updateSingleDocCard("insurance", "Insurance", l1UploadedDocs.insurance);
  updateSingleDocCard("noc", "NOC (if needed)", l1UploadedDocs.noc);
  updateSingleDocCard("form35", "Form 35 (if HP)", l1UploadedDocs.form35);
}

function updateL1MediaVisualCards() {
  updateSingleDocCard("ext-front", "Exterior Front", l1UploadedMedia.extFront);
  updateSingleDocCard("ext-rear", "Exterior Rear", l1UploadedMedia.extRear);
  updateSingleDocCard(
    "ext-left",
    "Exterior Left Side",
    l1UploadedMedia.extLeft,
  );
  updateSingleDocCard(
    "ext-right",
    "Exterior Right Side",
    l1UploadedMedia.extRight,
  );
  updateSingleDocCard("interior", "Interior View", l1UploadedMedia.interior);
  updateSingleDocCard("engine", "Engine Bay", l1UploadedMedia.engine);
  updateSingleDocCard("odometer", "Odometer Reading", l1UploadedMedia.odometer);
  updateSingleDocCard("damage", "Damage Spots", l1UploadedMedia.damage);
  updateSingleDocCard("video", "Walkaround Video", l1UploadedMedia.video);
}

function updateSingleDocCard(id, baseLabel, filename, isCustom = false) {
  const card = document.getElementById(`card-${id}`);
  const label = document.getElementById(`label-${id}`);
  const status = document.getElementById(`status-${id}`);

  if (card && label && status) {
    let removeBtn = card.querySelector('.remove-upload-btn');
    if (removeBtn) removeBtn.remove();
    
    let displayFilename = null;
    let actualFile = null;
    if (filename instanceof File) {
      displayFilename = filename.name;
      actualFile = filename;
    } else if (filename) {
      displayFilename = filename;
      actualFile = filename;
    }

    if (displayFilename) {
      card.classList.add("uploaded");
      label.innerText = isCustom ? baseLabel : `${baseLabel} (Uploaded)`;
      status.innerText = displayFilename;
      
      if (displayFilename !== "Please wait...") {
        removeBtn = document.createElement("button");
        removeBtn.className = "remove-upload-btn";
        removeBtn.style.position = "absolute";
        removeBtn.style.top = "6px";
        removeBtn.style.right = "6px";
        removeBtn.style.padding = "4px 8px";
        removeBtn.style.fontSize = "11px";
        removeBtn.style.fontWeight = "600";
        removeBtn.style.background = "#ff4d4f";
        removeBtn.style.color = "white";
        removeBtn.style.border = "none";
        removeBtn.style.borderRadius = "4px";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.zIndex = "10";
        removeBtn.innerText = "Remove";
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          window.removeUpload(id, actualFile);
        };
        card.appendChild(removeBtn);
      }
      
      // Ensure long filenames are truncated
      status.style.display = "block";
      status.style.overflow = "hidden";
      status.style.textOverflow = "ellipsis";
      status.style.whiteSpace = "nowrap";
      status.style.maxWidth = "100%";
      status.style.marginTop = "4px";
    } else {
      card.classList.remove("uploaded");
      label.innerText = baseLabel;
      status.innerText = "Click to upload";
      status.style.whiteSpace = "normal";
    }
  }
}

window.removeUpload = async function(id, fileOrString) {
  if (!confirm("Remove this photo?")) return;
  
  // Attempt backend deletion only if it's a string (already uploaded)
  if (typeof fileOrString === "string" && fileOrString !== "Please wait...") {
    try {
      await Api.deleteFile(fileOrString);
    } catch (err) {
      console.error("Failed to delete file from backend:", err);
    }
  }

  // Clear local state
  const isMedia = id.startsWith("ext-") || id === "interior" || id === "engine" || id === "odometer" || id === "damage" || id === "video";
  if (isMedia) {
    if (id === "ext-front") l1UploadedMedia.extFront = null;
    else if (id === "ext-rear") l1UploadedMedia.extRear = null;
    else if (id === "ext-left") l1UploadedMedia.extLeft = null;
    else if (id === "ext-right") l1UploadedMedia.extRight = null;
    else if (id === "interior") l1UploadedMedia.interior = null;
    else if (id === "engine") l1UploadedMedia.engine = null;
    else if (id === "odometer") l1UploadedMedia.odometer = null;
    else if (id === "damage") l1UploadedMedia.damage = null;
    else if (id === "video") l1UploadedMedia.video = null;
    updateL1MediaVisualCards();
  } else {
    if (id === "rc-front") l1UploadedDocs.rcFront = null;
    else if (id === "rc-back") l1UploadedDocs.rcBack = null;
    else if (id === "aadhar") l1UploadedDocs.aadhar = null;
    else if (id === "pan") l1UploadedDocs.pan = null;
    else if (id === "insurance") l1UploadedDocs.insurance = null;
    else if (id === "noc") l1UploadedDocs.noc = null;
    else if (id === "form35") l1UploadedDocs.form35 = null;
    else if (id === "pickup-proof") {
      isProofSnapped = false;
      updateSingleDocCard(id, "Take Delivery Proof Photo", null, true);
      return;
    }
    updateL1DocVisualCards();
  }
};

function updateAllDocCards() {
  updateL1DocVisualCards();
}

function updateAllMediaCards() {
  updateL1MediaVisualCards();
}

// =============================================
// PAYMENT MODE TOGGLE
// =============================================
let currentPayMode = null;

function selectPayMode(mode) {
  currentPayMode = mode;

  // Toggle active pill
  ["upi", "cash", "bank"].forEach((m) => {
    const btn = document.getElementById(`pay-mode-${m}`);
    if (btn) btn.classList.toggle("active", m === mode);
  });

  // Show/hide sub-fields
  ["upi", "cash", "bank", "none"].forEach((m) => {
    const el = document.getElementById(`pay-fields-${m}`);
    if (el) el.style.display = "none";
  });

  const target = document.getElementById(`pay-fields-${mode}`);
  if (target) target.style.display = "block";
}

function resetPayMode() {
  currentPayMode = null;
  ["upi", "cash", "bank"].forEach((m) => {
    const btn = document.getElementById(`pay-mode-${m}`);
    if (btn) btn.classList.remove("active");
  });
  ["upi", "cash", "bank"].forEach((m) => {
    const el = document.getElementById(`pay-fields-${m}`);
    if (el) el.style.display = "none";
  });
  const none = document.getElementById("pay-fields-none");
  if (none) none.style.display = "block";
}

function handleL1DraftSave() {
  const valuation = getL1FormInputValues();
  if (!valuation.vehicleRegNumber) {
    Utils.showAlert(
      "Please enter at least the Vehicle Registration Number to save a draft.",
      "info",
    );
    return;
  }

  const drafts = JSON.parse(localStorage.getItem("ldr_l1_drafts") || "{}");
  drafts[valuation.vehicleRegNumber] = {
    ...valuation,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem("ldr_l1_drafts", JSON.stringify(drafts));

  Utils.showAlert("Draft saved locally. You can continue later.", "info");
}

function checkL1Draft(regNo) {
  if (!regNo) return;
  const drafts = JSON.parse(localStorage.getItem("ldr_l1_drafts") || "{}");
  if (drafts[regNo]) {
    if (confirm("A saved draft was found for this vehicle. Do you want to load it?")) {
      loadL1Draft(drafts[regNo]);
    }
  }
}

function loadL1Draft(draft) {
  if (draft.ownerName) document.getElementById("l1-owner-name").value = draft.ownerName;
  if (draft.ownerPhone) document.getElementById("l1-owner-phone").value = draft.ownerPhone;
  if (document.getElementById("l1-owner-email") && draft.ownerEmail) document.getElementById("l1-owner-email").value = draft.ownerEmail;
  if (document.getElementById("l1-owner-address") && draft.ownerAddress) document.getElementById("l1-owner-address").value = draft.ownerAddress;

  if (document.getElementById("l1-engine-no") && draft.engineNumber) document.getElementById("l1-engine-no").value = draft.engineNumber;
  if (draft.chassisNumber) document.getElementById("l1-chassis-no").value = draft.chassisNumber;

  if (draft.make) document.getElementById("l1-vehicle-make").value = draft.make;
  if (draft.model) document.getElementById("l1-vehicle-model").value = draft.model;
  if (draft.year) document.getElementById("l1-vehicle-year").value = draft.year;
  if (draft.colour) document.getElementById("l1-vehicle-colour").value = draft.colour;
  if (draft.fuelType) document.getElementById("l1-vehicle-fuel").value = draft.fuelType;
  if (draft.kmsDriven) document.getElementById("l1-vehicle-kms").value = draft.kmsDriven;

  if (draft.bodyCondition) {
    currentL1BodyCondition = draft.bodyCondition;
    updateL1RatingLabel("body", currentL1BodyCondition);
  }
  if (draft.engineCondition) {
    currentL1EngineCondition = draft.engineCondition;
    updateL1RatingLabel("engine", currentL1EngineCondition);
  }
  if (draft.tyreCondition) {
    currentL1TyreCondition = draft.tyreCondition;
    updateL1RatingLabel("tyre", currentL1TyreCondition);
  }
  renderL1ConditionGrids();

  if (draft.accidentHistory) document.getElementById("l1-accident").value = draft.accidentHistory;

  if (draft.expectedPrice) document.getElementById("l1-expected-price").value = draft.expectedPrice;
  if (draft.recommendedPrice) document.getElementById("l1-recommended-price").value = draft.recommendedPrice;

  if (draft.paymentMode) {
    selectPayMode(draft.paymentMode);
    if (draft.paymentMode === "upi" && draft.paymentDetails) {
      document.getElementById("l1-upi-id").value = draft.paymentDetails.upiId || "";
    } else if (draft.paymentMode === "bank" && draft.paymentDetails) {
      document.getElementById("l1-bank-holder").value = draft.paymentDetails.accountHolder || "";
      document.getElementById("l1-bank-name").value = draft.paymentDetails.bankName || "";
      document.getElementById("l1-bank-account").value = draft.paymentDetails.accountNumber || "";
      document.getElementById("l1-bank-ifsc").value = draft.paymentDetails.ifscCode || "";
    } else if (draft.paymentMode === "cash" && draft.paymentDetails) {
      document.getElementById("l1-cash-confirm").checked = !!draft.paymentDetails.cashConfirmed;
    }
  }

  // Restore Missing Parts
  if (draft.missingParts) {
    currentL1Options = [];
    const accessoriesList = ["Battery", "AC", "Music System", "Airbags", "Sunroof", "Spare Tyre", "Jack & Tools", "Central Locking"];
    accessoriesList.forEach(item => {
      if (!draft.missingParts.includes(item)) {
        currentL1Options.push(item);
      }
    });
    renderL1OptionsChecklist(null);
  }

  Utils.showAlert("Draft loaded successfully.", "success");
}

function getL1FormInputValues() {
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
  const missingParts = accessoriesList.filter(
    (x) => !currentL1Options.includes(x),
  );

  return {
    ownerName: document.getElementById("l1-owner-name").value.trim(),
    ownerPhone: document.getElementById("l1-owner-phone").value.trim(),
    ownerEmail: document.getElementById("l1-owner-email")
      ? document.getElementById("l1-owner-email").value.trim()
      : "",
    ownerAddress: document.getElementById("l1-owner-address")
      ? document.getElementById("l1-owner-address").value.trim()
      : "",

    vehicleRegNumber: document.getElementById("l1-vehicle-reg-no").value.trim(),
    engineNumber: document.getElementById("l1-engine-no")
      ? document.getElementById("l1-engine-no").value.trim()
      : "",
    chassisNumber: document.getElementById("l1-chassis-no").value.trim(),

    make: document.getElementById("l1-vehicle-make").value.trim(),
    model: document.getElementById("l1-vehicle-model").value.trim(),
    year: parseInt(document.getElementById("l1-vehicle-year").value) || 0,
    colour: document.getElementById("l1-vehicle-colour").value.trim(),
    fuelType: document.getElementById("l1-vehicle-fuel").value,
    kmsDriven: parseInt(document.getElementById("l1-vehicle-kms").value) || 0,

    bodyCondition: currentL1BodyCondition,
    engineCondition: currentL1EngineCondition,
    tyreCondition: currentL1TyreCondition,
    accidentHistory: document.getElementById("l1-accident").value.trim(),
    missingParts: missingParts,

    expectedPrice:
      parseFloat(document.getElementById("l1-expected-price").value) || 0,
    recommendedPrice:
      parseFloat(document.getElementById("l1-recommended-price").value) || 0,

    paymentMode: currentPayMode,
    paymentDetails:
      currentPayMode === "upi"
        ? {
            upiId: document.getElementById("l1-upi-id").value.trim(),
          }
        : currentPayMode === "bank"
          ? {
              accountHolder: document
                .getElementById("l1-bank-holder")
                .value.trim(),
              bankName: document.getElementById("l1-bank-name").value.trim(),
              accountNumber: document
                .getElementById("l1-bank-account")
                .value.trim(),
              ifscCode: document
                .getElementById("l1-bank-ifsc")
                .value.trim()
                .toUpperCase(),
            }
          : currentPayMode === "cash"
            ? {
                cashConfirmed:
                  document.getElementById("l1-cash-confirm").checked,
              }
            : null,

    documents: {},
    media: {},
    photos: [],
  };
}

async function handleL1Submit(event) {
  event.preventDefault();

  const valuation = getL1FormInputValues();

  // Provide defaults for empty required fields to avoid database NOT NULL / UNIQUE constraint errors
  if (!valuation.ownerName) {
    valuation.ownerName = "Anonymous Owner";
  }
  if (!valuation.ownerPhone) {
    valuation.ownerPhone = "0000000000";
  }
  if (!valuation.vehicleRegNumber) {
    valuation.vehicleRegNumber = "TEMP-" + Math.floor(100000 + Math.random() * 900000);
  }

  // --- UPLOAD DEFERRED FILES ---
  const processUploads = async (obj) => {
    for (const key of Object.keys(obj)) {
      if (obj[key] instanceof File) {
        const btn = document.querySelector("#l1-valuation-form button[type='submit']");
        const originalText = btn ? btn.innerText : "Save";
        if (btn) {
          btn.innerText = "Uploading " + obj[key].name + "...";
          btn.disabled = true;
        }
        try {
           const res = await Api.uploadFile(obj[key], key);
           obj[key] = res.path.split('/').pop();
        } catch (e) {
           alert("Failed to upload " + obj[key].name);
           if (btn) { btn.innerText = originalText; btn.disabled = false; }
           throw e;
        }
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
      }
    }
  };

  try {
    await processUploads(l1UploadedDocs);
    await processUploads(l1UploadedMedia);
  } catch(e) {
    return; // stop submit if any upload fails
  }

  // Assign filenames AFTER uploads complete so we get strings, not File objects
  valuation.documents = Object.fromEntries(
    Object.entries(l1UploadedDocs).filter(([, v]) => v && typeof v === 'string')
  );
  valuation.media = Object.fromEntries(
    Object.entries(l1UploadedMedia).filter(([, v]) => v && typeof v === 'string')
  );
  valuation.photos = Object.values(valuation.media);
  // -----------------------------

  const user = Auth.getCurrentUser();
  const leads = Api.getLeads();
  
  let leadId = selectedL1LeadId;
  let lead;

  if (leadId) {
    // Update existing lead
    const existingLead = Api.getLeadById(leadId);
    lead = {
      ...existingLead,
      vehicleNumber: valuation.vehicleRegNumber,
      ownerName: valuation.ownerName,
      phone: valuation.ownerPhone,
      email: valuation.ownerEmail,
      address: valuation.ownerAddress,
      expectedPrice: valuation.expectedPrice,
      make: valuation.make,
      model: valuation.model,
      year: valuation.year,
      colour: valuation.colour,
      fuelType: valuation.fuelType,
      kmsDriven: valuation.kmsDriven,
      bodyCondition: valuation.bodyCondition,
      optionsPresent: currentL1Options,
      status: "pending_approval",
      submittedBy: user.id,
      updatedAt: new Date().toISOString(),
      l1Details: valuation,
    };
    const idx = leads.findIndex((l) => l.id === leadId);
    if (idx !== -1) {
      leads[idx] = lead;
    }
  } else {
    // Create new lead from scratch
    leadId = `lead-${Date.now()}`;
    lead = {
      id: leadId,
      vehicleNumber: valuation.vehicleRegNumber,
      ownerName: valuation.ownerName,
      phone: valuation.ownerPhone,
      email: valuation.ownerEmail,
      address: valuation.ownerAddress,
      expectedPrice: valuation.expectedPrice,
      make: valuation.make,
      model: valuation.model,
      year: valuation.year,
      colour: valuation.colour,
      fuelType: valuation.fuelType,
      kmsDriven: valuation.kmsDriven,
      bodyCondition: valuation.bodyCondition,
      optionsPresent: currentL1Options,
      status: "pending_approval",
      submittedBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      l1Details: valuation,
    };
    leads.push(lead);
  }

  try {
    await Api.saveLeads(leads);
    
    // Set the leadId to the correct DB-generated ID returned by saveLeads
    leadId = lead.id;

    // Remove any saved draft for this vehicle number
    const drafts = JSON.parse(localStorage.getItem("ldr_l1_drafts") || "{}");
    delete drafts[valuation.vehicleRegNumber];
    localStorage.setItem("ldr_l1_drafts", JSON.stringify(drafts));

    // Notify L2 purchase managers
    await Api.logAction(
      user.id,
      "VALUATION_SUBMITTED",
      "leads",
      leadId,
      "assigned",
      "Vehicle valuation completed by L1 agent",
    );
    
    const managers = Api.getUsers().filter((u) => u.permissions.includes("l2"));
    managers.forEach((m) => {
      Api.addNotification(
        m.id,
        leadId,
        `New valuation submitted for ${valuation.vehicleRegNumber} — ${valuation.make} ${valuation.model}. Awaiting L2 review.`,
      );
    });

    Utils.showAlert(
      `Vehicle ${valuation.vehicleRegNumber} submitted for L2 approval!`,
      "success",
    );

    selectedL1LeadId = null;
    // Reset form and refresh list
    initL1Queue();
  } catch (err) {
    console.error("Valuation submission failed:", err);
    Utils.showAlert(`Submission failed: ${err.message}`, "error");
    await Api.syncAll();
    initL1Queue();
  }
}

// ====================================================
// SECTION 2: L4 PICKER HANDOVER LOGIC
// ====================================================
function initPickerQueue() {
  const queue = document.getElementById("picker-queue");
  queue.innerHTML = "";

  const user = Auth.getCurrentUser();
  const leads = Api.getLeads().filter(
    (l) => l.status === "payment_confirmed" && l.assignedPicker === user.id,
  );

  if (leads.length === 0) {
    document.getElementById("picker-queue-empty").style.display = "block";
    document.getElementById("picker-queue-list").style.display = "none";
    document.getElementById("picker-detail-card").style.display = "none";
    return;
  }

  document.getElementById("picker-queue-empty").style.display = "none";
  document.getElementById("picker-queue-list").style.display = "block";
  document.getElementById("picker-queue").style.display = "block";

  leads.forEach((l) => {
    const card = document.createElement("div");
    card.className = `queue-card ${selectedPickerLeadId === l.id ? "selected" : ""}`;
    card.setAttribute("data-id", l.id);
    card.onclick = () => selectPickerLead(l.id);
    card.innerHTML = `
      <div>
        <strong style="display:block;">${l.make || ""} ${l.model}</strong>
        <span style="font-size:0.75rem; font-family:monospace; color:var(--text-secondary);">${l.vehicleNumber}</span>
      </div>
      <span class="premium-badge md-badge-approved">Paid</span>
    `;
    queue.appendChild(card);
  });

  if (
    selectedPickerLeadId &&
    leads.find((l) => l.id === selectedPickerLeadId)
  ) {
    const detailCard = document.getElementById("picker-detail-card");
    if (detailCard && detailCard.style.display !== "block") {
      selectPickerLead(selectedPickerLeadId);
    }
  } else {
    document.getElementById("picker-detail-card").style.display = "none";
    selectedPickerLeadId = null;
  }
}

function selectPickerLead(leadId) {
  selectedPickerLeadId = leadId;

  // Toggle selection classes
  document.querySelectorAll("#picker-queue .queue-card").forEach((c) => {
    if (c.getAttribute("data-id") === leadId) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  // Hide list and show detail page
  const queue = document.getElementById("picker-queue");
  if (queue) queue.style.display = "none";
  document.getElementById("picker-detail-card").style.display = "block";

  // Hide extended details initially, show button, hide loading state
  document.getElementById("pick-extended-details").style.display = "none";
  document.getElementById("pick-more-details-btn").style.display = "block";
  document.getElementById("pick-more-details-loading").style.display = "none";

  // Fill details
  document.getElementById("pick-car-model").innerText =
    `${lead.make || ""} ${lead.model}`;
  document.getElementById("pick-reg-no").innerText = lead.vehicleNumber;
  document.getElementById("pick-owner-name").innerText = lead.ownerName || "—";

  const phoneLink = document.getElementById("pick-owner-phone-link");
  phoneLink.innerText = lead.phone || "—";
  phoneLink.href = lead.phone ? `tel:${lead.phone}` : "#";

  const address = lead.address || (lead.l1Details && lead.l1Details.ownerAddress) || "—";
  document.getElementById("pick-owner-address").innerText = address;

  // Load iframe Google Map
  const encodedAddress = encodeURIComponent(address !== "—" ? address : `${lead.ownerName || ""}, India`);
  document.getElementById("pick-map-iframe").src = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  // Reset proof and signature
  isProofSnapped = false;
  updateSingleDocCard("pickup-proof", "Take Delivery Proof Photo", null, true);
  initSignatureCanvas();
}

async function loadPickerMoreDetails() {
  if (!selectedPickerLeadId) return;

  const btn = document.getElementById("pick-more-details-btn");
  const loading = document.getElementById("pick-more-details-loading");
  const extended = document.getElementById("pick-extended-details");

  btn.style.display = "none";
  loading.style.display = "block";

  try {
    const lead = await Api.fetchLeadDetailsFromServer(selectedPickerLeadId);
    if (!lead) throw new Error("Lead specifications not found on server.");

    // Fill specifications details
    document.getElementById("pick-veh-year").innerText = lead.year || (lead.l1Details && lead.l1Details.year) || "—";
    document.getElementById("pick-veh-colour").innerText = lead.colour || (lead.l1Details && lead.l1Details.colour) || "—";
    document.getElementById("pick-veh-fuel").innerText = lead.fuelType || (lead.l1Details && lead.l1Details.fuelType) || "—";
    const kms = lead.kmsDriven || (lead.l1Details && lead.l1Details.kmsDriven) || 0;
    document.getElementById("pick-veh-kms").innerText = kms ? `${kms.toLocaleString("en-IN")} km` : "—";
    document.getElementById("pick-veh-engine-no").innerText = (lead.l1Details && lead.l1Details.engineNumber) || "—";
    document.getElementById("pick-veh-chassis-no").innerText = (lead.l1Details && lead.l1Details.chassisNumber) || "—";

    // Payout and Payment Details
    const finalPrice = lead.paymentDetails && lead.paymentDetails.amount 
      ? lead.paymentDetails.amount 
      : (lead.l1Details && (lead.l1Details.agreedPrice || lead.l1Details.offeredPrice || lead.l1Details.recommendedPrice) 
         ? (lead.l1Details.agreedPrice || lead.l1Details.offeredPrice || lead.l1Details.recommendedPrice) 
         : lead.expectedPrice || 0);
    document.getElementById("pick-agreed-price").innerText = Utils.formatCurrency(finalPrice);

    const payMode = (lead.l1Details && lead.l1Details.paymentMode) || (lead.paymentDetails && lead.paymentDetails.paymentMode) || "—";
    const modeLabelMap = {
      upi: "UPI (Unified Payments Interface)",
      cash: "Cash Payout",
      bank: "Bank Transfer (NEFT/IMPS)",
    };
    document.getElementById("pick-payment-mode").innerText = modeLabelMap[payMode] || (payMode !== "—" ? payMode.toUpperCase() : "—");

    const payDetailsContainer = document.getElementById("pick-payment-details-container");
    const payDetails = (lead.l1Details && (lead.l1Details.paymentDetails || lead.l1Details.bankDetails)) || lead.paymentDetails || {};
    if (payMode === "upi") {
      payDetailsContainer.style.display = "block";
      payDetailsContainer.innerHTML = `<div><strong>UPI ID:</strong> <span>${payDetails.upiId || "—"}</span></div>`;
    } else if (payMode === "cash") {
      payDetailsContainer.style.display = "block";
      payDetailsContainer.innerHTML = `<div><strong>Status:</strong> <span style="color:var(--success-color); font-weight:600;">✓ Cash handover confirmed</span></div>`;
    } else if (payMode === "bank") {
      payDetailsContainer.style.display = "block";
      payDetailsContainer.innerHTML = `
        <div style="display:grid; gap:4px;">
          <div><strong>Holder:</strong> <span>${payDetails.accountHolder || "—"}</span></div>
          <div><strong>Bank:</strong> <span>${payDetails.bankName || "—"}</span></div>
          <div><strong>A/C No:</strong> <span>${payDetails.accountNumber || "—"}</span></div>
          <div><strong>IFSC:</strong> <span>${payDetails.ifscCode || "—"}</span></div>
        </div>
      `;
    } else {
      payDetailsContainer.style.display = "none";
    }

    // Condition & Valuation
    const bodyCond = lead.bodyCondition || (lead.l1Details && lead.l1Details.bodyCondition) || "—";
    document.getElementById("pick-cond-body").innerText = bodyCond !== "—" ? `${bodyCond}/10` : "—";

    const engineCond = (lead.l1Details && lead.l1Details.engineCondition) || "—";
    document.getElementById("pick-cond-engine").innerText = engineCond !== "—" ? `${engineCond}/10` : "—";

    const tyreCond = (lead.l1Details && lead.l1Details.tyreCondition) || "—";
    document.getElementById("pick-cond-tyre").innerText = tyreCond !== "—" ? `${tyreCond}/10` : "—";

    document.getElementById("pick-remarks").innerText = (lead.l1Details && lead.l1Details.accidentHistory) || "—";

    // Accessories
    const missingContainer = document.getElementById("pick-missing-parts");
    missingContainer.innerHTML = "";
    const missingParts = lead.l1Details && lead.l1Details.missingParts ? lead.l1Details.missingParts : [];
    if (missingParts.length === 0) {
      missingContainer.innerHTML = '<span style="color:var(--text-secondary); font-size:0.75rem;">None declared.</span>';
    } else {
      missingParts.forEach((part) => {
        const badge = document.createElement("span");
        badge.style.cssText =
          "background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.2); font-size:0.7rem; font-weight:600; padding:2px 6px; border-radius:4px; margin-right: 4px; margin-bottom: 4px; display: inline-block;";
        badge.innerText = part;
        missingContainer.appendChild(badge);
      });
    }

    // KYC Checklist
    const kycList = document.getElementById("pick-kyc-docs-list");
    kycList.innerHTML = "";
    const docs = (lead.l1Details && lead.l1Details.documents) || {};
    const uploadedDocs = Object.keys(docs).filter(k => docs[k]);
    if (uploadedDocs.length === 0) {
      kycList.innerHTML = '<span style="color:var(--text-secondary); font-size:0.75rem;">No documents uploaded.</span>';
    } else {
      uploadedDocs.forEach(k => {
        const li = document.createElement("li");
        li.style.fontSize = "0.75rem";
        li.style.marginBottom = "2px";
        const label = k.replace("rc", "RC ").toUpperCase();
        li.innerHTML = `<span style="color:var(--success-color); font-weight:600;">✓</span> ${label}`;
        kycList.appendChild(li);
      });
    }

    // Photo thumbnails
    const photoGallery = document.getElementById("pick-photos-gallery");
    photoGallery.innerHTML = "";
    const media = (lead.l1Details && lead.l1Details.media) || {};
    let photoUrls = Object.values(media).filter(Boolean);
    if (photoUrls.length === 0 && lead.l1Details && lead.l1Details.photos) {
      photoUrls = lead.l1Details.photos;
    }
    
    if (photoUrls.length === 0) {
      photoGallery.innerHTML = '<span style="color:var(--text-secondary); font-size:0.75rem;">No photos available.</span>';
    } else {
      photoUrls.forEach(url => {
        const mediaUrl = url.startsWith("http") ? url : (url.startsWith("/") ? API_BASE.replace('/api', '') + url : "assets/images/" + url);
        const box = document.createElement("div");
        box.style.cssText = "width:36px; height:36px; background:var(--surface-variant); border:1px solid var(--border-color); border-radius:4px; display:flex; align-items:center; justify-content:center; overflow:hidden;";
        if (mediaUrl.match(/\.(mp4|webm|ogg)$/i)) {
          box.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
        } else {
          box.innerHTML = `<img src="${mediaUrl}" style="width:100%; height:100%; object-fit:cover;">`;
        }
        photoGallery.appendChild(box);
      });
    }

    // Reveal extended details
    extended.style.display = "block";
  } catch (err) {
    console.error("Failed to load picker details:", err);
    Utils.showAlert(`Error loading details: ${err.message}`, "error");
    btn.style.display = "block";
  } finally {
    loading.style.display = "none";
  }
}

function triggerCallShort() {
  const phone = document.getElementById("pick-owner-phone-link").innerText;
  Utils.showAlert(
    `Triggering simulated phone dialer shortcut to: ${phone}`,
    "info",
  );
}

/**
 * Initialize HTML5 Canvas signature pad
 */
function initSignatureCanvas() {
  sigCanvas = document.getElementById("sig-canvas");
  if (!sigCanvas) return;

  sigContext = sigCanvas.getContext("2d");

  // Set dimensions based on client bounding box
  sigCanvas.width = sigCanvas.parentElement.clientWidth;
  sigCanvas.height = 160;

  // Visual settings
  sigContext.strokeStyle =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--text-primary")
      .trim() || "#ffffff";
  sigContext.lineWidth = 2.5;
  sigContext.lineCap = "round";
  sigContext.lineJoin = "round";

  hasSigned = false;

  // Bind mouse drawings
  sigCanvas.addEventListener("mousedown", startDrawing);
  sigCanvas.addEventListener("mousemove", draw);
  sigCanvas.addEventListener("mouseup", stopDrawing);
  sigCanvas.addEventListener("mouseleave", stopDrawing);

  // Bind touch drawings (mobile screens)
  sigCanvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    sigCanvas.dispatchEvent(mouseEvent);
  });

  sigCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    sigCanvas.dispatchEvent(mouseEvent);
  });

  sigCanvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent("mouseup", {});
    sigCanvas.dispatchEvent(mouseEvent);
  });
}

function startDrawing(e) {
  isDrawing = true;
  sigContext.beginPath();

  // Calculate relative positions
  const rect = sigCanvas.getBoundingClientRect();
  sigContext.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;

  const rect = sigCanvas.getBoundingClientRect();
  sigContext.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  sigContext.stroke();

  hasSigned = true; // Set validation interaction flag
}

function stopDrawing() {
  isDrawing = false;
}

function clearSigCanvas() {
  if (!sigCanvas || !sigContext) return;
  sigContext.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasSigned = false;
}

async function handleConfirmCollection() {
  if (!selectedPickerLeadId) return;

  if (!isProofSnapped) {
    alert("Please capture a Delivery Proof Photo before verifying handover.");
    return;
  }

  // Upload deferred proof if necessary
  if (isProofSnapped instanceof File) {
    try {
      const btn = document.getElementById("pick-confirm-btn") || event.target;
      const origText = btn.innerText;
      btn.innerText = "Uploading proof...";
      btn.disabled = true;
      const res = await Api.uploadFile(isProofSnapped);
      isProofSnapped = res.path.split('/').pop();
      btn.innerText = origText;
      btn.disabled = false;
    } catch (e) {
      alert("Failed to upload delivery proof. Please try again.");
      const btn = document.getElementById("pick-confirm-btn") || event.target;
      if (btn) { btn.innerText = "Confirm Handover & Submit"; btn.disabled = false; }
      return;
    }
  }

  if (!hasSigned) {
    alert(
      "Please ask the seller to draw their digital signature verification inside the handover pad.",
    );
    return;
  }

  const user = Auth.getCurrentUser();
  const lead = Api.getLeadById(selectedPickerLeadId);

  // Update lead status in localStorage to picked_up
  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === selectedPickerLeadId);
  if (idx !== -1) {
    const originalStatus = leads[idx].status;
    const originalPickupDetails = leads[idx].pickupDetails;

    leads[idx].status = "picked_up";
    leads[idx].pickupDetails = {
      pickedUpAt: new Date().toISOString(),
      pickedBy: user.id,
      proofPhoto: "pickup_proof.jpg",
      signature: sigCanvas ? sigCanvas.toDataURL("image/png") : null,
    };

    try {
      await Api.saveLeads(leads);

      await Api.logAction(
        user.id,
        "VEHICLE_PICKED_UP",
        "leads",
        selectedPickerLeadId,
        "payment_confirmed",
        `Collector: ${user.name}`,
      );

      // Notify L4 Scrapper role users
      const scrappers = Api.getUsers().filter((u) =>
        u.permissions.includes("l4_scrapper"),
      );
      scrappers.forEach((s) => {
        Api.addNotification(
          s.id,
          selectedPickerLeadId,
          `Vehicle ${lead.vehicleNumber} successfully picked up by field staff. Operational in scrapping bay.`,
        );
      });

      Utils.showAlert(
        `Vehicle ${lead.vehicleNumber} successfully picked up!`,
        "success",
      );
      selectedPickerLeadId = null;
      initPickerQueue();
    } catch (err) {
      console.error("Pickup confirmation failed:", err);
      leads[idx].status = originalStatus;
      leads[idx].pickupDetails = originalPickupDetails;
      Utils.showAlert(`Pickup confirmation failed: ${err.message}`, "error");
      await Api.syncAll();
      initPickerQueue();
    }
  }
}

// ====================================================
// SECTION 3: L4 SCRAPPER SALVAGE WORKFLOW
// ====================================================
let selectedScrapParts = [];

function initScrapQueue() {
  const queue = document.getElementById("scrapper-queue");
  if (!queue) return; // scrapper screen not rendered in current portal

  queue.innerHTML = "";

  const leads = Api.getLeads().filter((l) => l.status === "picked_up");

  if (leads.length === 0) {
    const emptyEl = document.getElementById("scrapper-queue-empty");
    if (emptyEl) emptyEl.style.display = "block";
    const splitEl = document.getElementById("scrapper-workspace-split");
    if (splitEl) splitEl.style.display = "none";
    const detailEl = document.getElementById("scrapper-detail-card");
    if (detailEl) detailEl.style.display = "none";
    return;
  }

  const emptyEl2 = document.getElementById("scrapper-queue-empty");
  if (emptyEl2) emptyEl2.style.display = "none";
  const splitEl2 = document.getElementById("scrapper-workspace-split");
  if (splitEl2) splitEl2.style.display = "grid";
  const queueEl = document.getElementById("scrapper-queue");
  if (queueEl) queueEl.style.display = "block";

  leads.forEach((l) => {
    const card = document.createElement("div");
    card.className = `queue-card ${selectedScrapLeadId === l.id ? "selected" : ""}`;
    card.setAttribute("data-id", l.id);
    card.onclick = () => selectScrapLead(l.id);
    card.innerHTML = `
      <div>
        <strong style="display:block;">${l.make || ""} ${l.model}</strong>
        <span style="font-size:0.75rem; font-family:monospace; color:var(--text-secondary);">${l.vehicleNumber}</span>
      </div>
      <span class="premium-badge md-badge-new">Picked Up</span>
    `;
    queue.appendChild(card);
  });

  if (selectedScrapLeadId && leads.find((l) => l.id === selectedScrapLeadId)) {
    const detailCard = document.getElementById("scrapper-detail-card");
    if (detailCard && detailCard.style.display !== "block") {
      selectScrapLead(selectedScrapLeadId);
    }
  } else {
    document.getElementById("scrapper-detail-card").style.display = "none";
    if (document.getElementById("scrapper-workspace-split")) {
      document.getElementById("scrapper-workspace-split").classList.remove("details-active");
    }
    selectedScrapLeadId = null;
  }
}

function selectScrapLead(leadId) {
  selectedScrapLeadId = leadId;

  // Toggle active styling classes in place
  document.querySelectorAll("#scrapper-queue .queue-card").forEach((c) => {
    if (c.getAttribute("data-id") === leadId) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  const lead = Api.getLeadById(leadId);
  if (!lead) return;

  // Hide queue and show details
  const queueEl = document.getElementById("scrapper-queue");
  if (queueEl) queueEl.style.display = "none";
  document.getElementById("scrapper-detail-card").style.display = "block";
  document
    .getElementById("scrapper-workspace-split")
    .classList.add("details-active");

  // Fill details
  document.getElementById("scrap-car-model").innerText =
    `${lead.make || ""} ${lead.model}`;
  document.getElementById("scrap-reg-no").innerText = lead.vehicleNumber;
  document.getElementById("scrap-engine-val").innerText = lead.l1Details
    ? lead.l1Details.engineNumber
    : "ENG-MOCK";
  document.getElementById("scrap-chassis-val").innerText = lead.l1Details
    ? lead.l1Details.chassisNumber
    : "CHA-MOCK";
  document.getElementById("scrap-accident-val").innerText =
    lead.l1Details && lead.l1Details.accidentHistory
      ? lead.l1Details.accidentHistory
      : "None";

  // Setup options parts checklist (Only populate parts that L1 evaluated as intact)
  const intactParts =
    lead.l1Details && lead.l1Details.missingParts
      ? lead.optionsPresent.filter(
          (x) => !lead.l1Details.missingParts.includes(x),
        )
      : [...lead.optionsPresent];

  selectedScrapParts = [...intactParts];
  renderScrapperAccessoriesPills(intactParts);

  // Clear inputs
  document.getElementById("scrap-metal-weight").value = "";
  document.getElementById("scrap-value-realized").value = "";
}

function renderScrapperAccessoriesPills(intactParts) {
  const container = document.getElementById("scrap-accessories-pills");
  container.innerHTML = "";

  if (intactParts.length === 0) {
    container.innerHTML =
      '<div style="font-size:0.75rem; color:var(--text-disabled);">No intact parts reported by L1 valuation.</div>';
    return;
  }

  intactParts.forEach((part) => {
    const isChecked = selectedScrapParts.includes(part);
    const pill = document.createElement("div");
    pill.className = `option-tile ${isChecked ? "active" : ""}`;
    pill.style.padding = "6px 12px";
    pill.innerHTML = `
      <svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px;"><path d="M20 6 9 17l-5-5"/></svg>
      <span>${part}</span>
    `;
    pill.onclick = () => {
      if (selectedScrapParts.includes(part)) {
        selectedScrapParts = selectedScrapParts.filter((x) => x !== part);
      } else {
        selectedScrapParts.push(part);
      }
      renderScrapperAccessoriesPills(intactParts);
    };
    container.appendChild(pill);
  });
}

async function handleCompleteScrapping() {
  if (!selectedScrapLeadId) return;

  const weight = parseFloat(
    document.getElementById("scrap-metal-weight").value,
  );
  const realizedVal = parseFloat(
    document.getElementById("scrap-value-realized").value,
  );

  if (!weight || !realizedVal) {
    alert(
      "Please log both the dry metal weight and actual realized scrap value before terminating lot.",
    );
    return;
  }

  const user = Auth.getCurrentUser();
  const lead = Api.getLeadById(selectedScrapLeadId);

  // Terminate and scrap lead
  const leads = Api.getLeads();
  const idx = leads.findIndex((l) => l.id === selectedScrapLeadId);
  if (idx !== -1) {
    const originalStatus = leads[idx].status;
    const originalScrapDetails = leads[idx].scrapDetails;

    leads[idx].status = "scrapped";
    leads[idx].scrapDetails = {
      scrappedAt: new Date().toISOString(),
      scrappedBy: user.id,
      weightKg: weight,
      scrapValue: realizedVal,
      recoveredSalvage: [...selectedScrapParts],
    };

    try {
      await Api.saveLeads(leads);

      await Api.logAction(
        user.id,
        "VEHICLE_SCRAPPED",
        "leads",
        selectedScrapLeadId,
        "picked_up",
        `Weight: ${weight}kg, Value: ₹${realizedVal}`,
      );

      // Alert turnover recalculations trigger
      Utils.showAlert(
        `Vehicle ${lead.vehicleNumber} successfully scrapped! turnover logged.`,
        "success",
      );
      selectedScrapLeadId = null;
      initScrapQueue();
    } catch (err) {
      console.error("Scrapping confirmation failed:", err);
      leads[idx].status = originalStatus;
      leads[idx].scrapDetails = originalScrapDetails;
      Utils.showAlert(`Scrapping confirmation failed: ${err.message}`, "error");
      await Api.syncAll();
      initScrapQueue();
    }
  }
}

// ==============================================
// NOTIFICATIONS
// ==============================================
function loadNotificationsCount() {
  const user = Auth.getCurrentUser();
  if (!user) return;
  const list = Api.getNotifications(user.id);
  const unread = list.filter((n) => !n.isRead);
  const dot = document.getElementById("notification-dot");
  if (dot) dot.style.display = unread.length > 0 ? "block" : "none";

  const box = document.getElementById("notification-list-box");
  if (!box) return;
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
    item.style.padding = "12px 16px";
    item.style.borderBottom = "1px solid var(--border-color)";
    item.style.fontSize = "0.82rem";
    item.style.color = "var(--text-primary)";
    item.innerText = n.message;
    item.onclick = async () => {
      n.isRead = true;
      await Api.markNotificationsAsRead(user.id);
      loadNotificationsCount();

      const dd = document.getElementById("notification-dropdown");
      if (dd) dd.style.display = "none";

      if (n.leadId) {
        const lead = Api.getLeadById(n.leadId);
        if (lead) {
          if (lead.status === "assigned" && user.permissions.includes("l1_employee")) {
            navigateTo("l1-leads");
            selectL1Lead(n.leadId);
          } else if (lead.status === "payment_confirmed" && user.permissions.includes("l4_picker_employee")) {
            navigateTo("picker");
            selectPickerLead(n.leadId);
          } else if (lead.status === "picked_up" && user.permissions.includes("l4_scrapper")) {
            navigateTo("scrapper");
            selectScrapLead(n.leadId);
          }
        }
      }
    };
    box.appendChild(item);
  });
}

function toggleNtfDropdown(event) {
  event.stopPropagation();
  const dd = document.getElementById("notification-dropdown");
  if (!dd) return;
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

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("global-media-upload");
  if (!fileInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    e.target.value = "";
    
    const cat = activeUploadCategory;
    const type = activeUploadType;
    if (!cat || !type) return;
    
    if (cat === "doc") {
      if (type === "rc-front") l1UploadedDocs.rcFront = file;
      else if (type === "rc-back") l1UploadedDocs.rcBack = file;
      else if (type === "aadhar") l1UploadedDocs.aadhar = file;
      else if (type === "pan") l1UploadedDocs.pan = file;
      else if (type === "insurance") l1UploadedDocs.insurance = file;
      else if (type === "noc") l1UploadedDocs.noc = file;
      else if (type === "form35") l1UploadedDocs.form35 = file;
      else if (type === "pickup-proof") {
        isProofSnapped = file;
        updateSingleDocCard(type, "Take Delivery Proof Photo", file, true);
        return;
      }
      updateL1DocVisualCards();
    } else if (cat === "media") {
      if (type === "ext-front") l1UploadedMedia.extFront = file;
      else if (type === "ext-rear") l1UploadedMedia.extRear = file;
      else if (type === "ext-left") l1UploadedMedia.extLeft = file;
      else if (type === "ext-right") l1UploadedMedia.extRight = file;
      else if (type === "interior") l1UploadedMedia.interior = file;
      else if (type === "engine") l1UploadedMedia.engine = file;
      else if (type === "odometer") l1UploadedMedia.odometer = file;
      else if (type === "damage") l1UploadedMedia.damage = file;
      else if (type === "video") l1UploadedMedia.video = file;
      updateL1MediaVisualCards();
    }
  });
});
