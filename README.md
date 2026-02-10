# fragments-ui

This is a small testing UI for the fragments server that demonstrates using Amazon Cognito Hosted UI for auth and a configurable API backend.

Quick setup

1. Copy `.env.example` to `.env` and fill in your values:

   - `AWS_COGNITO_AUTH_DOMAIN` (e.g. `your-domain.auth.us-east-1.amazoncognito.com`)
   - `AWS_COGNITO_CLIENT_ID`
   - `OAUTH_SIGN_IN_REDIRECT_URL` (e.g. `http://localhost:1234/callback`)
   - `API_URL` (e.g. `http://localhost:9000`)

2. Install dependencies

```powershell
npm install
```

3. Install dev tools (eslint)

```powershell
npm install --save-dev eslint
```

4. Run the dev server

```powershell
npm run dev
```

5. Lint the code

```powershell
npm run lint
```

Files changed/added

- `src/api.js` — added `createFragment(user, { content, contentType })`
- `src/auth.js` — use `AWS_COGNITO_AUTH_DOMAIN` if provided (Hosted UI)
- `src/index.html` — added a small form to create text fragments
- `src/app.js` — wired the form to call `createFragment`
# fragments-ui

Fragments UI is a small demo/testing frontend for the Fragments backend.

Quick start

1. Copy `.env.example` to `.env` and fill values (Cognito domain, client id, redirect URLs, `API_URL`).
2. Install deps and run dev server:

```powershell
cd fragments-ui
npm install
npm run dev
```

Build for production

```powershell
npm run build
npm run start
```

Notes

- The app expects the backend at `API_URL` and uses `Authorization: Bearer <token>`.
- `test:smoke` runs a small node script that exercises the running backend; run it after starting the backend.
- The `start` script serves the `dist` build using `npx serve`.

Docker

Build and run the provided `Dockerfile` to serve the compiled assets with nginx.
