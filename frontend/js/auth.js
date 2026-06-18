/**
 * Authentication Helper for RVSF - LDR TRADERS
 * Manages worker sessions and permission checking.
 */
const Auth = {
  /**
   * Log a user in by email and password
   */
  async login(email, password) {
    try {
      const user = await Api.login(email, password);
      sessionStorage.setItem("rvsf_session_user", JSON.stringify(user));
      return user;
    } catch (e) {
      throw e;
    }
  },

  /**
   * Log the current user out
   */
  async logout() {
    try {
      await Api.logout();
    } catch (e) {
      console.error('Logout API error:', e);
    }
    sessionStorage.removeItem("rvsf_session_user");
    this.redirect();
  },

  /**
   * Sync check the session against the backend
   */
  async checkSession() {
    try {
      const user = await Api.getMe();
      sessionStorage.setItem("rvsf_session_user", JSON.stringify(user));
      return user;
    } catch (e) {
      sessionStorage.removeItem("rvsf_session_user");
      return null;
    }
  },

  /**
   * Get the currently logged-in user session from cache
   */
  getCurrentUser() {
    const userJson = sessionStorage.getItem("rvsf_session_user");
    return userJson ? JSON.parse(userJson) : null;
  },

  /**
   * Verify if the current user has a specific permission
   * Super Admins automatically pass all checks.
   */
  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.is_super_admin || user.permissions.includes("super_admin"))
      return true;
    return user.permissions.includes(permission);
  },

  /**
   * Redirect to local login page of the current portal
   */
  redirect() {
    const path = window.location.pathname;
    if (path.includes("/employee/")) {
      window.location.href = "login.html";
    } else if (path.includes("/admin/")) {
      window.location.href = "login.html";
    } else if (path.includes("/onsite/")) {
      window.location.href = "login.html";
    } else if (path.includes("/auction/")) {
      window.location.href = "login.html";
    } else {
      window.location.href = "/employee/login.html";
    }
  },

  /**
   * Protect a portal route. Redirects to gate if no access.
   */
  protectPortal(requiredPermission) {
    const user = this.getCurrentUser();
    if (!user) {
      alert("Authentication required. Redirecting to login.");
      this.redirect();
      return false;
    }

    if (requiredPermission && !this.hasPermission(requiredPermission)) {
      alert(`Access Denied: You do not have permissions for this dashboard.`);
      this.redirect();
      return false;
    }

    return true;
  },
};
