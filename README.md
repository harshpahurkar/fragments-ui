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
# Fragments UI

A sleek, auth-aware client for the Fragments API. It demonstrates Cognito Hosted UI auth flows and makes it simple to create and view fragments from a clean browser interface.

## Highlights
- Cognito Hosted UI auth with secure redirects
- Configurable backend URL (local, staging, production)
- Lightweight, fast Parcel build

## Tech stack
Vanilla JS, Parcel, OIDC client, Mocha, Chai

## Quick start

```powershell
cd fragments-ui
npm install
npm run dev
```

## Production build

```powershell
npm run build
npm run start
```

## Environment

Copy `.env.example` to `.env` and fill in:

- `AWS_COGNITO_AUTH_DOMAIN`
- `AWS_COGNITO_CLIENT_ID`
- `OAUTH_SIGN_IN_REDIRECT_URL`
- `OAUTH_SIGN_OUT_REDIRECT_URL`
- `API_URL`

## Scripts

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:smoke
```

## Backend integration

The UI sends authenticated requests to the API using `Authorization: Bearer <token>`. The backend must be running and reachable at `API_URL`.

## Docker

Build and run the included `Dockerfile` to serve the compiled assets with nginx in production.
