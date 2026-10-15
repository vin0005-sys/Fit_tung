"""Fit_tung: Flask website and SQLite database."""

import os
import json
import re
import sqlite3
from pathlib import Path
from flask import Flask, abort, jsonify, request, send_from_directory, session, g
from werkzeug.security import check_password_hash, generate_password_hash

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("FIT_TUNG_DATA_DIR", ROOT / "instance"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE = DATA_DIR / "fit_tung.db"
SECRET_FILE = DATA_DIR / "secret_key"

app = Flask(__name__, static_folder=None)
if os.getenv("SECRET_KEY"):
    app.secret_key = os.environ["SECRET_KEY"]
else:
    if not SECRET_FILE.exists():
        SECRET_FILE.write_bytes(os.urandom(32))
        SECRET_FILE.chmod(0o600)
    app.secret_key = SECRET_FILE.read_bytes()
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    with app.app_context():
        db = get_db()
        schema = (ROOT / "sql" / "schema.sql").read_text(encoding="utf-8")
        db.executescript(schema)
        db.commit()


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    row = get_db().execute("SELECT id, first_name, email FROM users WHERE id=?", (user_id,)).fetchone()
    return dict(row) if row else None


def user_json(user):
    return {"id": user["id"], "email": user["email"],
            "user_metadata": {"first_name": user["first_name"]}}


def require_user():
    user = current_user()
    if not user:
        abort(401, "Sign in to use the SQLite wardrobe.")
    return user


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, "Expected JSON data.")
    return data


@app.before_request
def protect_writes():
    if request.path.startswith("/api/") and request.method not in ("GET", "HEAD", "OPTIONS"):
        # A custom header makes cross-site form submission unable to change data.
        if request.headers.get("X-Fit-Tung") != "1":
            abort(403, "Missing request header.")


@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(409)
def json_errors(error):
    if request.path.startswith("/api/"):
        return jsonify(error=error.description), error.code
    return error


@app.route("/")
def home():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    # GitHub Pages can use the same HTML without the Python server.
    html = html.replace("<script src=\"database.js\" defer></script>",
                        '<script>window.FIT_TUNG_SQLITE = true;</script>\n  <script src="database.js" defer></script>')
    return html, 200, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store"}


@app.route("/<path:filename>")
def public_file(filename):
    public = {"index.html", "styles.css", "script.js", "screens.js", "actions.js",
              "database.js", "integrations.js", "calendar-config.js", "starter-wardrobe.json"}
    starter_images = {f"assets/starter-{name}.svg" for name in
                      ("jacket", "top", "bottoms", "shoes", "accessory")}
    if filename not in public and filename != "assets/windbreaker.png" and filename not in starter_images:
        abort(404)
    return send_from_directory(ROOT, filename)


@app.get("/api/me")
def who_am_i():
    user = current_user()
    return jsonify(user=user_json(user) if user else None)


def add_starter_items(db, user_id):
    """Give each new SQLite account its own copies of the starter items."""
    starter_items = json.loads((ROOT / "starter-wardrobe.json").read_text(encoding="utf-8"))
    for item in starter_items:
        db.execute("""INSERT INTO clothing_items
                   (user_id, name, category, brand, colour, style, size,
                    weight, has_zip, last_worn, season, image_data)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                   (user_id, item["name"], item["category"], item["brand"],
                    item["colour"], item["style"], item["size"], item["weight"],
                    None, item["last"], item["season"], item["image"]))


@app.post("/api/signup")
def signup():
    data = body()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    first_name = str(data.get("firstName", "")).strip()[:60]
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(password) < 8 or not first_name:
        abort(400, "Provide a name, valid email, and password of at least 8 characters.")
    db = get_db()
    try:
        cursor = db.execute("INSERT INTO users (email, first_name, password_hash) VALUES (?, ?, ?)",
                            (email, first_name, generate_password_hash(password)))
        add_starter_items(db, cursor.lastrowid)
        db.commit()
    except sqlite3.IntegrityError:
        abort(409, "An account with that email already exists.")
    session.clear()
    session["user_id"] = cursor.lastrowid
    return jsonify(user=user_json(current_user()), session=True), 201


@app.post("/api/signin")
def signin():
    data = body()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    row = get_db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        abort(401, "Incorrect email or password.")
    session.clear()
    session["user_id"] = row["id"]
    return jsonify(user=user_json(current_user()))


@app.post("/api/signout")
def signout():
    session.clear()
    return jsonify(ok=True)


def clothing_json(row):
    return {
        "id": row["id"], "name": row["name"], "category": row["category"],
        "brand": row["brand"], "colour": row["colour"], "style": row["style"],
        "size": row["size"], "weight": row["weight"],
        "zip": None if row["has_zip"] is None else bool(row["has_zip"]),
        "last": row["last_worn"], "season": row["season"], "image": row["image_data"]
    }


@app.get("/api/clothes")
def all_clothes():
    user = require_user()
    rows = get_db().execute("SELECT * FROM clothing_items WHERE user_id=? ORDER BY id DESC", (user["id"],)).fetchall()
    return jsonify(items=[clothing_json(row) for row in rows])


FIELDS = ("name", "category", "brand", "colour", "style", "size", "weight", "has_zip", "last_worn", "season", "image_data")
CATEGORIES = {"Jacket", "Top", "Bottoms", "Shoes", "Accessory"}


def clothing_values(data):
    name = str(data.get("name", "")).strip()[:120]
    category = str(data.get("category", ""))
    if not name or category not in CATEGORIES:
        abort(400, "Choose a name and valid clothing category.")
    image = str(data.get("image", ""))
    permitted_image = image == "assets/windbreaker.png" or bool(re.fullmatch(
        r"assets/starter-(jacket|top|bottoms|shoes|accessory)\.svg", image))
    if len(image) > 2300000 or (image and not (image.startswith("data:image/jpeg;base64,") or permitted_image)):
        abort(400, "Image must be a small JPEG photo or starter illustration.")
    zip_value = data.get("zip")
    return (name, category, str(data.get("brand") or "")[:120],
            str(data.get("colour") or "")[:80], str(data.get("style") or "")[:120],
            str(data.get("size") or "")[:40], str(data.get("weight") or "")[:80],
            None if zip_value is None else int(bool(zip_value)),
            str(data.get("last") or "")[:80], str(data.get("season") or "")[:40], image)


@app.post("/api/clothes")
def add_clothing():
    user = require_user()
    values = clothing_values(body())
    db = get_db()
    placeholders = ", ".join("?" for _ in FIELDS)
    cursor = db.execute(f"INSERT INTO clothing_items (user_id, {', '.join(FIELDS)}) VALUES (?, {placeholders})",
                        (user["id"], *values))
    db.commit()
    row = db.execute("SELECT * FROM clothing_items WHERE id=?", (cursor.lastrowid,)).fetchone()
    return jsonify(item=clothing_json(row)), 201


@app.put("/api/clothes/<int:item_id>")
def update_clothing(item_id):
    user = require_user()
    values = clothing_values(body())
    db = get_db()
    assignments = ", ".join(f"{field}=?" for field in FIELDS)
    cursor = db.execute(f"UPDATE clothing_items SET {assignments} WHERE id=? AND user_id=?",
                        (*values, item_id, user["id"]))
    if not cursor.rowcount:
        abort(404, "Clothing item not found.")
    db.commit()
    row = db.execute("SELECT * FROM clothing_items WHERE id=?", (item_id,)).fetchone()
    return jsonify(item=clothing_json(row))


@app.delete("/api/clothes/<int:item_id>")
def delete_clothing(item_id):
    user = require_user()
    db = get_db()
    cursor = db.execute("DELETE FROM clothing_items WHERE id=? AND user_id=?", (item_id, user["id"]))
    if not cursor.rowcount:
        abort(404, "Clothing item not found.")
    db.commit()
    return jsonify(ok=True)


@app.get("/api/settings")
def read_settings():
    user = require_user()
    row = get_db().execute("SELECT formal, heat, notes FROM style_preferences WHERE user_id=?", (user["id"],)).fetchone()
    return jsonify(settings={"formal": bool(row["formal"]), "heat": bool(row["heat"]), "notes": row["notes"]} if row else None)


@app.put("/api/settings")
def write_settings():
    user = require_user()
    data = body()
    notes = str(data.get("notes", ""))[:1500]
    db = get_db()
    db.execute("""INSERT INTO style_preferences(user_id, formal, heat, notes) VALUES (?, ?, ?, ?)
                  ON CONFLICT(user_id) DO UPDATE SET formal=excluded.formal, heat=excluded.heat, notes=excluded.notes""",
               (user["id"], int(bool(data.get("formal"))), int(bool(data.get("heat"))), notes))
    db.commit()
    return jsonify(ok=True)


init_db()

if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=5000)
