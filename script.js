/*
  FIT_TUNG — OUTFIT PLANNER
  This is a front-end school project, using plain JavaScript.

  This file: starter data, app state, common UI parts and icons.
  screens.js: the HTML for each screen.
  actions.js: buttons, navigation and saving items.
  database.js: SQLite requests to the Python server.

  On GitHub Pages, data is saved in the browser.
  With the Flask server, signed-in users save to SQLite.
*/

// ============================================================
// 1. DATA AND SETTINGS
// ============================================================

const app = document.getElementById('app');
const jacketImage = 'assets/windbreaker.png';

// Filled from the starter JSON for new visitors; never shared between browsers.
const starterClothes = [];

const starterSettings = {
  formal: true,
  heat: true,
  notes: 'Strictly neutral tones only (olive, slate, navy, sand). Avoid oversized cuts and synthetics. Favor minimalist linen and heavy structured cotton.'
};

// Read saved data. Use starter data if this browser has no saved items.
function loadData(key, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? defaultValue : JSON.parse(saved);
  } catch (error) {
    return defaultValue;
  }
}

let clothes = loadData('fit_items', starterClothes);
let settings = loadData('fit_settings', starterSettings);

// Sizing stays private to this browser, separate from the example SQLite data.
const defaultSizing = {
  basicSize: 'M',
  height: '', chest: '', waist: '', hips: '',
  shoulders: '', sleeve: '', inseam: '', fit: 'Regular'
};
let sizing = { ...defaultSizing, ...loadData('fit_sizing', {}) };

function saveSizing() {
  localStorage.setItem('fit_sizing', JSON.stringify(sizing));
}

// Variables that describe what the user is currently doing.
let page = location.hash.slice(1) || 'home';
let selectedId = clothes[0]?.id ?? null;
let editingId = null;             // null means we're ADDING, not editing
let itemDescription = '';
let itemImage = '';
let toastTimer;
let cloudUser = null;             // null means local browser mode
let preferencesTimer;

// Save local data only when signed out. Cloud data never mixes with it.
function saveData() {
  if (cloudUser) return;
  localStorage.setItem('fit_items', JSON.stringify(clothes));
  localStorage.setItem('fit_settings', JSON.stringify(settings));
}

// Save preferences locally, or to SQL if the user is signed in.
async function savePreferences() {
  if (!cloudUser) {
    saveData();
    return;
  }
  try {
    await FitDatabase.saveSettings(settings, cloudUser.id);
  } catch (error) {
    notice('Could not save preferences: ' + error.message);
  }
}

function selectedClothing() {
  return clothes.find(item => item.id === selectedId);
}

// Makes text safe to insert into our HTML templates.
function safe(text) {
  return String(text ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[character]));
}

// ============================================================
// 2. REUSABLE PAGE PARTS
// ============================================================

// SVG icons. Unlike emoji/text symbols, they look the same on every device.
const iconDrawings = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  wardrobe: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  sliders: '<path d="M4 4v5m0 4v7M12 4v2m0 4v10M20 4v9m0 4v3M1 9h6m2-3h6m2 7h6"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  cloudsun: '<path d="M12 2v2m-8.5.5 1.5 1.5M2 12h2m3-8a6 6 0 0 1 8.5 7"/><path d="M7 19h11a4 4 0 1 0-.7-7.9A5.5 5.5 0 0 0 7 12a3.5 3.5 0 0 0 0 7Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  cloud: '<path d="M6 19h12a4 4 0 0 0 .4-8 6 6 0 0 0-11.5-.5A4.3 4.3 0 0 0 6 19Z"/>',
  circleplus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  back: '<circle cx="12" cy="12" r="9"/><path d="m12 8-4 4 4 4m-4-4h9"/>',
  camera: '<path d="M14 4h-4L8 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="14" r="4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'
};

function icon(name, size = 24) {
  return `<svg class="ui-icon" width="${size}" height="${size}"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">${iconDrawings[name] || ''}</svg>`;
}

function statusBar() {
  return `<div class="status"><span>9:41</span><span class="status-icons">
    <svg width="23" height="16" viewBox="0 0 23 16" aria-hidden="true">
      <rect x="1" y="11" width="4" height="4" rx=".7"/>
      <rect x="7" y="8" width="4" height="7" rx=".7"/>
      <rect x="13" y="4" width="4" height="11" rx=".7"/>
      <rect x="19" y="1" width="4" height="14" rx=".7"/>
    </svg>
    <svg width="19" height="16" viewBox="0 0 20 17" aria-hidden="true">
      <path d="M2 6c4.5-4.3 11.5-4.3 16 0M5 9c2.9-2.8 7.1-2.8 10 0M8 12c1.1-1 2.9-1 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="10" cy="15" r="1.2"/>
    </svg>
    <svg width="29" height="16" viewBox="0 0 30 16" aria-hidden="true">
      <rect x="1" y="2" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <rect x="3.5" y="4.5" width="19" height="7" rx="1"/>
      <path d="M26.5 6v4a2 2 0 0 0 0-4"/>
    </svg>
  </span></div>`;
}

const navigationItems = [
  ['home', 'home', 'HOME'],
  ['wardrobe', 'wardrobe', 'WARDROBE'],
  ['camera', 'plus', ''],
  ['preferences', 'sliders', 'PREFERENCES'],
  ['profile', 'user', 'PROFILE']
];

function bottomNavigation(activePage) {
  const buttons = navigationItems.map(([destination, picture, label]) => {
    const active = destination === activePage;
    const action = destination === 'camera' ? 'startNewItem()' : `go('${destination}')`;

    return `<button onclick="${action}" class="${active ? 'active' : ''}"
        aria-label="${destination === 'camera' ? 'Add clothing item' : destination}">
      <span class="${destination === 'camera' ? 'plus-circle' : 'nav-icon'}">
        ${icon(picture, destination === 'camera' ? 30 : 24)}
      </span>${label}</button>`;
  });

  return `<nav class="nav" aria-label="Main navigation">${buttons.join('')}</nav>`;
}

// All pages use the SAME phone frame (and scroll inside it).
function pageLayout(content, activeNavigation = '', background = '') {
  return `<main class="phone ${background}">
    ${statusBar()}
    <div class="screen-content ${activeNavigation ? 'with-nav' : ''}">${content}</div>
    ${activeNavigation ? bottomNavigation(activeNavigation) : ''}
  </main>`;
}

function backButton(destination) {
  return `<button class="back" onclick="go('${destination}')" aria-label="Go back">
    ${icon('back', 34)}
  </button>`;
}

function clothingCard(item, showDeleteButton = false) {
  const isEmpty = item.id == null;
  const action = isEmpty ? 'startNewItem()' : `selectItem(${Number(item.id)})`;
  const picture = item.image
    ? `<img src="${safe(item.image)}" alt="${safe(item.name)}">`
    : '<div class="empty-item-photo"></div>';

  const removeButton = showDeleteButton && !isEmpty
    ? `<button class="remove-card" onclick="removeItem(${Number(item.id)})"
          aria-label="Remove ${safe(item.name)}">×</button>`
    : '';

  return `<div class="item-card-wrap">
    <button class="item-card" onclick="${action}">
      ${picture}
      <div class="item-details">
        <div class="item-label">${safe(item.category)}</div>
        <div class="item-name">${safe(item.name)}</div>
      </div>
    </button>
    ${removeButton}
  </div>`;
}

function largeButton(label, clickAction) {
  return `<button class="pill" onclick="${clickAction}">${label}</button>`;
}

