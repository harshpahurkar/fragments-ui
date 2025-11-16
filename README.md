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

Configuring the UI to point at an EC2-hosted fragments server

You can configure which backend the UI talks to in three ways (priority order):

1. Build-time env (`API_URL`) — set this in your environment or `.env` before starting Parcel. Example:

```
API_URL=https://ec2-3-123-45-67.compute-1.amazonaws.com
```

2. Runtime global — set `window.__API_URL__` before the app module loads. Useful when the page is rendered by a server that knows the backend host.

```html
<script>
  window.__API_URL__ = 'https://ec2-3-123-45-67.compute-1.amazonaws.com';
</script>
<script type="module" src="./app.js"></script>
```

3. Meta tag — add a meta tag to `index.html` to instruct the app at runtime:

```html
<meta name="api-url" content="https://ec2-3-123-45-67.compute-1.amazonaws.com" />
```

If none of the above are set, the app will default to `http://localhost:9000` when running on `localhost`, or derive a host using the UI's origin and port 9000 for other hosts.

Configuring Cognito

- Set `AWS_COGNITO_AUTH_DOMAIN` to your Cognito Hosted UI domain (or a full URL). If you don't provide `OAUTH_SIGN_IN_REDIRECT_URL`, the app will default to `${window.location.origin}/callback` at runtime.
- Make sure your Cognito App Client allows the redirect URI you configure and that the Hosted UI domain is enabled.

Post-logout landing page

- This repo adds a small `src/post-logout.html` page which the app uses as the default
  `post_logout_redirect_uri` after signing out. To avoid a provider 400 error, register
  the exact URL (for example `http://localhost:1234/post-logout.html`) in your Cognito
  App Client's Sign out URL(s).

- If you prefer a different path, set `OAUTH_SIGN_OUT_REDIRECT_URL` in your environment
  or change the `post_logout_redirect_uri` in `src/auth.js`.

## Docker image (build & run)

This repo includes a multi-stage `Dockerfile` that builds the app with Parcel and produces a small
nginx-based production image serving the built static files.

Build the image locally (replace `<your-dockerhub-username>` with your Docker Hub user):

```powershell
# from repository root
docker build -t <your-dockerhub-username>/fragments-ui:latest .
```

Run the image locally (bind to port 8080 to avoid conflicts):

```powershell
docker run --rm -p 8080:80 <your-dockerhub-username>/fragments-ui:latest
# then open http://localhost:8080 in a browser
```

## Push to Docker Hub (manual step)

Log in and push the image to your Docker Hub account (you must create the repository on Docker Hub or enable automatic repo creation):

```powershell
docker login
docker push <your-dockerhub-username>/fragments-ui:latest
```

Notes:

- The final image serves files with nginx on port 80. When running locally we map container port 80 to a host port (for example 8080).
- `.dockerignore` is included to avoid copying `node_modules`, `dist` and other development artifacts into the build context.
