const weatherInfo = loadData('fit_weather_v1', null);
let currentWeather = weatherInfo?.forecast || null;
let weatherLocation = weatherInfo?.location || null;
let weatherUpdated = weatherInfo?.updated || 0;

let calendarEvents = loadData('fit_calendar_import_v1', []);
let calendarSource = calendarEvents.length ? 'Imported calendar' : '';
let calendarToken = null;
let calendarExpiry = 0;
let calendarUpdated = 0;
let googleTokenClient = null;

let cameraStream = null;
let cameraFacing = 'environment';

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function weatherDescription(code) {
  if (code === 0) return 'Clear skies';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snowy';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Variable conditions';
}

function dailyTemperature() {
  return currentWeather?.current?.temperature_2m ?? currentWeather?.daily?.temperature_2m_max?.[0] ?? null;
}

function weatherText() {
  if (!currentWeather) return 'Not synced yet. Use Preferences to choose your location.';
  const temp = dailyTemperature();
  const code = currentWeather.current?.weather_code ?? currentWeather.daily?.weather_code?.[0];
  const wet = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
  const advice = wet ? 'bring a water-resistant layer' : temp >= 25 ? 'choose light, breathable pieces' : temp <= 16 ? 'consider an extra layer' : 'comfortable layering weather';
  const place = weatherLocation?.name ? `${weatherLocation.name}: ` : '';
  return `${place}${weatherDescription(code)}, ${Math.round(temp)}°C — ${advice}`;
}

function availableItems(category) {
  return clothes.filter(item => item.category === category && item.id != null && item.name && item.name.toLowerCase() !== 'placeholder');
}

function dailyOutfit() {
  const warm = dailyTemperature() >= 24;
  const first = warm && availableItems('Top').length ? 'Top' : availableItems('Jacket').length ? 'Jacket' : 'Top';
  return [first, 'Accessory', 'Bottoms', 'Shoes'].map((category, position) => {
    let options = availableItems(category);
    if (settings.formal && calendarIsFormalDay()) {
      const formalItems = options.filter(item => /formal|suit|blazer|dress|smart|tailor/i.test(
        `${item.style || ''} ${item.name || ''}`));
      if (formalItems.length) options = formalItems;
    }
    const temperature = dailyTemperature();
    if (settings.heat && temperature != null && temperature >= 24) {
      const light = options.filter(item => !/heavy|wool|thick|fleece/i.test(`${item.weight || ''} ${item.name || ''}`));
      if (light.length) options = light;
    }
    const todayIndex = dayNumber() + position * 7;
    return options.length ? options[((todayIndex % options.length) + options.length) % options.length] : { id: null, category, name: 'Add an item' };
  });
}

function refreshHomepage() {
  if (page === 'home') render();
}

async function getForecast(latitude, longitude, name) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: latitude.toString(), longitude: longitude.toString(),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto', forecast_days: '7'
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error('Forecast service unavailable.');
  const result = await response.json();
  if (!result.current || !result.daily) throw new Error('No forecast received.');
  currentWeather = result;
  weatherLocation = { latitude, longitude, name };
  weatherUpdated = Date.now();
  localStorage.setItem('fit_weather_v1', JSON.stringify({ forecast: result, location: weatherLocation, updated: weatherUpdated }));
  refreshHomepage();
  if (page === 'preferences') render();
  return result;
}

function syncWeather() {
  if (!navigator.geolocation) return notice('Location is not supported here. Enter a city instead.');
  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        await getForecast(position.coords.latitude, position.coords.longitude, 'Current location');
        notice('Weather synced.');
      } catch (error) { notice('Weather: ' + error.message); }
    },
    () => notice('Location unavailable. Enter a city below instead.'),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
  );
}

async function setWeatherCity() {
  const city = document.getElementById('weather-city')?.value.trim();
  if (!city) return notice('Enter a town or city.');
  try {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&name=' + encodeURIComponent(city);
    const response = await fetch(url);
    if (!response.ok) throw new Error('City search unavailable.');
    const locations = (await response.json()).results || [];
    if (!locations.length) return notice('City not found. Try including the state or country.');
    const found = locations[0];
    const place = [found.name, found.admin1, found.country].filter(Boolean).join(', ');
    await getForecast(found.latitude, found.longitude, place);
    notice('Weather set to ' + place);
  } catch (error) { notice('Weather: ' + error.message); }
}

async function updateWeatherIfDue() {
  if (!weatherLocation || (Date.now() - weatherUpdated) < 30 * 60 * 1000) return;
  try {
    await getForecast(weatherLocation.latitude, weatherLocation.longitude, weatherLocation.name);
  } catch (error) { /* Display the last downloaded forecast until next successful update. */ }
}

function parseICSTime(raw) {
  if (!raw) return null;
  if (/^\d{8}$/.test(raw)) return new Date(+raw.slice(0, 4), +raw.slice(4, 6) - 1, +raw.slice(6, 8));
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  if (m[7]) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
}

function importICS(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 1000000) return notice('Calendar file must be under 1 MB.');
  file.text().then(text => {
    const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    const events = [];
    let item = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') { item = {}; continue; }
      if (line === 'END:VEVENT') {
        if (item?.start && item?.title) events.push(item);
        item = null;
        continue;
      }
      if (!item) continue;
      const splitAt = line.indexOf(':');
      if (splitAt < 0) continue;
      const field = line.slice(0, splitAt).split(';')[0].toUpperCase();
      const value = line.slice(splitAt + 1);
      if (field === 'SUMMARY') item.title = value.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
      if (field === 'DTSTART') item.start = parseICSTime(value)?.toISOString();
      if (field === 'DTEND') item.end = parseICSTime(value)?.toISOString();
    }
    calendarEvents = events.slice(0, 250);
    calendarSource = 'Imported calendar';
    calendarToken = null;
    localStorage.setItem('fit_calendar_import_v1', JSON.stringify(calendarEvents));
    render();
    notice(`Imported ${calendarEvents.length} event(s). Re-import the file for updates.`);
  }).catch(() => notice('Could not read the calendar file.'));
}

function getNextEventToday() {
  const today = localDateKey();
  const now = Date.now();
  return calendarEvents
    .filter(item => item.start && localDateKey(new Date(item.start)) === today && (new Date(item.end || item.start).getTime() >= now))
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0] || null;
}

function scheduleText() {
  const event = getNextEventToday();
  if (!event) return calendarSource ? 'No more events scheduled for today.' : 'Connect a calendar in Preferences to see your schedule.';
  const time = new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${event.title} at ${time}`;
}

function calendarIsFormalDay() {
  return /meeting|interview|presentation|office|work|formal|wedding|conference/i.test(getNextEventToday()?.title || '');
}

function connectGoogleCalendar() {
  const clientId = window.FIT_TUNG_GOOGLE_CLIENT_ID;
  if (!clientId) {
    notice('Add your Google OAuth client ID to calendar-config.js, or import an .ics file.');
    return;
  }
  if (!window.google?.accounts?.oauth2) {
    notice('Google sign-in is loading. Try again in a moment.');
    return;
  }
  if (!googleTokenClient) {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: async response => {
        if (response.error) return notice('Google Calendar access was not granted.');
        calendarToken = response.access_token;
        calendarExpiry = Date.now() + Number(response.expires_in || 3600) * 1000;
        await refreshGoogleCalendar();
      }
    });
  }
  googleTokenClient.requestAccessToken({ prompt: 'consent' });
}

async function refreshGoogleCalendar() {
  if (!calendarToken || Date.now() >= calendarExpiry) {
    notice('Connect Google Calendar to refresh events.');
    return;
  }
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 8);
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.search = new URLSearchParams({
      timeMin: start.toISOString(), timeMax: end.toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: '150'
    });
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + calendarToken } });
    if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to reconnect.' : `Google returned ${response.status}.`);
    const data = await response.json();
    calendarEvents = (data.items || []).filter(item => !item.cancelled && item.start).map(item => ({
      title: item.summary || 'Untitled event',
      start: item.start.dateTime || item.start.date,
      end: item.end?.dateTime || item.end?.date || item.start.dateTime || item.start.date
    }));
    calendarSource = 'Google Calendar';
    calendarUpdated = Date.now();
    render();
    notice(`Synced ${calendarEvents.length} Google Calendar event(s).`);
  } catch (error) { notice('Calendar: ' + error.message); }
}

function disconnectCalendar() {
  if (calendarToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(calendarToken, () => {});
  calendarToken = null;
  calendarExpiry = 0;
  calendarEvents = [];
  calendarSource = '';
  localStorage.removeItem('fit_calendar_import_v1');
  render();
  notice('Calendar disconnected.');
}

function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
}

async function startCamera() {
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) return notice('Camera requires HTTPS and camera permission. You can still upload a photo.');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: cameraFacing } } });
    if (page !== 'camera') { stopCamera(); return; }
    render();
    const video = document.getElementById('live-camera');
    if (video) {
      video.srcObject = cameraStream;
      await video.play();
    }
  } catch (error) {
    stopCamera();
    notice(error.name === 'NotAllowedError' ? 'Allow camera access in your browser, or choose a photo.' : 'Camera unavailable. Choose a photo from your device.');
  }
}

function takePhoto() {
  const video = document.getElementById('live-camera');
  if (!video || !cameraStream || video.videoWidth === 0) return notice('Start the camera first.');
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 950 / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  itemImage = canvas.toDataURL('image/jpeg', 0.72);
  stopCamera();
  render();
  notice('Photo captured.');
}

function toggleCamera() {
  cameraFacing = cameraFacing === 'environment' ? 'user' : 'environment';
  startCamera();
}

let lastCheckedDay = localDateKey();
function updateIntegrations() {
  if (localDateKey() !== lastCheckedDay) {
    lastCheckedDay = localDateKey();
    refreshHomepage();
  }
  if (document.visibilityState !== 'hidden') {
    updateWeatherIfDue();
    if (calendarToken && Date.now() < calendarExpiry && Date.now() - calendarUpdated > 15 * 60 * 1000) refreshGoogleCalendar();
  }
}
setInterval(updateIntegrations, 60000);
document.addEventListener('visibilitychange', updateIntegrations);
updateWeatherIfDue();
