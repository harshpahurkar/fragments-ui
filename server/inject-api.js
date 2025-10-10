/* eslint-disable */
// server/inject-api.js
// Minimal Express server that serves static files and injects a <meta name="api-url"> tag
// derived from the incoming request host. Useful when hosting the UI on an EC2 instance.
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const indexPath = path.join(__dirname, '..', 'src', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Serve static assets from dist if present, otherwise from src
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'src')));

// For navigation requests (HTML pages), inject the meta tag so the app can pick up API_URL at runtime.
app.use((req, res, next) => {
  // Only handle requests that accept HTML (to avoid returning HTML for JS/CSS requests)
  const accept = req.headers.accept || '';
  if (!accept.includes('text/html')) return next();

  // Determine API URL based on request host
  const host = req.headers.host; // includes port
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const apiUrl = `${protocol}://${host}`; // assumes backend is on same host; adjust if needed

  // Inject or replace existing meta tag
  const metaTag = `<meta name="api-url" content="${apiUrl}">`;
  const injected = indexHtml.replace(/<meta name="api-url"[^>]*>/i, metaTag);
  res.setHeader('Content-Type', 'text/html');
  res.send(injected);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
