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

  // Update the UI to welcome the user
  userSection.hidden = false;

  // Show the user's username
  userSection.querySelector('.username').innerText = user.username || user.email || 'User';

  // Disable the Login button
  loginBtn.disabled = true;
  if (logoutBtn) logoutBtn.style.display = 'inline-block';

  // Toggle between text input and file input based on content type
  const typeSelect = document.getElementById('fragment-type');
  const textInputSection = document.getElementById('text-input-section');
  const fileInputSection = document.getElementById('file-input-section');

  typeSelect?.addEventListener('change', () => {
    const selectedType = typeSelect.value;
    if (selectedType.startsWith('image/')) {
      textInputSection.style.display = 'none';
      fileInputSection.style.display = 'block';
    } else {
      textInputSection.style.display = 'block';
      fileInputSection.style.display = 'none';
    }
  });

  // Helper to render fragments list into the UI
  const fragmentsListEl = document.getElementById('fragments-list');
  let currentFragments = [];

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

      currentFragments = fragments;

      if (!fragments || fragments.length === 0) {
        fragmentsListEl.innerText = '(no fragments)';
        setStatus('No fragments found');
        return;
      }

      // Build an HTML list of fragments with action buttons
      const rows = fragments.map((f) => {
        // f might be an id string or an object
        const id = f.id || f;
        const contentType = f.contentType || f.type || f.content_type || '';
        const size = f.size || f.byteSize || f.length || '';
        const created = f.created || f.createdAt || f.created_ts || '';
        const ownerId = f.ownerId || f.owner || f.userid || '';
        return `
          <div style="border: 1px solid #ddd; padding: 12px; margin: 8px 0; border-radius: 4px; background-color: #f9f9f9">
            <div><strong>ID:</strong> ${id}</div>
            <div><strong>Type:</strong> ${contentType}</div>
            <div><strong>Size:</strong> ${size} bytes</div>
            <div><strong>Created:</strong> ${new Date(created).toLocaleString()}</div>
            <div style="margin-top: 8px">
              <button class="view-btn" data-id="${id}" data-type="${contentType}">View Content</button>
              <button class="update-btn" data-id="${id}" data-type="${contentType}" style="margin-left: 4px">Update</button>
              <button class="delete-btn" data-id="${id}" style="margin-left: 4px; background-color: #f44336; color: white">Delete</button>
            </div>
          </div>`;
      });
      fragmentsListEl.innerHTML = rows.join('\n');
      setStatus(`Loaded ${fragments.length} fragments`);

      // Wire up the action buttons
      document.querySelectorAll('.view-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const contentType = e.target.getAttribute('data-type');
          await viewFragmentContent(id, contentType);
        });
      });

      document.querySelectorAll('.update-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const contentType = e.target.getAttribute('data-type');
          showUpdateSection(id, contentType);
        });
      });

      document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          if (confirm(`Are you sure you want to delete fragment ${id}?`)) {
            await deleteFragmentById(id);
          }
        });
      });
    } catch (err) {
      console.error('Error loading fragments', err);
      fragmentsListEl.innerText = '(error loading fragments)';
      setStatus('Error loading fragments (see console)');
    }
  }

  // View fragment content
  async function viewFragmentContent(id, contentType) {
    try {
      setStatus(`Loading content for ${id}...`);
      const result = await getFragmentContent(user, { id });

      if (result.blob) {
        // Image content - open in new window
        const url = URL.createObjectURL(result.blob);
        window.open(url, '_blank');
        setStatus('Opened image in new tab');
      } else {
        // Text content - show in alert or new window
        const content = result.text;
        if (contentType === 'text/html' || contentType === 'text/markdown') {
          const blob = new Blob([content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        } else {
          // For other text types, show in a modal-like alert
          alert(`Fragment Content (${contentType}):\n\n${content}`);
        }
        setStatus('Viewed fragment content');
      }
    } catch (err) {
      console.error('Error viewing fragment', err);
      alert('Failed to view fragment content. See console.');
      setStatus('Error viewing fragment');
    }
  }

  // Show update section
  function showUpdateSection(id, contentType) {
    const updateSection = document.getElementById('update-section');
    const updateInfo = document.getElementById('update-info');
    const updateTextSection = document.getElementById('update-text-section');
    const updateFileSection = document.getElementById('update-file-section');
    const updateContent = document.getElementById('update-content');
    const updateFile = document.getElementById('update-file');

    updateInfo.textContent = `Updating fragment: ${id} (${contentType})`;

    if (contentType.startsWith('image/')) {
      updateTextSection.style.display = 'none';
      updateFileSection.style.display = 'block';
      updateFile.value = '';
    } else {
      updateTextSection.style.display = 'block';
      updateFileSection.style.display = 'none';
      updateContent.value = '';
    }

    updateSection.style.display = 'block';
    updateSection.scrollIntoView({ behavior: 'smooth' });

    // Store current update context
    updateSection.dataset.fragmentId = id;
    updateSection.dataset.contentType = contentType;
  }

  // Delete fragment
  async function deleteFragmentById(id) {
    try {
      setStatus(`Deleting fragment ${id}...`);
      await deleteFragment(user, { id });
      alert(`Fragment ${id} deleted successfully!`);
      setStatus('Fragment deleted');
      await renderFragments();
    } catch (err) {
      console.error('Error deleting fragment', err);
      alert('Failed to delete fragment. See console.');
      setStatus('Error deleting fragment');
    }
  }

  // Initial render
  await renderFragments();

  // Wire refresh button
  const refreshBtn = document.getElementById('refresh-fragments-button');
  refreshBtn?.addEventListener('click', async () => {
    await renderFragments();
  });

  // Wire create fragment UI
  const createBtn = document.getElementById('create-fragment-button');
  createBtn?.addEventListener('click', async () => {
    const contentEl = document.getElementById('fragment-content');
    const fileEl = document.getElementById('fragment-file');
    const typeEl = document.getElementById('fragment-type');
    if (!typeEl) return;

    const contentType = typeEl.value || 'text/plain';
    let content;

    // Handle image uploads
    if (contentType.startsWith('image/')) {
      if (!fileEl || !fileEl.files || fileEl.files.length === 0) {
        return alert('Please select an image file to upload');
      }
      const file = fileEl.files[0];
      content = await file.arrayBuffer();
    } else {
      // Handle text content
      if (!contentEl) return;
      content = contentEl.value.trim();
      if (!content) return alert('Please enter some content for the fragment');

      // If the user selected application/json, validate it is valid JSON
      if (contentType === 'application/json') {
        try {
          const parsed = JSON.parse(content);
          content = JSON.stringify(parsed);
        } catch (e) {
          return alert('Content must be valid JSON when content type application/json is selected');
        }
      }
    }

    try {
      setStatus('Creating fragment...');
      const created = await createFragment(user, { content, contentType });
      console.log('Created fragment:', created);

      if (created && created.headers && created.headers.Location) {
        const loc = created.headers.Location;
        alert(`Fragment created successfully!\nLocation: ${loc}`);
      } else {
        alert('Fragment created successfully!');
      }

      // Clear inputs
      if (contentEl) contentEl.value = '';
      if (fileEl) fileEl.value = '';

      setStatus('Fragment created');
      await renderFragments();
    } catch (err) {
      console.error(err);
      alert('Failed to create fragment. See console for details.');
      setStatus('Error creating fragment');
    }
  });

  // Wire update fragment UI
  const updateBtn = document.getElementById('update-fragment-button');
  updateBtn?.addEventListener('click', async () => {
    const updateSection = document.getElementById('update-section');
    const id = updateSection.dataset.fragmentId;
    const contentType = updateSection.dataset.contentType;

    if (!id || !contentType) {
      alert('No fragment selected for update');
      return;
    }

    let content;

    if (contentType.startsWith('image/')) {
      const fileEl = document.getElementById('update-file');
      if (!fileEl || !fileEl.files || fileEl.files.length === 0) {
        return alert('Please select an image file to upload');
      }
      const file = fileEl.files[0];
      content = await file.arrayBuffer();
    } else {
      const contentEl = document.getElementById('update-content');
      if (!contentEl) return;
      content = contentEl.value.trim();
      if (!content) return alert('Please enter new content');

      if (contentType === 'application/json') {
        try {
          const parsed = JSON.parse(content);
          content = JSON.stringify(parsed);
        } catch (e) {
          return alert('Content must be valid JSON');
        }
      }
    }

    try {
      setStatus(`Updating fragment ${id}...`);
      await updateFragment(user, { id, content, contentType });
      alert(`Fragment ${id} updated successfully!`);
      setStatus('Fragment updated');
      updateSection.style.display = 'none';
      await renderFragments();
    } catch (err) {
      console.error('Error updating fragment', err);
      alert('Failed to update fragment. See console.');
      setStatus('Error updating fragment');
    }
  });

  // Wire cancel update button
  const cancelUpdateBtn = document.getElementById('cancel-update-button');
  cancelUpdateBtn?.addEventListener('click', () => {
    const updateSection = document.getElementById('update-section');
    updateSection.style.display = 'none';
    document.getElementById('update-content').value = '';
    document.getElementById('update-file').value = '';
  });
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);
