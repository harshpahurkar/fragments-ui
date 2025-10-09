// src/app.js

import { signIn, getUser } from './auth';
import { getUserFragments, createFragment } from './api';

async function init() {
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  // Wire up event handlers to deal with login and logout.
  loginBtn.onclick = () => {
    // Sign-in via the Amazon Cognito Hosted UI (requires redirects), see:
    signIn();
  };

  // See if we're signed in (i.e., we'll have a `user` object)
  const user = await getUser();
  if (!user) {
    return;
  }
  const userFragments = await getUserFragments(user);
  console.log('fragments', userFragments);

  // Update the UI to welcome the user
  userSection.hidden = false;

  // Show the user's username
  userSection.querySelector('.username').innerText = user.username;

  // Disable the Login button
  loginBtn.disabled = true;

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
