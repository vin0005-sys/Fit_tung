# Starter wardrobe

Source: the supplied `wardrobe_database.db` (23 items). Eight selected items were exported to `starter-wardrobe.json`.

- Upload the files in this package to the root of your GitHub repository (folders intact).
- A **new** visitor automatically receives the eight items in their own browser.
- Adding, editing or removing items does not affect other devices.
- Already saved wardrobes are never overwritten by this update. Test in a private browsing window.
- DB Browser is just the data source; the public site does **not** need Python or a live SQLite connection.
- SQLite login on the local Flask server also gives each newly created account independent starter rows.
- To change the first-visit defaults later, edit `starter-wardrobe.json`; existing wardrobes will not change.

The SQLite database did not contain clothing images. The category SVGs are illustrations, not original product photos.
