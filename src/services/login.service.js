'use strict';

const { AppError, UnauthorizedError, ForbiddenError } = require('../utils/errors.utils');
const { User } = require('../models');
const config = require('../config/app.config');

const FIREBASE_SIGN_IN_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

class LoginService {
  async signIn(email, password) {
    /*
     * Restrict login to emails registered in our system. Without this
     * safeguard the endpoint could be used as a credential stuffing
     * oracle against arbitrary emails in the Firebase project. In
     * production this would be augmented with rate limiting and CAPTCHA.
     */
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new ForbiddenError('Email not authorized to log in');
    }

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
