/**
 * API client to communicate with the Node.js/Express backend
 */
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function mapLeadToCamelCase(lead) {
  if (!lead) return null;
  return {
    id: lead.id,
    ownerName: lead.owner_name !== undefined ? lead.owner_name : lead.ownerName,
    phone: lead.phone,
    altPhone: lead.alt_phone !== undefined ? lead.alt_phone : lead.altPhone,
    email: lead.email,
    address: lead.address,
    vehicleNumber: lead.vehicle_number !== undefined ? lead.vehicle_number : lead.vehicleNumber,
    make: lead.make,
    model: lead.model,
    year: lead.year,
    colour: lead.colour,
    fuelType: lead.fuel_type !== undefined ? lead.fuel_type : lead.fuelType,
    kmsDriven: lead.kms_driven !== undefined ? lead.kms_driven : lead.kmsDriven,
    bodyCondition: lead.body_condition !== undefined ? lead.body_condition : lead.bodyCondition,
    optionsPresent: lead.options_present !== undefined ? lead.options_present : lead.optionsPresent,
    expectedPrice: lead.expected_price !== undefined ? lead.expected_price : lead.expectedPrice,
    wantsNewCar: lead.wants_new_car !== undefined ? lead.wants_new_car : lead.wantsNewCar,
    status: lead.status,
    assignedTo: lead.assigned_to !== undefined ? lead.assigned_to : lead.assignedTo,
    submittedBy: lead.submitted_by !== undefined ? lead.submitted_by : lead.submittedBy,
    createdAt: lead.created_at !== undefined ? lead.created_at : lead.createdAt,
    l1Details: lead.l1_details !== undefined ? lead.l1_details : lead.l1Details,
    l2Details: lead.l2_details !== undefined ? lead.l2_details : lead.l2Details,
    l3Details: lead.l3_details !== undefined ? lead.l3_details : lead.l3Details,
    l4Details: lead.l4_details !== undefined ? lead.l4_details : lead.l4Details,
  };
}

const Api = {
  // Local synchronous state cache
  users: [],
  leads: [],
  notifications: [],
  auditLogs: [],
  schedules: [],

  initDB() {
    // Left as a dummy function to prevent breaking legacy frontend calls
  },

  async syncAll() {
    try {
      this.users = await apiFetch('/users').catch(() => []);
      const leadsRes = await apiFetch('/leads?limit=1000').catch(() => ({ leads: [] }));
      const rawLeads = leadsRes.leads || leadsRes || [];
      this.leads = rawLeads.map(mapLeadToCamelCase);
      this.auditLogs = await apiFetch('/audit').catch(() => []);

      const currentUser = Auth.getCurrentUser();
      if (currentUser && (currentUser.permissions.includes('onsite_inspect') || currentUser.is_super_admin)) {
        this.schedules = await apiFetch('/onsite/schedules').catch(() => []);
      }
    } catch (error) {
      console.error('Error syncing local cache from backend:', error);
    }
  },

  // ------------------ AUTH API ------------------
  async login(email, password) {
    let portal = 'employee';
    if (window.location.pathname.includes('/admin/')) {
      portal = 'admin';
    } else if (window.location.pathname.includes('/onsite/')) {
      portal = 'onsite';
    }
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, portal }),
    });
    return data.user;
  },

  async logout() {
    return apiFetch('/auth/logout', { method: 'POST' });
  },

  async getMe() {
    const data = await apiFetch('/auth/me');
    return data.user;
  },

  // ------------------ USER API ------------------
  getUsers() {
    if (!this.users || this.users.length === 0) {
      return [
        { id: 'usr-1', name: 'Alok Sharma', email: 'alok@ldr.com', permissions: ['l1'] },
        { id: 'usr-2', name: 'Rohit Kumar', email: 'rohit@ldr.com', permissions: ['l1', 'l4_picker'] },
        { id: 'usr-3', name: 'Megha Singh', email: 'megha@ldr.com', permissions: ['l2'] },
        { id: 'usr-4', name: 'Vikram Gupta', email: 'vikram@ldr.com', permissions: ['l3'] },
        { id: 'usr-5', name: 'Ravi Yadav', email: 'ravi@ldr.com', permissions: ['l4_picker'] },
        { id: 'usr-6', name: 'Sanjay Dutt', email: 'sanjay@ldr.com', permissions: ['l4_scrapper'] },
        { id: 'usr-7', name: 'Inspector Deepak', email: 'deepak@ldr.com', permissions: ['onsite_inspect'] },
        { id: 'usr-8', name: 'Super Admin', email: 'admin@ldr.com', permissions: ['super_admin'], is_super_admin: true }
      ];
    }
    return this.users;
  },

  saveUsers(users) {
    for (const u of users) {
      const cached = this.users.find(c => c.id === u.id);
      if (!cached) {
        // Create user
        apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify(u),
        }).catch(err => console.error('Error creating user:', err));
      } else {
        // Update user
        apiFetch(`/users/${u.id}`, {
          method: 'PUT',
          body: JSON.stringify(u),
        }).catch(err => console.error('Error updating user:', err));
      }
    }
    this.users = [...users];
  },

  // ------------------ LEADS API ------------------
  getLeads() {
    return this.leads;
  },

  saveLeads(leads) {
    for (const l of leads) {
      const cached = this.leads.find(c => c.id === l.id);
      if (!cached) {
        // New lead creation
        apiFetch('/leads', {
          method: 'POST',
          body: JSON.stringify(l),
        }).catch(err => console.error('Error creating lead:', err));
      } else {
        // Detect specific stage updates by comparing cached state
        const statusChanged = cached.status !== l.status;
        const l1Changed = JSON.stringify(cached.l1Details || {}) !== JSON.stringify(l.l1Details || {});
        const l2Changed = JSON.stringify(cached.l2Details || {}) !== JSON.stringify(l.l2Details || {});
        const l3Changed = JSON.stringify(cached.l3Details || {}) !== JSON.stringify(l.l3Details || {});
        const l4Changed = JSON.stringify(cached.l4Details || {}) !== JSON.stringify(l.l4Details || {});
        const assignedChanged = cached.assignedTo !== l.assignedTo;

        if (l1Changed) {
          apiFetch(`/leads/${l.id}/l1`, {
            method: 'PUT',
            body: JSON.stringify(l.l1Details),
          }).catch(err => console.error('Error updating L1:', err));
        } else if (l2Changed) {
          apiFetch(`/leads/${l.id}/l2`, {
            method: 'PUT',
            body: JSON.stringify({ l2Details: l.l2Details, status: l.status }),
          }).catch(err => console.error('Error updating L2:', err));
        } else if (l3Changed) {
          apiFetch(`/leads/${l.id}/l3`, {
            method: 'PUT',
            body: JSON.stringify({ l3Details: l.l3Details, status: l.status }),
          }).catch(err => console.error('Error updating L3:', err));
        } else if (l4Changed) {
          apiFetch(`/leads/${l.id}/l4`, {
            method: 'PUT',
            body: JSON.stringify({ l4Details: l.l4Details, status: l.status }),
          }).catch(err => console.error('Error updating L4:', err));
        } else if (assignedChanged) {
          apiFetch(`/leads/${l.id}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ assignedTo: l.assignedTo }),
          }).catch(err => console.error('Error assigning lead:', err));
        } else if (statusChanged) {
          // Fallback status update using L4 endpoint as a generic updater
          apiFetch(`/leads/${l.id}/l4`, {
            method: 'PUT',
            body: JSON.stringify({ l4Details: l.l4Details || {}, status: l.status }),
          }).catch(err => console.error('Error updating status:', err));
        }
      }
    }
    this.leads = [...leads];
  },

  getLeadById(id) {
    return this.leads.find((l) => l.id === id);
  },

  createSellerLead(leadData) {
    const tempId = 'lead-' + Math.floor(100000 + Math.random() * 900000);
    const tempLead = {
      id: tempId,
      ownerName: leadData.ownerName,
      phone: leadData.phone,
      altPhone: leadData.altPhone || '',
      vehicleNumber: leadData.vehicleNumber,
      make: leadData.make || '',
      model: leadData.model || '',
      year: parseInt(leadData.year) || null,
      colour: leadData.colour || '',
      fuelType: leadData.fuelType || '',
      kmsDriven: parseInt(leadData.kmsDriven) || null,
      expectedPrice: parseInt(leadData.expectedPrice) || null,
      wantsNewCar: leadData.wantsNewCar === true || leadData.wantsNewCar === 'true',
      status: 'new',
      assignedTo: null,
      createdAt: new Date().toISOString(),
    };

    // Save locally immediately to keep UI responsive
    this.leads.unshift(tempLead);

    // Save to PostgreSQL in the background
    apiFetch('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    }).then(res => {
      // Replace temp lead with actual saved record containing DB constraints and assignments
      const idx = this.leads.findIndex(l => l.id === tempId);
      if (idx !== -1 && res.lead) {
        this.leads[idx] = mapLeadToCamelCase(res.lead);
      }
    }).catch(err => {
      console.error('Error creating seller lead on backend:', err);
    });

    return tempLead;
  },

  updateLeadStatus(leadId, status, userId, notes = '') {
    const lead = this.getLeadById(leadId);
    if (lead) {
      lead.status = status;
      this.saveLeads(this.leads);
    }
    return lead;
  },

  // ------------------ ONSITE / CALENDAR INSPECTION API ------------------
  getAuctions() {
    return this.schedules;
  },

  saveAuctions(auctions) {
    // Preserve local storage auctions if needed, or update schedules
    this.schedules = [...auctions];
    localStorage.setItem('rvsf_auctions', JSON.stringify(auctions));
  },

  // ------------------ NOTIFICATION API ------------------
  getNotifications(userId) {
    const notifications = localStorage.getItem('rvsf_notifications');
    const parsed = notifications ? JSON.parse(notifications) : [];
    return parsed.filter((n) => n.userId === userId || n.userId === 'all');
  },

  addNotification(userId, leadId, message) {
    const notifications = localStorage.getItem('rvsf_notifications');
    const parsed = notifications ? JSON.parse(notifications) : [];
    parsed.unshift({
      id: 'ntf-' + Math.floor(1000 + Math.random() * 9000),
      userId,
      leadId,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('rvsf_notifications', JSON.stringify(parsed));
  },

  markNotificationsAsRead(userId) {
    const notifications = localStorage.getItem('rvsf_notifications');
    const parsed = notifications ? JSON.parse(notifications) : [];
    parsed.forEach((n) => {
      if (n.userId === userId || n.userId === 'all') {
        n.isRead = true;
      }
    });
    localStorage.setItem('rvsf_notifications', JSON.stringify(parsed));
  },

  // ------------------ AUDIT LOGS ------------------
  getAuditLogs() {
    return this.auditLogs || [];
  },

  logAction(userId, action, entityType, entityId, oldVal, newVal) {
    apiFetch('/audit', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        action,
        entityType,
        entityId,
        oldVal: typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal,
        newVal: typeof newVal === 'object' ? JSON.stringify(newVal) : newVal,
      })
    })
    .then(() => {
      apiFetch('/audit')
        .then(newLogs => { this.auditLogs = newLogs; })
        .catch(err => console.error('Error syncing audit logs:', err));
    })
    .catch(err => console.error('Error logging action to backend:', err));
  },

  async uploadFile(file) {
    const url = `${API_BASE}/upload`;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Upload error status: ${response.status}`);
    }

    return response.json();
  },

  mockVahanCheck(vehicleNumber) {
    const formattedNum = (vehicleNumber || '').toUpperCase().replace(/\s+/g, '');
    return {
      vehicleNumber: formattedNum,
      ownerName: 'Registered Owner',
      registrationDate: '15-Oct-2014',
      fitnessUpto: '14-Oct-2029',
      insuranceUpto: '20-Oct-2026',
      challansCount: 0,
      hypothecation: 'None (No Lien)',
      blacklistStatus: 'Clean',
      checkedAt: new Date().toISOString(),
    };
  },
};
