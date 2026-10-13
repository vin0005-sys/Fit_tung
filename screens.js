/*
  FIT_TUNG — SCREEN DESIGN (screens.js)
  These functions create the HTML for each page.
  For what buttons DO, see actions.js.
  For SQL access, see database.js.
*/

// ============================================================
// 3. MAIN PAGES — HOME, WARDROBE, PREFERENCES, PROFILE
// ============================================================

function homePage() {
  const outfit = dailyOutfit();
  const dateLabel = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const event = getNextEventToday();
  const summary = event && calendarIsFormalDay() && settings.formal ? ' — consider a smarter outfit' : '';
  return pageLayout(`
    <div class="eyebrow">${safe(dateLabel)}</div>
    <h1 class="page-title">Today's Recommended Outfit</h1>
    <div class="outfit-grid">${outfit.map(item => clothingCard(item)).join('')}</div>
    <h2 class="section-title">Why this works</h2>
    <div class="reason">
      <span class="reason-icon">${icon('cloudsun', 19)}</span>
      <div><b>Weather</b><br>${safe(weatherText())}</div>
    </div>
    <div class="reason">
      <span class="reason-icon">${icon('calendar', 19)}</span>
      <div><b>Schedule</b><br>${safe(scheduleText() + summary)}</div>
    </div>
  `, 'home');
}

function wardrobePage() {
  const categoryNames = ['Jacket', 'Top', 'Bottoms', 'Shoes', 'Accessory'];
  const colours = ['Navy', 'Black', 'White', 'Beige', 'Blue'];
  const seasons = ['Summer', 'Winter', 'Spring', 'Autumn'];

  function options(values) {
    return values.map(value => `<option>${value}</option>`).join('');
  }

  return pageLayout(`
    <div class="eyebrow">Your collection</div>
    <h1 class="page-title">My Wardrobe</h1>
    <div class="filters">
      <select id="category" onchange="filterItems()" aria-label="Category filter">
        <option value="">Category: All</option>${options(categoryNames)}
      </select>
      <select id="color" onchange="filterItems()" aria-label="Colour filter">
        <option value="">Color: All</option>${options(colours)}
      </select>
      <select id="season" onchange="filterItems()" aria-label="Season filter">
        <option value="">Season: All</option>${options(seasons)}
      </select>
    </div>
    <div class="wardrobe-grid" id="wardrobeItems">
      ${clothes.map(item => clothingCard(item, true)).join('') || 'No clothes yet. Tap + to add some.'}
    </div>
  `, 'wardrobe');
}

function switchRow(key, label, description) {
  return `<div class="setting-row">
    <div><div class="setting-copy">${label}</div><div class="sub">${description}</div></div>
    <button class="switch ${settings[key] ? 'on' : ''}" role="switch"
      aria-checked="${settings[key]}" onclick="toggleSetting('${key}')"><span></span></button>
  </div>`;
}

function preferencesPage() {
  return pageLayout(`
    <div class="eyebrow">Edit generation</div>
    <h1 class="page-title">Preferences</h1>
    <div class="group-label" style="margin-top:38px">Data integrations</div>
    <div class="setting-row">
      <div><div class="setting-copy">Location &amp; Weather</div>
      <div class="sub">${safe(weatherLocation ? weatherLocation.name + ' · ' + weatherDescription(currentWeather?.current?.weather_code) : 'Choose a location for live forecasts')}</div></div>
      <button class="mini-button" onclick="syncWeather()">${icon('cloud', 15)} Sync</button>
    </div>
    <div class="integration-tools">
      <input id="weather-city" aria-label="Weather city" placeholder="Or enter city" autocomplete="address-level2">
      <button class="mini-button" onclick="setWeatherCity()">Set city</button>
    </div>
    <div class="setting-row">
      <div><div class="setting-copy">Connected Calendars</div>
      <div class="sub">${safe(calendarSource ? calendarSource + ' · ' + calendarEvents.length + ' events' : 'Connect Google or import a calendar')}</div></div>
      <button class="mini-button dark" onclick="connectGoogleCalendar()">${icon('circleplus', 15)} Google</button>
      <button class="mini-button" onclick="refreshGoogleCalendar()">${icon('calendar', 15)} Sync</button>
    </div>
    <div class="integration-tools">
      <label class="mini-button calendar-import">Import .ics
        <input type="file" accept=".ics,text/calendar" onchange="importICS(event)" hidden>
      </label>
      ${calendarSource ? '<button class="mini-button" onclick="disconnectCalendar()">Disconnect</button>' : ''}
    </div>
    <div class="group-label">Recommendation model</div>
    ${switchRow('formal', 'Formal Outfit Weighting', 'Prioritise tailored suits & pleated silhouettes')}
    ${switchRow('heat', 'Adaptive Heat Mitigation', 'Avoid heavier wool fabrics above 70°F')}
    <div class="setting-row">
      <div><div class="setting-copy">Reference Outfits</div>
      <div class="sub">Add outfits to use as references<br>for your style</div></div>
      <button class="mini-button dark" onclick="notice('Reference outfits are not connected yet.')">
        ${icon('circleplus', 15)} Add</button>
      <button class="mini-button" onclick="notice('No reference outfits yet.')">
        ${icon('calendar', 15)} Edit</button>
    </div>
    <div class="group-label" style="margin-top:24px">Other style preferences</div>
    <p class="sub">Specify favorite brands, color palettes, or fabrics to prioritize/exclude:</p>
    <textarea id="notes" aria-label="Style preferences">${safe(settings.notes)}</textarea>
  `, 'preferences');
}

function profilePage() {
  return pageLayout(`
    <div class="eyebrow">Settings</div>
    <h1 class="page-title">Profile</h1>
    <div class="group-label" style="margin-top:70px">Account</div>
    <details class="accordion"><summary>Account</summary>
      <div>Name: ${safe(cloudUser?.user_metadata?.first_name || loadData('fit_name', 'Guest'))}
        <p class="preview-note">${cloudUser
          ? 'Your wardrobe and preferences are saved in SQLite.'
          : 'Your clothes and settings are currently saved in this browser.'}</p>
        ${cloudUser
          ? `<button class="mini-button" onclick="signOut()">Sign out</button>
             <button class="mini-button" onclick="importLocalWardrobe()">Import saved browser clothes</button>`
          : `<button class="mini-button" onclick="go('signin')">Sign in</button>`}
      </div>
    </details>
    <div class="group-label" style="margin-top:45px">Sizing</div>
    <details class="accordion"><summary>Basic Sizing</summary>
      <div>Size <select id="basic-size"><option>S</option><option>M</option><option>L</option><option>XL</option></select></div>
    </details>
    <details class="accordion"><summary>Advanced Sizing (Recommended)</summary>
      <div>Height <input class="field" type="number" placeholder="cm" style="height:42px;font-size:14px"></div>
    </details>
    <div class="group-label" style="margin-top:48px">Accessibility</div>
    <details class="accordion"><summary>Accessibility</summary>
      <div>Use your browser's built-in zoom and accessibility settings.</div>
    </details>
  `, 'profile', 'profile-bg');
}

function detailPage() {
  const item = selectedClothing();
  if (!item) {
    return pageLayout(`<h1 class="page-title">Item not found</h1>
      ${largeButton('Back to wardrobe', "go('wardrobe')")}`, 'wardrobe');
  }

  const properties = [
    ['BRAND', item.brand || '—'],
    ['WEIGHT', item.weight || '—'],
    ['COLOUR', item.colour || '—'],
    ['ZIP', item.zip != null ? (item.zip ? 'Yes' : 'No') : (item.name === 'Windbreaker' ? 'Yes' : '—')],
    ['STYLE', item.style || item.category],
    ['LAST WORN', item.last || 'Not recorded']
  ];

  const propertyCards = properties.map(([label, value]) => `
    <div><div class="stat-title">${label}</div><div class="stat-value">${safe(value)}</div></div>
  `).join('');

  return pageLayout(`
    <div class="row">
      ${backButton('wardrobe')}
      <div class="center"><h1 class="page-title" style="margin:0">${safe(item.name)}</h1>
        <div class="eyebrow">Your collection</div></div>
      <div style="width:35px"></div>
    </div>
    <div class="detail-photo">
      ${item.image ? `<img src="${safe(item.image)}" alt="${safe(item.name)}">`
                   : '<span class="serif" style="font-size:40px">No image yet</span>'}
    </div>
    <div class="stats">${propertyCards}</div>
    <div class="detail-actions">
      ${largeButton('Want to make any changes?', 'editItem()')}
      <button class="remove-detail" onclick="removeItem(${Number(item.id)})">Remove from wardrobe</button>
    </div>
  `, 'wardrobe');
}

// ============================================================
// 4. ADD AND EDIT CLOTHING PAGES
// ============================================================

function cameraPage() {
  const preview = cameraStream
    ? '<video id="live-camera" autoplay playsinline muted aria-label="Live camera preview"></video>'
    : itemImage
      ? `<img src="${safe(itemImage)}" alt="Selected clothing photo">`
      : icon('camera', 54);

  return pageLayout(`
    <div class="flow-header">${backButton('wardrobe')}<span class="eyebrow">Add clothing</span></div>
    <div class="photo-box">${preview}</div>
    <div class="camera-actions">
      <label title="Choose clothing photo" aria-label="Choose photo from device">${icon('image', 31)}
        <input type="file" accept="image/*" style="display:none" onchange="loadPhoto(event)">
      </label>
      ${cameraStream
        ? `<button class="capture-button" onclick="takePhoto()" aria-label="Take photo"></button>`
        : `<button class="capture-button" onclick="startCamera()" aria-label="Start camera">${icon('camera', 24)}</button>`}
      <button class="main-btn" style="font-size:12px" onclick="go('describe')">
        ${icon('circleplus', 16)} Describe Item
      </button>
    </div>
    ${cameraStream ? '<button class="camera-switch" onclick="toggleCamera()">Switch camera</button>' : ''}
  `);
}

// This page is ONLY used when creating a NEW clothing item.
function descriptionPage() {
  return pageLayout(`
    <div class="fill">
      <div class="flow-header">${backButton('camera')}<span class="eyebrow">Add clothing item</span></div>
      <div class="description-field">
        <label class="eyebrow" for="description">Input item details</label>
        <input class="field" id="description" placeholder="Enter Item Description"
          value="${safe(itemDescription)}" oninput="itemDescription=this.value">
      </div>
      <div class="bottom-action"><button class="main-btn" onclick="confirmDescription()">Confirm</button></div>
    </div>
  `);
}

// This is the Figma "Is this Correct?" screen, for BOTH new and existing items.
// The four callout labels are editable fields, not just decorative text.
function confirmationPage() {
  const isEditing = editingId !== null;
  const current = isEditing ? clothes.find(item => item.id === editingId) : null;
  const name = itemDescription || current?.name || '';
  const category = current?.category || 'Jacket';
  const image = itemImage || current?.image || '';

  const categories = ['Jacket', 'Top', 'Bottoms', 'Shoes', 'Accessory'];
  const categoryOptions = categories.map(value =>
    `<option value="${value}" ${category === value ? 'selected' : ''}>${value}</option>`
  ).join('');

  // Create a small editable property label for the annotation screen.
  function propertyInput(position, label, inputId, value, placeholder) {
    return `<label class="callout ${position}">
      <span>${label}</span>
      <input id="${inputId}" value="${safe(value)}" placeholder="${placeholder}"
        aria-label="${label}" autocomplete="off">
    </label>`;
  }

  return pageLayout(`
    <div class="flow-header">${backButton(isEditing ? 'detail' : 'describe')}</div>
    <h1 class="page-title center confirm-heading">Is this Correct?</h1>
    <div class="eyebrow center">Tap to edit properties</div>

    <div class="annotation-board">
      <div class="annotation-picture">
        ${image ? `<img src="${safe(image)}" alt="${safe(name)}">`
                : '<div class="empty-confirm-photo">No clothing photo selected</div>'}
      </div>

      <!-- Lines visually connect property labels to the piece of clothing. -->
      <svg class="annotation-lines" viewBox="0 0 390 480" preserveAspectRatio="none" aria-hidden="true">
        <path d="M74 91 H125 L176 151"/>
        <path d="M307 146 H275 L247 178"/>
        <path d="M77 402 H117 L165 322"/>
        <path d="M313 382 H274 L234 304"/>
        <circle cx="176" cy="151" r="2.8"/><circle cx="247" cy="178" r="2.8"/>
        <circle cx="165" cy="322" r="2.8"/><circle cx="234" cy="304" r="2.8"/>
      </svg>
      ${propertyInput('size-field', 'SIZE', 'edit-size', current?.size || '', 'Add +')}
      ${propertyInput('brand-field', 'BRAND', 'edit-brand', current?.brand || '', 'Add +')}
      ${propertyInput('colour-field', 'COLOUR', 'edit-colour', current?.colour === 'All' ? '' : current?.colour || '', 'Add +')}
      ${propertyInput('style-field', 'STYLE', 'edit-style', current?.style || category, 'Add +')}
    </div>

    <details class="extra-properties">
      <summary>More item details</summary>
      <div class="edit-field-grid">
        <label>Item name<input id="edit-name" value="${safe(name)}"></label>
        <label>Category<select id="edit-category" data-previous="${safe(category)}" onchange="syncCategoryStyle(this)">${categoryOptions}</select></label>
        <label>Weight<input id="edit-weight" value="${safe(current?.weight || '')}" placeholder="e.g. Lightweight"></label>
        <label>Zip
          <select id="edit-zip">
            <option value="" ${current?.zip === undefined ? 'selected' : ''}>Not specified</option>
            <option value="yes" ${current?.zip === true ? 'selected' : ''}>Yes</option>
            <option value="no" ${current?.zip === false ? 'selected' : ''}>No</option>
          </select>
        </label>
      </div>
    </details>

    <div class="confirm-actions">
      <button class="main-btn" onclick="saveClothingItem()">${isEditing ? 'Save changes' : 'Confirm'}</button>
    </div>
  `);
}

// ============================================================
// 5. SIGN-IN SCREENS (UI DEMO — NO REAL ACCOUNTS YET)
// ============================================================

function signInPage() {
  return pageLayout(`
    <div class="fill">
      <h1 class="auth-title">Sign in</h1>
      <div class="eyebrow field-label">Email</div>
      <input class="field" id="email" type="email" placeholder="Email">
      <div class="eyebrow field-label">Password</div>
      <input class="field" id="password" type="password" placeholder="Password">
      <button class="pill sign-actions" onclick="signIn()">Proceed</button>
      <button class="pill google-btn" onclick="signInWithGoogle()">Google sign-in (unavailable with SQLite)</button>
      <button class="link-btn" onclick="go('signup')">Sign up?</button>
    </div>
  `);
}

function signUpPage() {
  return pageLayout(`
    <div class="fill">
      <h1 class="auth-title" style="margin-top:12px">Let's get you started</h1>
      <div class="eyebrow field-label">Name</div>
      <div class="two-fields">
        <input class="field" id="first" placeholder="First Name">
        <input class="field" id="last" placeholder="Last Name">
      </div>
      <div class="two-fields" style="margin-top:34px">
        <div style="width:50%"><div class="eyebrow">Gender</div><div class="gender" style="margin-top:16px">
          <label><input name="gender" type="radio"> Male</label>
          <label><input name="gender" type="radio"> Other</label>
          <label><input name="gender" type="radio"> Female</label>
        </div></div>
        <div style="width:50%"><div class="eyebrow">Date of birth</div>
          <input class="field" placeholder="DD/MM/YYYY" style="font-size:15px"></div>
      </div>
      ${FitDatabase.enabled() ? `
        <div class="eyebrow field-label">Email (for your account)</div>
        <input class="field" id="signup-email" type="email" autocomplete="email" placeholder="Email">
        <div class="eyebrow field-label">Password (at least 8 characters)</div>
        <input class="field" id="signup-password" type="password" autocomplete="new-password" placeholder="Password">
      ` : ''}
      <div class="group-label" style="margin-top:45px">Allow permissions</div>
      <div class="setting-row"><div>Photo Gallery Permission
        <div class="sub">Import clothing images from Library</div></div>
        <button class="switch on" onclick="this.classList.toggle('on')"><span></span></button></div>
      <div class="setting-row"><div>Camera Permission
        <div class="sub">Use camera to add clothing</div></div>
        <button class="switch on" onclick="this.classList.toggle('on')"><span></span></button></div>
      <div class="bottom-action"><button class="pill" onclick="finishSignup()">Let's get fitted out</button></div>
    </div>
  `);
}

