'use strict';

const { AppError, UnauthorizedError } = require('../utils/errors.utils');
const config = require('../config/app.config');

const FIREBASE_SIGN_IN_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

class LoginService {
  async signIn(email, password) {
    const { webApiKey } = config.firebase;
    if (!webApiKey) {
      throw new AppError('Firebase Web API Key not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    const response = await fetch(`${FIREBASE_SIGN_IN_URL}?key=${webApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    if (!response.ok) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const { idToken, expiresIn } = await response.json();
    return { idToken, expiresIn };
  }
}

module.exports = new LoginService();
