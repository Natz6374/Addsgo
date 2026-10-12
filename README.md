# Addsgo — repaired project package

This ZIP has a flat, predictable project layout:

```text
package.json             # starts both apps
backend/                 # Express API (server.js, routes, database.js)
frontend/                # Next.js app
```

## Run on Windows (PowerShell)

Open PowerShell in the folder containing this root `package.json` (not inside the `backend` or `frontend` subfolders), then run:

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
Copy-Item backend/.env.example backend/.env -ErrorAction SilentlyContinue
Copy-Item frontend/.env.local.example frontend/.env.local -ErrorAction SilentlyContinue
npm run dev
```

If you already created either `.env` file and want to preserve it, do not overwrite it. The API defaults to `http://localhost:5000`; the frontend defaults to `http://localhost:3000`.

You can also start services separately in two terminals from this same root folder:

```powershell
npm --prefix backend run dev
npm --prefix frontend run dev
```

## Category and chat fixes included

- Parent-category search includes child categories such as cars and motorcycles.
- Newly posted ads are approved by default unless `REQUIRE_LISTING_APPROVAL=true` is configured.
- Missing listing images use the local placeholder.
- Chat inbox query uses the existing listing image column and newly sent messages return a normalized message object.
- Buyer conversations are tied to the correct listing seller.

## Important data safety note

The ZIP intentionally excludes installed dependencies and local database files. Back up your existing SQLite database and `backend/uploads` before replacing a working project. Keep your real database and uploaded user photos when moving to this package; do not overwrite them with a clean copy.

The code was checked for JavaScript syntax, but a full live buyer/seller browser test should still be run in your environment after installing packages.


## Visible ad contact actions

- Each public listing card now has a clear **Chat with seller** action that opens the ad's seller-contact section.
- On your own listing, the action is **View buyer messages** and opens the chat inbox; self-messaging remains disabled.
- On the detail page, buyers see the chat message form (or a login prompt), while the seller sees a direct inbox link.

## Validation note for chat-contact update

The changed JavaScript source files passed syntax checks. A full Next.js build/lint could not be run in the packaging environment because dependency installation timed out; please run `npm install --prefix frontend` locally before testing in the browser.


## Chat message direction fix

The `/api/messages/:listingId/:otherUserId` endpoint now calculates `is_mine` for every message using the authenticated user ID. The chat UI uses that flag to place the current user's messages on the right and the other participant's messages on the left. The send response includes the same flag, and CSS explicitly anchors outgoing and incoming bubbles to opposite sides. Restart both frontend and backend after updating.

## Multi-account chat direction fix (important)

Authentication tokens now live in `sessionStorage` rather than `localStorage`. `localStorage` is shared between tabs on `localhost:3000`, so signing into the seller in one tab could cause the buyer tab's API requests to use the seller token while the header still showed the buyer name. Tab-scoped storage keeps the two accounts independent, and the API's `is_mine` flag now correctly determines left/right message alignment for each logged-in participant.

After updating the code, reload the app in each open tab and sign into the intended account separately in each tab. The first reload may migrate an older shared session into one tab and clear the old shared token; if the other tab is logged out, sign into that tab again. Then send one message from the buyer and reply from the seller: the sender should see their own message on the right and the other participant's message on the left.
