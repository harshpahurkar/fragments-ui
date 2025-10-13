// src/auth.js

import { UserManager } from 'oidc-client-ts';

// Prefer using the Cognito Hosted UI domain (e.g. your-domain.auth.us-east-1.amazoncognito.com)
// Set AWS_COGNITO_AUTH_DOMAIN in your environment to that domain (without https://)
// Helper to compute redirect URI at runtime when not provided at build time
function defaultRedirectUri() {
  if (typeof window !== 'undefined') return `${window.location.origin}/callback`;
  return process.env.OAUTH_SIGN_IN_REDIRECT_URL;
}

const cognitoAuthConfig = {
  authority: process.env.AWS_COGNITO_AUTH_DOMAIN
    ? // allow either a full URL (https://...) or a bare domain
      process.env.AWS_COGNITO_AUTH_DOMAIN.startsWith('http')
      ? process.env.AWS_COGNITO_AUTH_DOMAIN
      : `https://${process.env.AWS_COGNITO_AUTH_DOMAIN}`
    : `https://cognito-idp.us-east-1.amazonaws.com/${process.env.AWS_COGNITO_POOL_ID}`,
  client_id: process.env.AWS_COGNITO_CLIENT_ID,
  redirect_uri: process.env.OAUTH_SIGN_IN_REDIRECT_URL || defaultRedirectUri(),
  // Offer a post-logout redirect URI so oidc-client-ts can send it to the provider.
  // Default to a small local landing page that gives a friendly message and a link
  // back to the app. Make sure this exact URL is registered in your Cognito App
  // client's Sign out URL(s).
  post_logout_redirect_uri:
    process.env.OAUTH_SIGN_OUT_REDIRECT_URL ||
    (typeof window !== 'undefined' ? `${window.location.origin}/post-logout.html` : undefined),
  response_type: 'code',
  scope: 'openid email phone',
  // no revoke of "access token" (https://github.com/authts/oidc-client-ts/issues/262)
  revokeTokenTypes: ['refresh_token'],
  // no silent renew via "prompt=none" (https://github.com/authts/oidc-client-ts/issues/366)
  automaticSilentRenew: false,
};

// Create a UserManager instance
const userManager = new UserManager({
  ...cognitoAuthConfig,
});

export async function signIn() {
  // Trigger a redirect to the Cognito auth page, so user can authenticate
  await userManager.signinRedirect();
}

export async function signOut() {
  // Trigger a redirect to the provider to end the session there as well.
  try {
    // Retrieve current user so we can provide an id_token_hint if available.
    const current = await userManager.getUser();
    const idTokenHint = current && (current.id_token || current.idToken);
    if (typeof userManager.signoutRedirect === 'function') {
      // Provide id_token_hint to some providers (including Cognito) which expect it
      // and will validate post_logout_redirect_uri against the registered values.
      await userManager.signoutRedirect({ id_token_hint: idTokenHint });
    } else if (typeof userManager.signout === 'function') {
      // older/newer variants
      await userManager.signout();
    } else {
      // Fallback: remove local user and reload
      if (typeof userManager.removeUser === 'function') await userManager.removeUser();
      try {
        window.location.replace(window.location.pathname);
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error during signOut redirect:', err);
    // fallback to local remove
    try {
      if (typeof userManager.removeUser === 'function') await userManager.removeUser();
    } catch (e) {
      // ignore
    }
  }
}

export async function signOutLocal() {
  try {
    if (typeof userManager.removeUser === 'function') await userManager.removeUser();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error removing local user:', err);
  }
  try {
    window.location.replace(window.location.pathname);
  } catch (e) {
    // ignore
  }
}

// Create a simplified view of the user, with an extra method for creating the auth headers
function formatUser(user) {
  // Be resilient to missing profile fields. Some Identity Providers use different
  // claim names, so try a sequence of fallbacks for username/email.
  // eslint-disable-next-line no-console
  console.log('User Authenticated', { user });
  const profile = user && user.profile ? user.profile : {};
  const username =
    profile['cognito:username'] ||
    profile.preferred_username ||
    profile.nickname ||
    profile.name ||
    profile.email ||
    'User';
  const email = profile.email || profile.email_address || null;
  const idToken = user && (user.id_token || user.idToken);
  const accessToken = user && (user.access_token || user.accessToken);

  return {
    username,
    email,
    idToken,
    accessToken,
    authorizationHeaders: (type = 'application/json') => ({
      'Content-Type': type,
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    }),
  };
}

export async function getUser() {
  // First, check if we're handling a signin redirect callback (e.g., is ?code=... in URL)
  if (window.location.search.includes('code=')) {
    try {
      // Different versions of oidc-client-ts expose slightly different helper names.
      // Try a few common method names so we're robust across versions.
      let user = null;
      if (typeof userManager.signinCallback === 'function') {
        user = await userManager.signinCallback();
      } else if (typeof userManager.signinRedirectCallback === 'function') {
        user = await userManager.signinRedirectCallback();
      } else if (typeof userManager.signinRedirect === 'function') {
        // signinRedirect is the redirect trigger, not the callback; keep for completeness
        // but don't call it here.
      }

      // Remove the auth code from the URL without triggering a reload
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        // ignore replaceState errors
      }

      if (user) return formatUser(user);

      // If we couldn't parse a user from the callback, just continue and allow
      // getUser() below to try to read an existing user from storage.
    } catch (err) {
      // Make sure any callback error is visible in the console during development
      // and do not leave the app in a broken/blank state.
      // eslint-disable-next-line no-console
      console.error('Error handling signin callback:', err);
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        // ignore
      }
      // fallthrough to try getUser() below
    }
  }

  // Otherwise, get the current user
  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}
