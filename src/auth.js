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

// Create a simplified view of the user, with an extra method for creating the auth headers
function formatUser(user) {
  console.log('User Authenticated', { user });
  return {
    // If you add any other profile scopes, you can include them here
    username: user.profile['cognito:username'],
    email: user.profile.email,
    idToken: user.id_token,
    accessToken: user.access_token,
    // Use access_token for Authorization header by default (backends expect access tokens)
    authorizationHeaders: (type = 'application/json') => ({
      'Content-Type': type,
      Authorization: `Bearer ${user.access_token}`,
    }),
  };
}

export async function getUser() {
  // First, check if we're handling a signin redirect callback (e.g., is ?code=... in URL)
  if (window.location.search.includes('code=')) {
    const user = await userManager.signinCallback();
    // Remove the auth code from the URL without triggering a reload
    window.history.replaceState({}, document.title, window.location.pathname);
    return formatUser(user);
  }

  // Otherwise, get the current user
  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}
