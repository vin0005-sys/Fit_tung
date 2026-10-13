# Fit_tung

Outfit planner built using HTML, CSS, JavaScript, Python (Flask) and SQLite.
The layout follows the Figma app. Browser functions (camera, location, Google permissions) require JavaScript.

## Run with SQLite and DB Browser (Windows)

1. Install **Python 3** from python.org and install **DB Browser for SQLite**.
2. Extract this project ZIP, then open a terminal inside its folder. In Windows File Explorer, click the address bar, type `cmd`, and press Enter.
3. Run:

   ```bat
   py -m pip install -r requirements.txt
   py app.py
   ```

4. Open **http://127.0.0.1:5000/** in your browser (don't double-click `index.html`).
5. Go to **Profile → Account → Sign in → Sign up?**, create a test account, and add clothing. Your signed-in items now go to SQLite instead of localStorage.
6. The database is created automatically in **`instance/fit_tung.db`**. Open that file using **DB Browser for SQLite → Open Database → Browse Data**. Refresh or reopen DB Browser after changing data in the web app. Avoid editing the file from both applications simultaneously.

`sql/schema.sql` contains the table definitions. You can read the tables `users`, `clothing_items` and `style_preferences` in DB Browser. Passwords are stored as hashes, not plaintext.

If you previously added clothes in browser-only mode at **localhost:5000**, go to **Profile → Account → Import saved browser clothes** after signing in. Clothes saved on GitHub Pages are stored under a different website address and will **not** transfer automatically to localhost. Export/import would require a separate migration step.

## Features

| Feature | How it works |
|---|---|
| Camera | **+ → camera**; grant permission, tap camera to start, then the round capture button. You can also upload a photo. Browsers require HTTPS or localhost for camera access. |
| Weather | **Preferences → Location & Weather → Sync** for device location; or enter a city and select **Set city**. Uses Open-Meteo. Requires internet; GPS needs permission. Last forecast remains available offline. |
| Calendar | **Preferences → Google** to connect Google Calendar (setup below), **Sync** to refresh, or **Import .ics** for a downloaded calendar file. Imported `.ics` files don't refresh automatically. |
| Outfit of the day | The Home screen uses today's date to rotate between real wardrobe items, with temperature and formal-event preferences. It updates when the date changes while the tab is open, or next time the page opens. Add at least two items in a category to see that category rotate. |
| SQLite | When run via Python and signed in, clothing, account and preferences are saved in `instance/fit_tung.db`, which DB Browser for SQLite can open. |

Google Calendar needs a one-time Google Cloud setup:

1. In Google Cloud Console, enable the **Google Calendar API** and configure an **OAuth consent screen**. For a testing app, add your Google account as a test user.
2. Create OAuth client credentials for a **Web application**, with Authorized JavaScript origins `http://localhost:5000` and `http://127.0.0.1:5000` (add whichever you use).
3. Copy the OAuth **client ID** into `calendar-config.js`. This is a public client ID, **not a client secret**.
4. Refresh the site and choose **Preferences → Google**. Approve read-only calendar permission. A token lasts only for the current browser session; reconnect when it expires.
5. If also using GitHub Pages, add `https://vin0005-sys.github.io` as an authorized JavaScript origin (origin only, without `/Fit_tung/`).

Calendar events are read to show your schedule and influence outfit choices. The current `.ics` importer supports simple events but not every recurrence or time-zone rule. Live Google Calendar fetches upcoming events from the primary calendar, without creating or modifying events.

## Hosting

**GitHub Pages cannot run Python or SQLite.** If you upload the frontend files there, the layout, camera, weather, calendar and daily outfits will work; wardrobe data stays in that browser and signup is a demo. To save clothes to SQLite, use `py app.py` and visit localhost, or host Flask on a Python-capable service with persistent storage and HTTPS.

On a GitHub Pages repository, do not upload `instance/`, `*.db`, `.env`, or secrets. Your GitHub Pages setup can stay as **Deploy from branch: main / (root)**. `.gitignore` helps for Git commands, but GitHub's browser upload can still upload selected files manually.

For an online multi-user production service, a managed SQL database and more security controls are recommended. A temporary host filesystem may erase SQLite data on redeploy.

## Files

- `index.html`, `styles.css`: page container and styling
- `screens.js`, `actions.js`, `script.js`: browser screens, navigation and data
- `integrations.js`, `calendar-config.js`: camera, weather, calendars, rotating outfits
- `app.py`: Python server and SQL API
- `database.js`: browser-to-Python requests
- `sql/schema.sql`: SQLite database tables
- `assets/`: clothing image

Old `Page 1 CSS.css`, `Page 2 HTML.html`, other `Page N CSS.css`, `database-config.js` and old PostgreSQL `sql/setup.sql` are not needed in this version.
