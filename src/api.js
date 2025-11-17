// src/api.js
export function getApiBase() {
  // Resolve API base URL using multiple sources (priority order):
  // 1. runtime global window.__API_URL__
  // 2. meta tag <meta name="api-url" content="..."> if present
  // 3. build-time process.env.API_URL (set by bundler)
  // 4. defaults: localhost:9000 when running on localhost or derive origin with port 9000
  try {
    if (typeof window !== 'undefined' && window.__API_URL__) {
      // debug
      // eslint-disable-next-line no-console
      console.log('getApiBase: using window.__API_URL__', window.__API_URL__);
      return window.__API_URL__;
    }

    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="api-url"]');
      if (meta && meta.content) {
        // eslint-disable-next-line no-console
        console.log('getApiBase: using meta api-url', meta.content);
        return meta.content;
      }
    }
  } catch (e) {
    // ignore DOM access errors in non-browser environments
  }

  if (typeof process !== 'undefined' && process.env && process.env.API_URL) {
    // eslint-disable-next-line no-console
    console.log('getApiBase: using process.env.API_URL', process.env.API_URL);
    return process.env.API_URL;
  }

  // default derivation
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // eslint-disable-next-line no-console
    console.log('getApiBase: deriving from origin', origin);
    if (origin.includes('localhost')) return 'http://localhost:9000';
    // assume API sits on same host at port 9000
    try {
      const u = new URL(origin);
      u.port = '9000';
      return u.toString().replace(/\/$/, '');
    } catch (e) {
      return `${origin}:9000`;
    }
  }

  // fallback
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
    let location = res.headers ? res.headers.get('Location') || res.headers.get('location') : null;
    if (!res.ok) {
      console.error('POST /v1/fragments failed', {
        status: res.status,
        statusText: res.statusText,
        url,
        response: safeJson(text),
      });
      const err = new Error(`POST /v1/fragments -> ${res.status}`);
      err.status = res.status;
      err.response = safeJson(text);
      throw err;
    }
    const data = safeJson(text);

    // If the server didn't send a Location header (or browser couldn't expose it),
    // try to construct a sensible URL from the returned fragment id as a fallback.
    if (!location) {
      const id =
        (data && data.fragment && data.fragment.id) ||
        data.id ||
        (Array.isArray(data && data.fragments) && data.fragments[0] && data.fragments[0].id) ||
        (Array.isArray(data && data.results) && data.results[0] && data.results[0].id) ||
        null;
      if (id) {
        location = `${base}/v1/fragments/${id}`;
      }
    }

    console.log('POST /v1/fragments ok', data);
    // Return both parsed body and useful headers (e.g., Location)
    return { data, headers: { Location: location } };
  } catch (err) {
    console.error('Unable to call POST /v1/fragments', {
      url,
      headersPresent: !!headers.Authorization,
      err: String(err),
    });
    throw err;
  }
}
