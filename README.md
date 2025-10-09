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
- `.eslintrc.json` — minimal eslint configuration
- `.env.example` — sample env file
- `README.md` — setup and usage
- `package.json` — added `lint` script and eslint devDependency

Notes

- Ensure the Cognito App Client is configured with the redirect URL you set in `OAUTH_SIGN_IN_REDIRECT_URL` and that the domain is enabled for the Hosted UI.
- The app expects the fragments server to be reachable at `API_URL` and to accept `Authorization: Bearer <token>` headers.
