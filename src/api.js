// src/api.js
function getApiBase() {
  // Priority: build-time env (process.env.API_URL) -> runtime global (window.__API_URL__) -> meta tag -> derive from location
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_URL) {
      return process.env.API_URL;
    }
  } catch (e) {
    // ignore
  }

  if (typeof window !== 'undefined') {
    if (window.__API_URL__) return window.__API_URL__;

    const meta = document.querySelector('meta[name="api-url"]');
    if (meta && meta.content) return meta.content;

    // Fallbacks: localhost -> default port 9000; otherwise assume backend at same host on port 9000
    const host = window.location.hostname;
    const protocol = window.location.protocol || 'https:';
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:9000';
    // If the UI is served from the same host as the API, use same origin
    return `${protocol}//${host}:9000`;
  }

  // Last resort
  return 'http://localhost:9000';
}

export async function getUserFragments(user, { expand = false } = {}) {
  const base = getApiBase();
  const url = `${base}/v1/fragments${expand ? '?expand=1' : ''}`;

  const headers = user.authorizationHeaders();
  try {
    const res = await fetch(url, { method: 'GET', headers });
    const text = await res.text();
    if (!res.ok) {
      console.error('GET /v1/fragments failed', {
        status: res.status,
        statusText: res.statusText,
        url,
        response: safeJson(text),
      });
      throw new Error(`GET /v1/fragments -> ${res.status}`);
    }
    const data = safeJson(text);
    console.log('GET /v1/fragments ok', data);
    return data;
  } catch (err) {
    console.error('Unable to call GET /v1/fragments', {
      url,
      headersPresent: !!headers.Authorization,
      err: String(err),
    });
    throw err;
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export async function createFragment(user, { content, contentType = 'text/plain' } = {}) {
  const base = getApiBase();
  const url = `${base}/v1/fragments`;

  // authorizationHeaders may return headers including Authorization
  const authHeaders =
    user && typeof user.authorizationHeaders === 'function' ? user.authorizationHeaders() : {};
  const headers = { ...authHeaders, 'Content-Type': contentType };

  try {
    const res = await fetch(url, { method: 'POST', headers, body: content });
    const text = await res.text();
    if (!res.ok) {
      console.error('POST /v1/fragments failed', {
        status: res.status,
        statusText: res.statusText,
        url,
        response: safeJson(text),
      });
      throw new Error(`POST /v1/fragments -> ${res.status}`);
    }
    const data = safeJson(text);
    console.log('POST /v1/fragments ok', data);
    return data;
  } catch (err) {
    console.error('Unable to call POST /v1/fragments', {
      url,
      headersPresent: !!headers.Authorization,
      err: String(err),
    });
    throw err;
  }
}
