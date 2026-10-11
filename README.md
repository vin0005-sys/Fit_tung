# Fit_tung — Outfit Planner (Year 11 project)

This is a working **HTML, CSS and JavaScript** version of the Figma design.
It does **not** require React, Vite or npm.

## What this version fixes

- **Edit flow:** Wardrobe → clothing details → **Want to make any changes?** → **Is this Correct?** (editable brand, colour, size, style and other details) → **Save changes** → Wardrobe.
- **New item flow:** `+` → Choose image → Input Item Details → Is this Correct? → Confirm → Wardrobe.
- Clothing can be **deleted**, and editing a clothing item updates it rather than creating a duplicate.
- All pages use the same phone frame. If the content is long, it scrolls inside the frame.
- Navigation icons use SVG drawings instead of font symbols.
- Files are now separated into clear parts so they are easier to read and explain in class.

## Upload to your existing GitHub repository

1. Extract this ZIP on your computer.
2. Open `https://github.com/vin0005-sys/Fit_tung`.
3. Make sure you are on the **main** branch.
4. Click **Add file → Upload files** and upload the **contents of this extracted folder**, not the ZIP itself. GitHub may ask you to confirm replacement of existing files.
5. Keep the files directly in the repository's root, preserving the `assets/` and `sql/` subfolders.
6. Commit the changes.
7. Go to **Settings → Pages**; set Source to **Deploy from a branch**, with `main` and `/(root)`. Disable any old Actions deployment workflow to avoid competing deploys.
8. After Pages finishes deploying, open `https://vin0005-sys.github.io/Fit_tung/` and press **Ctrl + Shift + R** if the old design is cached.

The app will immediately work **without** SQL. In this mode, it uses browser `localStorage` and has demo/sign-up screens but no real account authentication.

## File guide

| File | Contains |
| ---- | -------- |
| `index.html` | Loads the website files (very short) |
| `styles.css` | Colours, gradient, layout, scrolling, fonts and buttons |
| `script.js` | Starter clothing, browser data, icon drawings, reusable UI |
| `screens.js` | HTML for the home, wardrobe, edit, profile and other screens |
| `actions.js` | Button actions, route changes, add/edit/delete, sign in/out |
| `database-config.js` | Where you optionally enter Supabase project settings |
| `database.js` | SQL reads/writes through Supabase's JavaScript client |
| `sql/setup.sql` | SQL statements to create the private database tables |
| `assets/windbreaker.png` | Original sample jacket image |
| `CODE_GUIDE.md` | Simple explanations of the most important code |

## Optional: connect a real SQL database (Supabase PostgreSQL)

**Do not do this until the local website is working.** You do not need to create your own backend server: Supabase provides one.

1. Create a free project at `https://supabase.com`.
2. Open your project's **SQL Editor**, make a new query, paste the contents of `sql/setup.sql`, and run it **once**. This creates `clothing_items` and `style_preferences` with **Row Level Security (RLS)**. Each signed-in user can only access their own data.
3. In Supabase, find your **Project URL** and **publishable/anon key** under **Project Settings → API** (labels may vary).
4. Open `database-config.js` and replace the two empty strings:

```js
window.FIT_TUNG_SUPABASE = {
  url: 'https://YOUR-PROJECT.supabase.co',
  publishableKey: 'YOUR-PUBLISHABLE-KEY'
};
```

5. **Important security rule:** use only the **publishable** (`sb_publishable_...`) or legacy **anon** key here. NEVER paste a `service_role` key or secret key in any GitHub Pages file.
6. Under Supabase **Authentication → Providers**, make sure **Email** sign-in is enabled. In **Authentication → URL Configuration**, set the Site URL to `https://vin0005-sys.github.io/Fit_tung/`. Add the same URL as an allowed redirect URL.
7. Commit your edited `database-config.js` to GitHub. Wait for GitHub Pages to deploy.
8. In the app, go to **Profile → Account → Sign in → Sign up?**, create an account with your email/password, and confirm the verification email if required.
9. Sign in. Your SQL wardrobe will start **empty**. Under **Profile → Account**, you can use **Import saved browser clothes** to import existing items from the demo browser.

**Notes:**
- You can leave `url` and `publishableKey` blank indefinitely. The app will then continue using localStorage, and SQL/real sign-in will remain disabled.
- The sign-in UI is real only after connecting Supabase. Sign in with Google additionally requires setting up the Google provider in Supabase.
- SQL stores images in a text column as compressed data URLs for this **small school prototype**. For a larger or production app, use **Supabase Storage** instead.
- Live weather, calendars and AI outfit generation remain prototype buttons; they are not connected to real services.
- **Before using it with real user accounts**, test that two different accounts cannot read or edit one another's rows. RLS policies are included but have not been tested against your own Supabase project.

## Simple test after deployment

1. Click **Wardrobe**, then **Windbreaker**.
2. Click **Want to make any changes?**. You should see **Is this Correct?**, NOT Input Item Details.
3. Change the **BRAND** or **COLOUR** label. Expand **More item details** to edit the item name/category. Click **Save changes**.
4. Go back to the item and confirm the details have updated. Try deleting it.
5. Click `+` to add a new item; check the back buttons and scrolling.
6. Open Profile. Expand a section and confirm the frame's width/height do not change.

## About the data

In browser-only mode, clothing is saved in the browser where you added it. Clearing site data may remove it. In SQL mode, clothing is attached to your authenticated account instead; signing out switches back to the browser demo wardrobe without deleting your cloud data.
