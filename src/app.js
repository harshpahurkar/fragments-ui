// src/app.js

import { signIn, getUser, signOut, signOutLocal } from './auth';
import { getUserFragments, createFragment } from './api';

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

  // Wire create fragment UI
  const createBtn = document.getElementById('create-fragment-button');
  createBtn?.addEventListener('click', async () => {
    const contentEl = document.getElementById('fragment-content');
    if (!contentEl) return;
    const content = contentEl.value.trim();
    if (!content) return alert('Please enter some text for the fragment');
    try {
      const created = await createFragment(user, {
        content,
        contentType: 'text/plain',
      });
      console.log('Created fragment:', created);
      alert('Fragment created');
      contentEl.value = '';
    } catch (err) {
      console.error(err);
      alert('Failed to create fragment. See console for details.');
    }
  });
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);
