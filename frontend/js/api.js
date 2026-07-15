/**
 * API client to communicate with the Node.js/Express backend
 */
const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

function getPortalName() {
  let portal = 'employee';
  if (window.location.pathname.includes('/admin/')) {
    portal = 'admin';
  } else if (window.location.pathname.includes('/onsite/')) {
    portal = 'onsite';
  }
  return portal;
}

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    'X-Portal': getPortalName(),
    ...options.headers,
  };

  const response = await fetch(url, options);
  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      sessionStorage.removeItem("rvsf_session_user");
      if (!window.location.pathname.endsWith('login.html')) {
        if (typeof Auth !== 'undefined' && typeof Auth.redirect === 'function') {
          Auth.redirect();
        } else {
          window.location.href = 'login.html';
        }
      }
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function mapLeadToCamelCase(lead) {
  if (!lead) return null;
  const l3Details = lead.l3_details || lead.l3Details || {};
  const l4Details = lead.l4_details || lead.l4Details || {};
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
    l3Details: l3Details,
    l4Details: l4Details,
    assignedPicker: l4Details.assignedPicker !== undefined ? l4Details.assignedPicker : (lead.assigned_picker || lead.assignedPicker),
    scheduledDate: l4Details.scheduledDate !== undefined ? l4Details.scheduledDate : (lead.scheduled_date || lead.scheduledDate),
    paymentDetails: l3Details.paymentDetails || lead.paymentDetails,
    pickupDetails: l4Details.pickupDetails || lead.pickupDetails,
    scrapDetails: l4Details.scrapDetails || lead.scrapDetails,
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
      this.pristineLeads = JSON.parse(JSON.stringify(this.leads));
      this.auditLogs = await apiFetch('/audit').catch(() => []);
      this.notifications = await apiFetch('/notifications').catch(() => []);

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

  getUsers() {
    return [...(this.users || [])];
  },

  async saveUsers(users) {
    for (const u of users) {
      const cached = this.users.find(c => c.id === u.id);
      try {
        if (!cached) {
          await apiFetch('/users', {
            method: 'POST',
            body: JSON.stringify(u),
          });
        } else {
          await apiFetch(`/users/${u.id}`, {
            method: 'PUT',
            body: JSON.stringify(u),
          });
        }
      } catch (err) {
        console.error('Error saving user:', err);
        throw err;
      }
    }
    this.users = [...users];
  },

  // ------------------ LEADS API ------------------
  getLeads() {
    return this.leads;
  },

  async saveLeads(leads) {
    for (const l of leads) {
      // Merge pickupDetails, scrapDetails, assignedPicker, and scheduledDate into l4Details to save in the DB
      l.l4Details = {
        ...(l.l4Details || {}),
        pickupDetails: l.pickupDetails || (l.l4Details && l.l4Details.pickupDetails),
        scrapDetails: l.scrapDetails || (l.l4Details && l.l4Details.scrapDetails),
        assignedPicker: l.assignedPicker !== undefined ? l.assignedPicker : (l.l4Details && l.l4Details.assignedPicker),
        scheduledDate: l.scheduledDate !== undefined ? l.scheduledDate : (l.l4Details && l.l4Details.scheduledDate),
      };

      const cached = (this.pristineLeads || []).find(c => c.id === l.id);
      try {
        if (!cached) {
          // New lead creation
          const res = await apiFetch('/leads', {
            method: 'POST',
            body: JSON.stringify(l),
          });
          if (res && res.lead && res.lead.id) {
            l.id = res.lead.id;
          }
        } else {
          // Detect specific stage updates by comparing cached state
          const statusChanged = cached.status !== l.status;
          const l1Changed = JSON.stringify(cached.l1Details || {}) !== JSON.stringify(l.l1Details || {});
          const l2Changed = JSON.stringify(cached.l2Details || {}) !== JSON.stringify(l.l2Details || {});
          const l3Changed = JSON.stringify(cached.l3Details || {}) !== JSON.stringify(l.l3Details || {});
          const l4Changed = JSON.stringify(cached.l4Details || {}) !== JSON.stringify(l.l4Details || {});
          const assignedChanged = cached.assignedTo !== l.assignedTo;
          const pickerChanged = cached.assignedPicker !== l.assignedPicker || cached.scheduledDate !== l.scheduledDate;

          if (l1Changed) {
            await apiFetch(`/leads/${l.id}/l1`, {
              method: 'PUT',
              body: JSON.stringify(l.l1Details),
            });
          } else if (l2Changed) {
            await apiFetch(`/leads/${l.id}/l2`, {
              method: 'PUT',
              body: JSON.stringify({ l2Details: l.l2Details, status: l.status }),
            });
          } else if (l3Changed) {
            await apiFetch(`/leads/${l.id}/l3`, {
              method: 'PUT',
              body: JSON.stringify({ l3Details: l.l3Details, status: l.status }),
            });
          } else if (l4Changed || pickerChanged) {
            await apiFetch(`/leads/${l.id}/l4`, {
              method: 'PUT',
              body: JSON.stringify({ l4Details: l.l4Details, status: l.status }),
            });
          } else if (assignedChanged) {
            await apiFetch(`/leads/${l.id}/assign`, {
              method: 'PUT',
              body: JSON.stringify({ assignedTo: l.assignedTo }),
            });
          } else if (statusChanged) {
            // Fallback status update using L4 endpoint as a generic updater
            await apiFetch(`/leads/${l.id}/l4`, {
              method: 'PUT',
              body: JSON.stringify({ l4Details: l.l4Details || {}, status: l.status }),
            });
          }
        }
      } catch (err) {
        console.error('Error saving lead:', err);
        throw err;
      }
    }
    this.leads = [...leads];
    this.pristineLeads = JSON.parse(JSON.stringify(this.leads));
  },

  getLeadById(id) {
    return this.leads.find((l) => l.id === id);
  },

  async fetchLeadDetailsFromServer(id) {
    const rawLead = await apiFetch(`/leads/${id}`);
    const mapped = mapLeadToCamelCase(rawLead);
    // Update local cache
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.leads[idx] = mapped;
    }
    return mapped;
  },

  async createSellerLead(leadData) {
    // Save to PostgreSQL and wait for confirmation
    const res = await apiFetch('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });

    const savedLead = res.lead ? mapLeadToCamelCase(res.lead) : null;

    if (savedLead) {
      // Add the DB-confirmed lead to local cache
      this.leads.unshift(savedLead);
    }

    return savedLead;
  },

  async updateLeadStatus(leadId, status, userId, notes = '') {
    const lead = this.getLeadById(leadId);
    if (lead) {
      lead.status = status;
      await this.saveLeads(this.leads);
    }
    return lead;
  },

  // ------------------ FILE UPLOAD API ------------------
  async uploadFile(file, fieldName = 'file') {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    // We cannot use apiFetch directly because we need to let the browser set the boundary in Content-Type for FormData
    const url = `${API_BASE}/upload`;
    const options = {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Portal': getPortalName(),
      },
      body: formData
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async deleteFile(filename) {
    if (!filename) return;
    return apiFetch(`/upload/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
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
    return this.notifications || [];
  },

  async addNotification(userId, leadId, message) {
    try {
      await apiFetch('/notifications', {
        method: 'POST',
        body: JSON.stringify({ userId, leadId, message }),
      });
      // Refresh local copy
      this.notifications = await apiFetch('/notifications').catch(() => []);
    } catch (err) {
      console.error('Error adding notification:', err);
    }
  },

  async markNotificationsAsRead(userId) {
    try {
      await apiFetch('/notifications/read', {
        method: 'PUT',
      });
      if (this.notifications) {
        this.notifications.forEach(n => n.isRead = true);
      }
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  },

  // ------------------ AUDIT LOGS ------------------
  getAuditLogs() {
    return this.auditLogs || [];
  },

  async logAction(userId, action, entityType, entityId, oldVal, newVal) {
    try {
      await apiFetch('/audit', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          action,
          entityType,
          entityId,
          oldVal: typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal,
          newVal: typeof newVal === 'object' ? JSON.stringify(newVal) : newVal,
        })
      });
      this.auditLogs = await apiFetch('/audit');
    } catch (err) {
      console.error('Error logging action to backend:', err);
    }
  },

  async uploadFile(file, fieldName = 'file') {
    const url = `${API_BASE}/upload`;
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'X-Portal': getPortalName(),
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Upload error status: ${response.status}`);
    }

    return response.json();
  },

  async uploadPublicFile(file) {
    const url = `${API_BASE}/upload/public`;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'X-Portal': getPortalName(),
      }
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
