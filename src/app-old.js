// src/app.js

import { signIn, getUser, signOut, signOutLocal } from './auth';
import {
  getUserFragments,
  createFragment,
  updateFragment,
  deleteFragment,
  getFragmentContent,
} from './api';

async function init() {
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const statusEl = document.getElementById('status');
  const setStatus = (s) => {
    if (statusEl) statusEl.innerText = `Status: ${s}`;
    // eslint-disable-next-line no-console
    console.log('STATUS:', s);
  };
  // Wire up event handlers to deal with login and logout.
  loginBtn.onclick = () => {
    // Sign-in via the Amazon Cognito Hosted UI (requires redirects), see:
    signIn();
  };

  const logoutBtn = document.getElementById('logout');
  logoutBtn.onclick = async () => {
    // Try to perform a full sign out via the provider. If that fails, at least
    // clear local user session.
    setStatus('Signing out...');
    try {
      await signOut();
    } catch (err) {
      // If provider signout fails, remove local session and update UI
      // eslint-disable-next-line no-console
      console.error('Sign out redirect failed, falling back to local sign out', err);
      await signOutLocal();
    }
    // Update UI immediately in case redirect did not happen
    logoutBtn.style.display = 'none';
    loginBtn.disabled = false;
    userSection.hidden = true;
    setStatus('Signed out');
  };

  // See if we're signed in (i.e., we'll have a `user` object)
  let user = null;
  try {
    setStatus('Checking authentication...');
    user = await getUser();
    setStatus(user ? `Authenticated as ${user.username}` : 'Not authenticated');
    // If we're authenticated, update the UI immediately so Logout/login state is correct
    if (user) {
      try {
        userSection.hidden = false;
        const unameEl = userSection.querySelector('.username');
        if (unameEl) unameEl.innerText = user.username || user.email || 'User';
        loginBtn.disabled = true;
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
      } catch (e) {
        // ignore UI update errors
      }
    }
  } catch (err) {
    // If something went wrong parsing the redirect callback, log it and keep the
    // page interactive so the user can try to login again.
    // eslint-disable-next-line no-console
    console.error('Error getting user during init:', err);
    setStatus('Error handling authentication (see console)');
    user = null;
  }

  if (!user) {
    // Nothing more to do until the user logs in.
    return;
  }
  const userFragments = await getUserFragments(user);
  console.log('fragments', userFragments);
  // Update the UI to welcome the user
  userSection.hidden = false;

  // Show the user's username
  userSection.querySelector('.username').innerText = user.username || user.email || 'User';

  // Disable the Login button
  loginBtn.disabled = true;
  if (logoutBtn) logoutBtn.style.display = 'inline-block';

  // Helper to render fragments list into the UI
  const fragmentsListEl = document.getElementById('fragments-list');
  async function renderFragments() {
    try {
      setStatus('Loading fragments...');
      const data = await getUserFragments(user, { expand: true });
      // Normalize different possible responses
      let fragments = [];
      if (!data) fragments = [];
      else if (Array.isArray(data)) fragments = data;
      else if (Array.isArray(data.fragments)) fragments = data.fragments;
      else if (Array.isArray(data.results)) fragments = data.results;
      else fragments = data;

      if (!fragments || fragments.length === 0) {
        fragmentsListEl.innerText = '(no fragments)';
        setStatus('No fragments found');
        return;
      }

      // Build an HTML list of fragments and metadata
      const rows = fragments.map((f) => {
        // f might be an id string or an object
        const id = f.id || f;
        const contentType = f.contentType || f.type || f.content_type || '';
        const size = f.size || f.byteSize || f.length || '';
        const created = f.created || f.createdAt || f.created_ts || '';
        const ownerId = f.ownerId || f.owner || f.userid || '';
        return `
          <div style="border-bottom:1px solid #ddd; padding:6px 0">
            <div><strong>id:</strong> ${id}</div>
            <div><strong>owner:</strong> ${ownerId}</div>
            <div><strong>contentType:</strong> ${contentType}</div>
            <div><strong>size:</strong> ${size}</div>
            <div><strong>created:</strong> ${created}</div>
          </div>`;
      });
      fragmentsListEl.innerHTML = rows.join('\n');
      setStatus(`Loaded ${fragments.length} fragments`);
    } catch (err) {
      console.error('Error loading fragments', err);
      fragmentsListEl.innerText = '(error loading fragments)';
      setStatus('Error loading fragments (see console)');
    }
  }

  // initial render
  renderFragments();

  // Wire refresh button
  const refreshBtn = document.getElementById('refresh-fragments-button');
  refreshBtn?.addEventListener('click', async () => {
    await renderFragments();
  });

  // Wire create fragment UI
  const createBtn = document.getElementById('create-fragment-button');
  createBtn?.addEventListener('click', async () => {
    const contentEl = document.getElementById('fragment-content');
    const typeEl = document.getElementById('fragment-type');
    if (!contentEl || !typeEl) return;
    const content = contentEl.value.trim();
    const contentType = typeEl.value || 'text/plain';
    if (!content) return alert('Please enter some content for the fragment');

    // If the user selected application/json, validate it is valid JSON
    if (contentType === 'application/json') {
      try {
        // Try to parse to make sure it's valid JSON. Then send the canonical string.
        const parsed = JSON.parse(content);
        // Re-stringify to avoid loose formatting issues
        try {
          // Use pretty printing for readability on server side if stored
          const canonical = JSON.stringify(parsed);
          // send canonical
          const created = await createFragment(user, { content: canonical, contentType });
          console.log('Created fragment:', created);
          if (created && created.headers && created.headers.Location) {
            const loc = created.headers.Location;
            alert(`Fragment created\nLocation: ${loc}`);
            // show in UI and add open/copy buttons
            try {
              const lastEl = document.getElementById('last-created');
              if (lastEl) {
                lastEl.innerHTML = `Created: <a href="${loc}" target="_blank">${loc}</a> <button id="copy-loc">Copy</button> <button id="view-html">View HTML</button>`;
                const copyBtn = document.getElementById('copy-loc');
                if (copyBtn) copyBtn.onclick = () => navigator.clipboard?.writeText(loc);
                const viewBtn = document.getElementById('view-html');
                if (viewBtn)
                  viewBtn.onclick = async () => {
                    try {
                      setStatus('Fetching rendered HTML...');
                      const fetchHeaders = { ...user.authorizationHeaders(), Accept: 'text/html' };
                      const res = await fetch(loc, { method: 'GET', headers: fetchHeaders });
                      if (!res.ok) {
                        alert('Failed to fetch rendered HTML: ' + res.status);
                        setStatus('Failed to fetch rendered HTML');
                        return;
                      }
                      const html = await res.text();
                      const blob = new Blob([html], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      setStatus('Loaded rendered HTML');
                    } catch (e) {
                      console.error('Error fetching rendered HTML', e);
                      alert('Error fetching rendered HTML. See console.');
                      setStatus('Error fetching rendered HTML');
                    }
                  };
              }
            } catch (e) {
              // ignore
            }
          } else {
            alert('Fragment created');
          }
          contentEl.value = '';
          await renderFragments();
        } catch (e) {
          // fallback to raw string if stringify fails
          const created = await createFragment(user, { content, contentType });
          console.log('Created fragment (raw):', created);
          if (created && created.headers && created.headers.Location) {
            const loc = created.headers.Location;
            alert(`Fragment created\nLocation: ${loc}`);
            try {
              const lastEl = document.getElementById('last-created');
              if (lastEl) {
                lastEl.innerHTML = `Created: <a href="${loc}" target="_blank">${loc}</a> <button id="copy-loc">Copy</button> <button id="view-html">View HTML</button>`;
                const copyBtn = document.getElementById('copy-loc');
                if (copyBtn) copyBtn.onclick = () => navigator.clipboard?.writeText(loc);
                const viewBtn = document.getElementById('view-html');
                if (viewBtn)
                  viewBtn.onclick = async () => {
                    try {
                      setStatus('Fetching rendered HTML...');
                      const fetchHeaders = { ...user.authorizationHeaders(), Accept: 'text/html' };
                      const res = await fetch(loc, { method: 'GET', headers: fetchHeaders });
                      if (!res.ok) {
                        alert('Failed to fetch rendered HTML: ' + res.status);
                        setStatus('Failed to fetch rendered HTML');
                        return;
                      }
                      const html = await res.text();
                      const blob = new Blob([html], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      setStatus('Loaded rendered HTML');
                    } catch (e) {
                      console.error('Error fetching rendered HTML', e);
                      alert('Error fetching rendered HTML. See console.');
                      setStatus('Error fetching rendered HTML');
                    }
                  };
              }
            } catch (ex) {
              // ignore
            }
          } else {
            alert('Fragment created');
          }
          contentEl.value = '';
          await renderFragments();
        }
      } catch (e) {
        return alert('Content must be valid JSON when content type application/json is selected');
      }
    } else {
      try {
        const created = await createFragment(user, { content, contentType });
        console.log('Created fragment:', created);
        if (created && created.headers && created.headers.Location) {
          const loc = created.headers.Location;
          alert(`Fragment created\nLocation: ${loc}`);
          try {
            const lastEl = document.getElementById('last-created');
            if (lastEl) {
              lastEl.innerHTML = `Created: <a href="${loc}" target="_blank">${loc}</a> <button id="copy-loc">Copy</button> <button id="view-html">View HTML</button>`;
              const copyBtn = document.getElementById('copy-loc');
              if (copyBtn) copyBtn.onclick = () => navigator.clipboard?.writeText(loc);
              const viewBtn = document.getElementById('view-html');
              if (viewBtn)
                viewBtn.onclick = async () => {
                  try {
                    setStatus('Fetching rendered HTML...');
                    const fetchHeaders = { ...user.authorizationHeaders(), Accept: 'text/html' };
                    const res = await fetch(loc, { method: 'GET', headers: fetchHeaders });
                    if (!res.ok) {
                      alert('Failed to fetch rendered HTML: ' + res.status);
                      setStatus('Failed to fetch rendered HTML');
                      return;
                    }
                    const html = await res.text();
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setStatus('Loaded rendered HTML');
                  } catch (e) {
                    console.error('Error fetching rendered HTML', e);
                    alert('Error fetching rendered HTML. See console.');
                    setStatus('Error fetching rendered HTML');
                  }
                };
            }
          } catch (ex) {
            // ignore
          }
        } else {
          alert('Fragment created');
        }
        contentEl.value = '';
        await renderFragments();
      } catch (err) {
        console.error(err);
        alert('Failed to create fragment. See console for details.');
      }
    }
  });
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);
