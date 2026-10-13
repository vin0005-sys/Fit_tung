// Navigation buttons n stuff
const pages = {
  home: homePage,
  wardrobe: wardrobePage,
  preferences: preferencesPage,
  profile: profilePage,
  detail: detailPage,
  camera: cameraPage,
  describe: descriptionPage,
  confirm: confirmationPage,
  signin: signInPage,
  signup: signUpPage
};

function render() {
  if (!pages[page]) page = 'home';
  app.innerHTML = pages[page]();

  // Autosave the Preferences notes when the user types.
  const notesBox = document.getElementById('notes');
  if (notesBox) {
    notesBox.addEventListener('input', event => {
      settings.notes = event.target.value;
      clearTimeout(preferencesTimer);
      preferencesTimer = setTimeout(savePreferences, 500);
    });
  }
}

function go(destination) {
  page = destination;
  if (location.hash.slice(1) === destination) {
    render();
  } else {
    location.hash = destination;
  }
}

window.addEventListener('hashchange', () => {
  page = location.hash.slice(1) || 'home';
  render();
});

function selectItem(id) {
  selectedId = id;
  go('detail');
}

function filterItems() {
  const category = document.getElementById('category').value;
  const colour = document.getElementById('color').value;
  const season = document.getElementById('season').value;

  const matches = clothes.filter(item =>
    (!category || item.category === category) &&
    (!colour || item.colour === colour) &&
    (!season || item.season === season)
  );

  document.getElementById('wardrobeItems').innerHTML = matches.length
    ? matches.map(item => clothingCard(item, true)).join('')
    : '<p class="empty-wardrobe">No matching clothes.</p>';
}

function toggleSetting(key) {
  settings[key] = !settings[key];
  savePreferences();
  render();
}

function notice(message) {
  document.querySelector('.toast')?.remove();
  const popup = document.createElement('div');
  popup.className = 'toast';
  popup.textContent = message;
  document.body.appendChild(popup);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => popup.remove(), 3500);
}

function startNewItem() {
  editingId = null;
  itemDescription = '';
  itemImage = '';
  go('camera');
}

function loadPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 3000000) {
    notice('Choose a photo smaller than 3 MB.');
    return;
  }

  // Shrink large photos so browser storage / SQL stays manageable.
  const reader = new FileReader();
  reader.onload = () => {
    const photo = new Image();
    photo.onload = () => {
      const scale = Math.min(1, 950 / Math.max(photo.width, photo.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(photo.width * scale);
      canvas.height = Math.round(photo.height * scale);
      canvas.getContext('2d').drawImage(photo, 0, 0, canvas.width, canvas.height);
      itemImage = canvas.toDataURL('image/jpeg', 0.72);
      render();
    };
    photo.onerror = () => notice('This image could not be opened.');
    photo.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function confirmDescription() {
  itemDescription = document.getElementById('description').value.trim();
  if (!itemDescription) {
    notice('Enter an item description first.');
    return;
  }
  go('confirm');
}

// IMPORTANT FIX: Edit goes straight to "Is this Correct?", NOT "Input Item Details".
function editItem() {
  const item = selectedClothing();
  if (!item) return;

  editingId = item.id;
  itemDescription = item.name;
  itemImage = item.image || '';
  go('confirm');
}

// This function handles both adding new clothes and saving edits.
// When someone changes category, update the style only if it wasn't customised.
function syncCategoryStyle(categorySelect) {
  const styleInput = document.getElementById('edit-style');
  if (styleInput.value === categorySelect.dataset.previous || !styleInput.value) {
    styleInput.value = categorySelect.value;
  }
  categorySelect.dataset.previous = categorySelect.value;
}

// Save the edited callout values (or create a new wardrobe item).
async function saveClothingItem() {
  const name = document.getElementById('edit-name').value.trim();
  const category = document.getElementById('edit-category').value;

  if (!name) {
    notice('Enter an item name in More item details.');
    document.querySelector('.extra-properties').open = true;
    return;
  }

  const zipChoice = document.getElementById('edit-zip').value;
  const details = {
    name,
    category,
    brand: document.getElementById('edit-brand').value.trim(),
    colour: document.getElementById('edit-colour').value.trim() || 'All',
    style: document.getElementById('edit-style').value.trim() || category,
    size: document.getElementById('edit-size').value.trim(),
    weight: document.getElementById('edit-weight').value.trim(),
    zip: zipChoice === '' ? null : zipChoice === 'yes'
  };

  const isEdit = editingId !== null;
  const previous = isEdit ? clothes.find(item => item.id === editingId) : null;
  if (isEdit && !previous) return;

  const item = { ...(previous || {}), ...details, image: itemImage || previous?.image || '' };
  if (!isEdit) item.id = Date.now();

  try {
    if (cloudUser) {
      // SQL supplies the new ID when inserting a new item.
      const saved = await FitDatabase.saveClothing(item, isEdit, cloudUser.id);
      if (isEdit) {
        clothes = clothes.map(clothing => clothing.id === editingId ? saved : clothing);
      } else {
        clothes.unshift(saved);
      }
    } else {
      if (isEdit) {
        clothes = clothes.map(clothing => clothing.id === editingId ? item : clothing);
      } else {
        clothes.unshift(item);
      }
      saveData();
    }
  } catch (error) {
    notice('Could not save item: ' + error.message);
    return;
  }

  editingId = null;
  itemDescription = '';
  itemImage = '';
  go('wardrobe');
}

async function removeItem(id) {
  const item = clothes.find(clothing => clothing.id === id);
  if (!item) return;
  if (!window.confirm(`Remove "${item.name}" from your wardrobe?`)) return;

  try {
    if (cloudUser) await FitDatabase.removeClothing(id, cloudUser.id);
    clothes = clothes.filter(clothing => clothing.id !== id);
    saveData();
  } catch (error) {
    notice('Could not remove item: ' + error.message);
    return;
  }

  if (selectedId === id) selectedId = clothes[0]?.id ?? null;
  if (editingId === id) editingId = null;
  go('wardrobe');
  notice('Item removed from wardrobe.');
}

// Load the user's private wardrobe and settings from PostgreSQL.
async function loadCloudData() {
  if (!cloudUser) return;
  // Retrieve everything before replacing the displayed local data.
  const [items, savedSettings] = await Promise.all([
    FitDatabase.getClothes(),
    FitDatabase.getSettings(cloudUser.id)
  ]);
  clothes = items;
  settings = savedSettings || { ...starterSettings };
  selectedId = clothes[0]?.id ?? null;
  render();
}

// Log in with Supabase email/password authentication.
async function signIn() {
  if (!FitDatabase.enabled()) {
    notice('To enable accounts, set up Supabase using README.md.');
    return;
  }

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return notice('Enter your email and password.');

  try {
    if (!FitDatabase.client) await FitDatabase.start();
    const user = await FitDatabase.signIn(email, password);
    cloudUser = user;
    await loadCloudData();
    go('wardrobe');
    notice('Signed in. Your SQL wardrobe is ready.');
  } catch (error) {
    notice('Sign-in failed: ' + error.message);
  }
}

// Google OAuth requires enabling Google in your Supabase Auth dashboard.
async function signInWithGoogle() {
  if (!FitDatabase.enabled()) return notice('Connect Supabase first.');
  try {
    if (!FitDatabase.client) await FitDatabase.start();
    const { error } = await FitDatabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    });
    if (error) throw error;
  } catch (error) {
    notice('Google sign-in: ' + error.message);
  }
}

async function signOut() {
  try {
    await FitDatabase.signOut();
    cloudUser = null;
    clothes = loadData('fit_items', starterClothes);
    settings = loadData('fit_settings', starterSettings);
    go('profile');
    notice('Signed out. Showing this browser\'s demo wardrobe.');
  } catch (error) {
    notice('Could not sign out: ' + error.message);
  }
}

// Optional: move clothing saved before account setup into the SQL wardrobe.
async function importLocalWardrobe() {
  if (!cloudUser) return;
  const browserItems = loadData('fit_items', starterClothes)
    .filter(item => item.name && item.name !== 'Placeholder');
  const missing = browserItems.filter(item => !clothes.some(saved =>
    saved.name === item.name && saved.category === item.category));

  if (!missing.length) return notice('No new browser items to import.');
  if (!window.confirm(`Import ${missing.length} browser item(s) to your SQL wardrobe?`)) return;

  try {
    for (const item of missing) {
      const imported = await FitDatabase.saveClothing(item, false, cloudUser.id);
      clothes.unshift(imported);
    }
    render();
    notice(`Imported ${missing.length} item(s).`);
  } catch (error) {
    notice('Import stopped: ' + error.message);
    // Reload in case earlier items in the batch already reached the server.
    await loadCloudData();
  }
}

async function finishSignup() {
  const firstName = document.getElementById('first').value.trim();
  if (!firstName) return notice('Enter your first name.');

  if (!FitDatabase.enabled()) {
    // Keep the original Figma onboarding demo working without SQL.
    localStorage.setItem('fit_name', JSON.stringify(firstName));
    go('home');
    return;
  }

  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!email || password.length < 6) {
    notice('Enter an email and password with at least 6 characters.');
    return;
  }
  try {
    if (!FitDatabase.client) await FitDatabase.start();
    const result = await FitDatabase.signUp(email, password, firstName);
    if (result.session) {
      cloudUser = result.user;
      await loadCloudData();
      go('wardrobe');
    } else {
      go('signin');
      notice('Check your email to confirm your account, then sign in.');
    }
  } catch (error) {
    notice('Sign-up failed: ' + error.message);
  }
}

// When the page opens, restore an existing Supabase session if configured.
async function startApp() {
  render();
  if (!FitDatabase.enabled()) return;
  try {
    cloudUser = await FitDatabase.start();
    if (cloudUser) await loadCloudData();
  } catch (error) {
    cloudUser = null;
    notice('SQL connection unavailable: ' + error.message);
  }
}

// Start the app when the page loads.
startApp();
