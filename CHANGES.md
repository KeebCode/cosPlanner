# Session Changes Summary

All changes made during this development session, organized by file.
Garment planning changes are tracked separately and not yet pushed.

---

## NEW FILES CREATED

---

### `Backend/server/Auth/middleware/auth.js`
**What it does:** Firebase authentication middleware. Verifies the Firebase ID token sent in the `Authorization: Bearer <token>` header on every protected API request. Falls back to a dev stub (`dev@test.com`) if no Firebase credentials file is found, so the server doesn't crash in local development.

```js
// If credentials file exists → verify real Firebase token
// If not → stub mode, sets req.user = { uid: 'dev-user', email: 'dev@test.com' }
const verifyToken = async (req, res, next) => {
  if (!firebaseReady) {
    req.user = { uid: 'dev-user', email: 'dev@test.com', name: 'Dev User' };
    return next();
  }
  // ... real Firebase token verification
};
```

---

### `Backend/package.json` + `Backend/package-lock.json`
**What it does:** Adds `package.json` at the `Backend/` root level (same dependencies as `Backend/server/`) so that `drizzle-orm` and `mysql2` resolve correctly when running drizzle-kit from `Backend/src/Database/`.

---

### `Frontend/src/context/AuthContext.jsx`
**What it does:** React context that exposes the current Firebase user and a `logout()` function to the entire app. Placed at this path because `App.jsx` imports it from `./context/AuthContext`.

```jsx
export function AuthProvider({ children }) { ... }
export function useAuth() { return useContext(AuthContext); }
```

---

### `Frontend/src/components/auth/RequireAuth.jsx`
**What it does:** Route guard component. Wraps protected routes — if no user is logged in, redirects to `/login`. Used in `App.jsx` to protect all app routes.

```jsx
export default function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

---

### `Frontend/src/services/api.js`
**What it does:** Re-export bridge. Several pages import from `../services/api` but the actual API functions live in `../api.js`. This file re-exports everything so both import paths work.

```js
export * from "../api.js";
```

---

### `Frontend/src/constants/measurementFields.js`
**What it does:** Re-export bridge. Same pattern — pages import `MEASUREMENT_FIELDS` from `../constants/measurementFields`, this re-exports from the actual file location.

```js
export * from "../measurementFields.js";
```

---

### `Frontend/src/pages/ProfilePage.jsx`
**What it does:** Personal profile page. Shows a circular avatar (initials if no photo, uploaded image if set), display name, bio, and a project count. Edit mode lets the user update their name, bio, and upload a profile picture (converted to base64, max 2MB). Connects to `GET /api/profile` and `PATCH /api/profile`.

**Key features:**
- Avatar with initials fallback
- Inline name editing
- Bio textarea with 200-character counter
- Profile picture file upload (max 2MB, base64 stored)
- Project count stat
- Cancel reverts all unsaved changes

---

## MODIFIED FILES

---

### `Backend/src/Database/schema.js`
**What changed:** Added `bio` and `profile_picture` columns to the `user` table. Also added `json` to the drizzle imports (needed later for garment tables).

```js
// Added to user table:
bio: varchar("bio", { length: 200 }),
profile_picture: text("profile_picture"),
```

---

### `Backend/server/server.js`
**What changed:** Two new API endpoints added for the profile feature. Also moved `cors()` before `helmet()` (fixes CORS preflight blocking), and added port 5174 to allowed origins.

**New endpoints:**

```js
// GET /api/profile — returns the logged-in user's profile
app.get("/api/profile", verifyToken, async (req, res) => {
  const dbUser = await findOrCreateDatabaseUser(req.user);
  const rows = await database.select({ user_id, user_name, user_email, bio, profile_picture })
    .from(user).where(eq(user.user_id, dbUser.user_id)).limit(1);
  return res.json(rows[0]);
});

// PATCH /api/profile — update name, bio, and/or profile picture
app.patch("/api/profile", verifyToken, async (req, res) => {
  const { user_name, bio, profile_picture } = req.body;
  // builds updates object, runs database.update(user).set(updates)
});
```

---

### `Frontend/src/api.js`
**What changed:** Two new API functions added at the bottom.

```js
// Fetch the current user's profile
export function getProfile(token) {
  return fetchJson("/api/profile", { method: "GET" }, token);
}

// Update name, bio, profile picture
export function updateProfile(token, payload) {
  return fetchJson("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, token);
}
```

---

### `Frontend/src/App.jsx`
**What changed:** Added the `/profile` route and imported `ProfilePage`.

```jsx
import ProfilePage from "./pages/ProfilePage";
// ...
<Route path="profile" element={<ProfilePage />} />
```

---

### `Frontend/src/components/layout/Layout.jsx`
**What changed:** Full rewrite of the sidebar + added profile avatar to the header.

**Sidebar changes:**
- Fetches all projects and shows them as clickable sub-items
- Each project shows a `✓ completed/total` tasks badge
- "New Project" inline modal — creates project and navigates to it
- Garment Planning and Inventory are grayed out/disabled when no project is selected
- Inventory section shows item count badge and "+ Add Stock" quick link (navigates to `/inventory?add=1` which auto-opens the add modal)
- Checklist section shows per-category completed/total breakdown

**Header changes:**
- Added circular avatar button in the top-right of the purple bar
- Shows profile picture if set, otherwise initials
- Clicking navigates to `/profile`

```jsx
// Profile avatar in header
<button onClick={() => navigate("/profile")} style={{ borderRadius: "50%", ... }}>
  {profileData?.profile_picture
    ? <img src={profileData.profile_picture} ... />
    : (profileData?.user_name || user?.email || "?").slice(0, 2).toUpperCase()
  }
</button>
```

---

### `Frontend/src/pages/InventoryPage.jsx`
**What changed (restyle):** Entire visual theme changed from dark (`#161616` backgrounds) to the app's light/purple theme.

- Item cards: white background, colored left border per status
- Owned: green left border (`#22c55e`)
- Low on stock: amber left border (`#f59e0b`)
- Need to buy: red left border (`#ef4444`)
- All modals, buttons, inputs updated to light theme
- Purple gradient buttons to match rest of app

**What changed (Add Stock shortcut):** Added `useSearchParams` — when the page loads with `?add=1` in the URL, it automatically opens the Add Item modal. Used by the sidebar "+ Add Stock" link.

```jsx
useEffect(() => {
  if (searchParams.get("add") === "1") {
    openAddModal();
    setSearchParams({}, { replace: true }); // cleans ?add=1 from URL
  }
}, [searchParams]);
```

---

### `Frontend/src/pages/ChecklistPage.jsx`
**What changed:** Fixed a bug where typing in the Category or Notes fields would lose focus on every keystroke.

**Root cause:** The `onChange` handler was updating global state, which caused the entire expanded panel to unmount and remount on every keystroke (React reconciliation).

**Fix:** Extracted `TaskDetailPanel` as its own component with local state for `localNotes` and `localCategory`. `onChange` updates local state only. `onBlur` (when user leaves the field) sends the update to the API.

```jsx
function TaskDetailPanel({ task, onUpdate, onDelete }) {
  const [localNotes, setLocalNotes] = useState(task.checklist_notes || "");
  const [localCategory, setLocalCategory] = useState(task.checklist_category || "");
  // onChange → local state only (no re-render of parent)
  // onBlur → calls onUpdate (sends to API)
}
```

---

### `Frontend/src/pages/ChecklistDashboard.jsx`
**What changed:** Fixed progress bar showing 200%.

**Root cause:** `allCount` from the backend only counted *uncompleted* tasks. Dividing `completedCount / allCount` gave >100% because it was `completed / (total - completed)`.

```js
// Before (wrong):
const donePercent = Math.round((summary.completedCount / summary.allCount) * 100);

// After (correct):
const totalCount = summary.allCount + summary.completedCount;
const donePercent = totalCount ? Math.round((summary.completedCount / totalCount) * 100) : 0;
```

---

### `Frontend/src/pages/LoginPage.jsx`
**What changed:** Minor import/path fixes to match the updated folder structure.

---

### `Frontend/src/pages/ProjectsPage.jsx`
**What changed:** Minor import/path fixes.

---

## DATABASE CHANGES

Two new columns added to the `user` table (via drizzle-kit push):
- `bio VARCHAR(200)` — optional user bio
- `profile_picture TEXT` — base64-encoded profile image

---

## HOW FEATURES CONNECT

```
User clicks avatar (header)
  → navigates to /profile
  → ProfilePage.jsx loads
  → GET /api/profile (server.js)
  → returns user row from database
  → Edit mode: PATCH /api/profile saves name/bio/picture

Sidebar "+ Add Stock" link
  → navigates to /project/:id/inventory?add=1
  → InventoryPage.jsx sees ?add=1 on load
  → auto-opens Add Item modal

Sidebar project list
  → Layout.jsx fetches all projects on every navigation
  → fetches checklist summary per project for badges
  → fetches inventory items + checklist categories for current project
```
