# Code map

- **HTML** (`index.html`) starts the app and loads the files.
- **CSS** (`styles.css`) controls the phone frame, card design, fonts and colours.
- **Python** (`app.py`) handles logins and reads/writes SQLite with SQL commands.
- **SQL** (`sql/schema.sql`) creates tables for users, clothes and preferences.
- **JavaScript** (`screens.js` / `actions.js`) displays screens and responds to clicks.
- **JavaScript** (`integrations.js`) accesses the browser camera, weather and Google Calendar APIs, and changes the daily outfit.
- **JavaScript** (`database.js`) sends requests to the Python server when opened through Flask. GitHub Pages has no Python server, so it uses browser storage.

To view an item's data flow, follow `saveClothingItem()` in `actions.js`, `FitDatabase.saveClothing()` in `database.js`, then the `/api/clothes` route in `app.py`. The last step stores the record in the `clothing_items` SQLite table.
