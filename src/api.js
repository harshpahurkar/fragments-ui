// src/api.js
export async function getUserFragments(user, { expand = false } = {}) {
  const base = process.env.API_URL;
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
  const base = process.env.API_URL;
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
