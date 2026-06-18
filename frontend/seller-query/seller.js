/**
 * Public Seller Form Controller Logic
 */

let selectedPhotos = [];
let selectedVideos = [];

// Initializations
document.addEventListener('DOMContentLoaded', () => {
  // Populate Years dropdown
  const yearSelect = document.getElementById('veh-year');
  if (yearSelect) {
    const maxYear = 2025;
    for (let yr = maxYear; yr >= 1990; yr--) {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.innerText = yr;
      if (yr === 2014) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }
});

/**
 * Handle Interactive Benefits Toggle Description Updates
 */
function toggleInteractiveBenefit(isExchange) {
  const messageBox = document.getElementById('benefit-message-box');
  if (!messageBox) return;

  if (isExchange) {
    messageBox.classList.add('green');
    messageBox.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M12 20v-3a8 8 0 0 0-8-8H3"/><path d="M12 4v3a8 8 0 0 0 8 8h1"/></svg>
      <div>
        <strong style="font-size: 0.95rem; display:block;">Premium New Car Exchange Bonus Voucher!</strong>
        <span style="font-size: 0.85rem;">You are eligible for a factory exchange credit certificate worth up to <strong>₹25,000</strong> redeemable instantly at dealer networks!</span>
      </div>
    `;
  } else {
    messageBox.classList.remove('green');
    messageBox.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      <div>
        <strong style="font-size: 0.95rem; display:block;">Standard Cash Bonus Added!</strong>
        <span style="font-size: 0.85rem;">You are eligible for a cash bonus of <strong>₹10,500</strong> credited in addition to the final scrap valuation!</span>
      </div>
    `;
  }
}

/**
 * Process Selected Image Files & Generate Thumbnails
 */
function processPhotos(event) {
  const files = Array.from(event.target.files);
  const grid = document.getElementById('photo-preview-grid');

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const photoId = 'img-' + Math.floor(Math.random() * 100000);
      const dataUrl = e.target.result;

      selectedPhotos.push({ id: photoId, name: file.name, url: dataUrl });

      // Create preview element
      const container = document.createElement('div');
      container.className = 'img-thumb-container';
      container.id = photoId;
      container.innerHTML = `
        <img src="${dataUrl}" alt="Preview image">
        <button type="button" class="remove-btn" onclick="removePhotoThumb('${photoId}')">×</button>
      `;
      grid.appendChild(container);
    };
    reader.readAsDataURL(file);
  });
}

function removePhotoThumb(photoId) {
  selectedPhotos = selectedPhotos.filter(p => p.id !== photoId);
  const el = document.getElementById(photoId);
  if (el) el.remove();
}

/**
 * Process Walkaround Videos Previews
 */
function processVideos(event) {
  const files = Array.from(event.target.files);
  const grid = document.getElementById('video-preview-grid');

  if (selectedVideos.length + files.length > 3) {
    Utils.showAlert('A maximum of 3 videos can be attached.', 'error');
    return;
  }

  files.forEach(file => {
    const videoId = 'vid-' + Math.floor(Math.random() * 100000);
    selectedVideos.push({ id: videoId, name: file.name });

    const container = document.createElement('div');
    container.className = 'img-thumb-container';
    container.id = videoId;
    container.style.backgroundColor = 'var(--input-bg)';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.padding = '8px';
    container.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M23 7a2 2 0 0 0-2.45-1.45L16 7V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2l4.55 1.45A2 2 0 0 0 23 17V7z"/></svg>
      <span style="font-size:0.6rem; color:var(--text-muted); display:block; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; margin-top:4px;">${file.name}</span>
      <button type="button" class="remove-btn" onclick="removeVideoThumb('${videoId}')">×</button>
    `;
    grid.appendChild(container);
  });
}

function removeVideoThumb(videoId) {
  selectedVideos = selectedVideos.filter(v => v.id !== videoId);
  const el = document.getElementById(videoId);
  if (el) el.remove();
}

/**
 * Handle Query form submission
 */
function handleQuerySubmit(event) {
  event.preventDefault();

  // Validate Photo count
  if (selectedPhotos.length < 2) {
    Utils.showAlert('Please attach at least 2 vehicle photographs to verify physical condition.', 'error');
    return;
  }

  // Retrieve inputs
  const ownerName = document.getElementById('owner-name').value.trim();
  const phone = document.getElementById('owner-phone').value.trim();
  const vehicleNumber = document.getElementById('veh-reg').value.trim().toUpperCase();
  const model = document.getElementById('veh-model').value.trim();
  const year = document.getElementById('veh-year').value;
  const expectedPrice = document.getElementById('expected-price').value;
  const wantsNewCar = document.getElementById('exchange-benefit-toggle').checked;

  // Retrieve accessory states from the individual modern slider checkbox switches
  const optionsPresent = [];
  if (document.getElementById('acc-battery').checked) optionsPresent.push('Battery');
  if (document.getElementById('acc-ac').checked) optionsPresent.push('AC');
  if (document.getElementById('acc-music').checked) optionsPresent.push('Music System');

  // Compile lead package
  const leadData = {
    ownerName,
    phone,
    vehicleNumber,
    model,
    year,
    optionsPresent,
    expectedPrice,
    wantsNewCar
  };

  try {
    // Attempt insert into local DB state
    const newLead = Api.createSellerLead(leadData);

    // Hide input card & display success block
    document.getElementById('query-card').style.display = 'none';
    document.getElementById('success-reg-plate').innerText = vehicleNumber;
    document.getElementById('success-card').style.display = 'block';

    // Clear uploads
    selectedPhotos = [];
    selectedVideos = [];

    // Scroll up
    window.scrollTo({ top: 0, behavior: 'smooth' });

    Utils.showAlert('Car scrap recycling request submitted successfully!', 'success');
  } catch (err) {
    // Show validation alert
    Utils.showAlert(err.message, 'error');

    // Accent outline the input field
    const regInput = document.getElementById('veh-reg');
    if (regInput) {
      regInput.style.borderColor = 'rgba(239, 68, 68, 0.8)';
      regInput.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
      regInput.focus();
    }
  }
}
