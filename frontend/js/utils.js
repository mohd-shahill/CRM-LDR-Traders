/**
 * Utils module containing shared helpers for RVSF - LDR TRADERS
 */
const Utils = {
  /**
   * Initialize theme (Light/Dark mode)
   */
  initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeToggleIcons(savedTheme);

    const toggleBtns = document.querySelectorAll(".theme-toggle-btn");
    toggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const currentTheme =
          document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        this.updateThemeToggleIcons(newTheme);
      });
    });
  },

  /**
   * Update all theme toggle buttons with appropriate icons
   */
  updateThemeToggleIcons(theme) {
    const toggleBtns = document.querySelectorAll(".theme-toggle-btn");
    toggleBtns.forEach((btn) => {
      if (theme === "dark") {
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
        btn.setAttribute("aria-label", "Switch to Light Mode");
      } else {
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
        btn.setAttribute("aria-label", "Switch to Dark Mode");
      }
    });
  },

  /**
   * Display a clean, custom Material Alert
   */
  showAlert(message, type = "info", duration = 4000) {
    let alertContainer = document.getElementById("md-alert-container");
    if (!alertContainer) {
      alertContainer = document.createElement("div");
      alertContainer.id = "md-alert-container";
      alertContainer.style.position = "fixed";
      alertContainer.style.bottom = "24px";
      alertContainer.style.right = "24px";
      alertContainer.style.zIndex = "9999";
      alertContainer.style.display = "flex";
      alertContainer.style.flexDirection = "column";
      alertContainer.style.gap = "10px";
      alertContainer.style.maxWidth = "360px";
      alertContainer.style.width = "100%";
      document.body.appendChild(alertContainer);
    }

    const alertEl = document.createElement("div");
    alertEl.className = `md-alert md-alert-${type}`;
    alertEl.style.margin = "0";
    alertEl.style.boxShadow = "var(--shadow-elevation-2)";
    alertEl.style.animation =
      "slideIn 0.25s cubic-bezier(0, 0, 0.2, 1) forwards";
    alertEl.style.opacity = "0";
    alertEl.style.transform = "translateY(20px)";

    // Inject Slide In CSS if not present
    if (!document.getElementById("slide-in-keyframe")) {
      const style = document.createElement("style");
      style.id = "slide-in-keyframe";
      style.innerHTML = `
        @keyframes slideIn {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          to { opacity: 0; transform: translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    let icon = "";
    if (type === "success") {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10.01-3-3"/></svg>`;
    } else if (type === "error") {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    alertEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        ${icon}
        <span>${message}</span>
      </div>
    `;

    alertContainer.appendChild(alertEl);

    setTimeout(() => {
      alertEl.style.animation =
        "fadeOut 0.25s cubic-bezier(0.4, 0, 1, 1) forwards";
      setTimeout(() => {
        alertEl.remove();
        if (alertContainer.children.length === 0) {
          alertContainer.remove();
        }
      }, 250);
    }, duration);
  },

  /**
   * Format a number as Indian Rupee Currency (₹)
   */
  formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  },

  /**
   * Simulated receipt generation trigger
   */
  mockDownloadReceiptPDF(lead) {
    if (!lead) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      this.showAlert(
        "Popup blocker prevented receipt preview. Please enable popups.",
        "error",
      );
      return;
    }

    const payMode = (lead.l1Details && lead.l1Details.paymentMode) || "bank";
    const bankDetails =
      lead.l1Details && lead.l1Details.bankDetails
        ? lead.l1Details.bankDetails
        : {
            accountHolder: lead.ownerName || "—",
            bankName: "HDFC Bank Ltd",
            accountNumber: "50100455667889",
            ifscCode: "HDFC0000240",
          };
    const payDetails =
      lead.l1Details &&
      lead.l1Details.paymentDetails &&
      lead.l1Details.paymentDetails.upiId
        ? lead.l1Details.paymentDetails
        : {
            upiId:
              (lead.ownerName
                ? lead.ownerName.toLowerCase().replace(/\s+/g, "")
                : "seller") + "@okaxis",
          };
    const utr =
      (lead.paymentDetails && lead.paymentDetails.utrNumber) ||
      lead.utrNumber ||
      "N/A";
    const amount =
      (lead.paymentDetails && lead.paymentDetails.amount) ||
      (lead.l1Details && lead.l1Details.agreedPrice) ||
      lead.expectedPrice ||
      0;

    let modeText = "Bank Transfer";
    let coordHtml = "";
    if (payMode === "upi") {
      modeText = "UPI Transfer";
      coordHtml = `<div class="row"><span>UPI ID</span><strong>${payDetails.upiId || "—"}</strong></div>`;
    } else if (payMode === "bank") {
      modeText = "Bank Transfer (NEFT/IMPS)";
      coordHtml = `
        <div class="row"><span>Account Holder</span><strong>${bankDetails.accountHolder || "—"}</strong></div>
        <div class="row"><span>Bank Name</span><strong>${bankDetails.bankName || "—"}</strong></div>
        <div class="row"><span>Account Number</span><strong>${bankDetails.accountNumber || "—"}</strong></div>
        <div class="row"><span>IFSC Code</span><strong>${bankDetails.ifscCode || "—"}</strong></div>
      `;
    } else {
      modeText = "Cash Handover";
      coordHtml = `<div class="row"><span>Handover Status</span><strong>Confirmed</strong></div>`;
    }

    const receiptId = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
    const dateStr =
      lead.paymentDetails && lead.paymentDetails.confirmedAt
        ? new Date(lead.paymentDetails.confirmedAt).toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN");

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${lead.vehicleNumber}</title>
          <style>
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 40px; background: #f3f4f6; display: flex; justify-content: center; }
            .receipt-container { width: 100%; max-width: 550px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { text-align: center; border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
            .brand { font-size: 14px; font-weight: bold; color: #0284c7; letter-spacing: 1px; text-transform: uppercase; }
            .title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 6px 0 0 0; }
            .status-badge { display: inline-block; padding: 4px 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; font-size: 11px; font-weight: bold; color: #15803d; text-transform: uppercase; margin-top: 10px; }
            
            .amount-box { text-align: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .amount-label { font-size: 12px; color: #166534; font-weight: 500; text-transform: uppercase; margin-bottom: 4px; }
            .amount-value { font-size: 28px; font-weight: bold; color: #15803d; }
            
            .section { margin-bottom: 20px; }
            .section-title { font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; margin: 0 0 10px 0; }
            
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .row span { color: #6b7280; }
            .row strong { color: #1f2937; font-weight: 600; }
            
            .reg-plate { font-family: monospace; font-size: 12px; padding: 2px 6px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; font-weight: bold; color: #374151; }
            
            .footer { text-align: center; margin-top: 35px; font-size: 11px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 20px; }
            
            @media print {
              body { background: #ffffff; padding: 0; }
              .receipt-container { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="brand">RVSF | LDR TRADERS</div>
              <div class="title">PAYMENT RECEIPT VOUCHER</div>
              <div class="status-badge">SUCCESSFUL</div>
            </div>
            
            <div class="amount-box">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">${this.formatCurrency(amount)}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Transaction Info</div>
              <div class="row"><span>Receipt ID</span><strong>${receiptId}</strong></div>
              <div class="row"><span>Date & Time</span><strong>${dateStr}</strong></div>
              <div class="row"><span>Transaction UTR</span><strong><span style="font-family: monospace; font-size: 13px;">${utr}</span></strong></div>
              <div class="row"><span>Payment Mode</span><strong>${modeText}</strong></div>
            </div>
            
            <div class="section">
              <div class="section-title">Payee Details</div>
              <div class="row"><span>Seller Name</span><strong>${lead.ownerName || "—"}</strong></div>
              <div class="row"><span>Phone Number</span><strong>${lead.phone || "—"}</strong></div>
              ${coordHtml}
            </div>
            
            <div class="section">
              <div class="section-title">Vehicle Info</div>
              <div class="row"><span>Vehicle Model</span><strong>${lead.make || ""} ${lead.model || "—"}</strong></div>
              <div class="row"><span>Registration No.</span><strong><span class="reg-plate">${lead.vehicleNumber || "—"}</span></strong></div>
              <div class="row"><span>Details</span><strong>${lead.year || "—"} | ${lead.fuelType || "—"}</strong></div>
            </div>
            
            <div class="footer">
              <p>This is an electronically generated payment confirmation receipt.</p>
              <p style="margin-top: 5px;">Thank you for selling your vehicle to RVSF LDR Traders.</p>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  },
};
