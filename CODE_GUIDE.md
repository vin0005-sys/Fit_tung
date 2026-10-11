# Fit_tung code guide (Year 11 Computing)

You can explain this app using basic programming ideas: **variables**, **arrays**, **objects**, **functions**, **conditions**, **events**, **HTML**, **CSS** and an optional **SQL database**.

## 1. Main idea

A clothing item is a JavaScript object:

```js
const jacket = {
  id: 1,
  name: 'Windbreaker',
  category: 'Jacket',
  brand: 'Nike',
  colour: 'Navy'
};
```

A wardrobe is an array of objects: `let clothes = [jacket, ...]`.

## 2. Where to find the most important functions

### `script.js`: our starting data

- `starterClothes` = clothes shown before you add anything.
- `loadData()` = reads previous browser data.
- `saveData()` = saves browser data when not signed in.
- `clothingCard()` = draws one clothing card using HTML.

### `screens.js`: what each screen looks like

- `homePage()` = outfit suggestions.
- `wardrobePage()` = clothing grid.
- `detailPage()` = selected clothing information.
- `confirmationPage()` = **Is this Correct?** screen with editable details.
- `descriptionPage()` = **Input Item Details** screen (only for new items).

### `actions.js`: what happens when users click

- `go(page)` = displays a different screen.
- `editItem()` = goes straight to the confirmation screen.
- `startNewItem()` = begins the new clothing flow.
- `saveClothingItem()` = saves new or edited information.
- `removeItem(id)` = deletes a chosen item after confirmation.
- `filterItems()` = filters the wardrobe using the dropdowns.
- `signIn()` and `signOut()` = optional online accounts.

For example, here is the relevant edit-flow logic:

```js
function editItem() {
  const item = selectedClothing();
  if (!item) return;

  editingId = item.id;      // This is an existing item.
  itemDescription = item.name;
  itemImage = item.image || '';
  go('confirm');            // Open "Is this Correct?"
}
```

Compare it with `startNewItem()`, which sets `editingId = null` and opens the camera flow instead.

## 3. HTML, JavaScript and CSS

- HTML (`index.html`) holds the main `<div id="app"></div>`.
- JavaScript puts the correct page content into that div using `app.innerHTML = ...`.
- CSS gives the pages their design and ensures that the phone frame stays the same size.

## 4. How data is saved

**Without SQL:** `localStorage.setItem(...)` saves data in the current browser.

**With SQL:** the `database.js` file calls Supabase, which saves the information into a PostgreSQL table called `clothing_items`. Only a signed-in user can read their own items because the SQL file uses **Row Level Security**.

You can discuss the difference between **client-side storage** (localStorage) and a **remote relational database** (PostgreSQL) in your project report.

## 5. Example SQL queries

In the Supabase SQL Editor, once tables have been created:

```sql
-- Count all clothing records (admin SQL editor only)
SELECT COUNT(*) FROM public.clothing_items;

-- Look at item names and categories
SELECT name, category, colour
FROM public.clothing_items
ORDER BY name;
```

The SQL Editor is an administrative environment: it can see more data than an ordinary user of the app. The website itself uses per-user security policies.
