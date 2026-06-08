# PantrySync

PantrySync is an Express, EJS, MongoDB, and session-based MVC web app for pantry tracking, recipe recommendations, shopping-list planning, and a protected admin dashboard.

## Team Responsibilities

- Mostafa: recipe recommendation system, final integration, rewrite/copy-risk review, README and test reporting.
- Aly: pantry dashboard and pantry item CRUD.
- Lynne: authentication, sessions, registration/login, profile image upload.
- Theodore: shopping list and recipe-to-shopping integration.
- Ziyad: admin dashboard and safe error handling.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`:

   ```text
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/pantrysync
   SESSION_SECRET=replace_me
   ADMIN_CODE=replace_me
   SPOONACULAR_API_KEY=
   ```

3. Seed demo data:

   ```bash
   npm run seed
   ```

4. Start the app:

   ```bash
   npm start
   ```

## Demo Accounts

- Admin: `admin@example.com` / `Admin123`
- User: `user@example.com` / `User123`

## Routes

- `GET /` landing page
- `GET /register`, `POST /register`
- `GET /login`, `POST /login`
- `POST /logout`
- `GET /dashboard`
- `GET /api/items`, `POST /api/items`, `PUT/PATCH/DELETE /api/items/:id`
- `GET /api/foods`
- `GET /recipes`
- `GET /recipes/api/recommendations`
- `POST /recipes/api/recommendations`
- `GET /shopping-list`
- `POST /shopping-list/add`
- `POST /shopping-list/:id/update`
- `POST/PATCH /shopping-list/:id/toggle`
- `POST/DELETE /shopping-list/:id/delete`
- `POST /shopping-list/from-recipe`
- `GET /admin`

## Features

- Session authentication with password hashing through `bcryptjs`.
- Owner-scoped pantry item CRUD with category, zone, expiry, price, and notes.
- Profile image upload under ignored `public/uploads/`.
- Pantry-based recipe scoring using matched ingredients, missing ingredients, substitutions, and near-expiry boost.
- Fetch/AJAX recipe recommendation loading without a full page reload.
- Shopping list CRUD with `bought` status and recipe missing-ingredient import.
- Admin dashboard with user, pantry, recipe, shopping, and unbought shopping counts.
- Safe 404/error pages without browser stack traces.

## Manual Test Checklist

- Register a new account and verify duplicate email is rejected.
- Login with valid and invalid passwords.
- Confirm logged-out users are redirected away from `/dashboard`, `/recipes`, `/shopping-list`, and `/admin`.
- Add pantry items in fridge, pantry, and freezer zones.
- Try invalid pantry data: missing name, negative amount, invalid item id.
- Confirm near-expiry and expired pantry labels appear.
- Open `/recipes` and verify recommendations load via fetch.
- Confirm matched ingredients, missing ingredients, substitutions, score, and expiry boost display.
- Add missing recipe ingredients to the shopping list.
- Add, edit, toggle, and delete shopping list items.
- Confirm user A cannot edit/delete user B pantry or shopping items.
- Login as admin and open `/admin`.
- Visit a wrong URL and confirm the 404 page renders without a stack trace.

## Known Limitations

- The app is local-only and not deployed.
- HTTPS is not implemented in this final integration.
- No external recipe API is used in the current code path.
- Image uploads are stored locally and ignored by Git.
- Admin is currently a read-only dashboard, not a full CRUD admin console.
- Tests are manual and command-based; there is no automated test runner.

## Branch And Integration Note

This integration was built on `integration/mostafa-glue` from branch fragments on `origin/main`, `origin/feature/lynne-auth-public`, `origin/feature/theodore-shopping-list`, and `origin/feature/ziyad-admin`. The missing `origin/feature/mostafa-recipes` branch did not exist, so the recipe recommendation slice was created during integration.

## Plagiarism And Rewrite Note

`pantrysync-original.zip` was used only as a behavior reference. Final code was manually rewritten/refactored to avoid submitting copied original zip files. See `ORIGINAL_ZIP_BEHAVIOR_MAP.md`, `COPY_RISK_BEFORE_FIXES.md`, and `COPY_RISK_AFTER_FIXES.md` for evidence.
