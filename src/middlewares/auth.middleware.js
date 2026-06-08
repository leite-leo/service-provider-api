'use strict';

const admin = require('../config/firebase.config');
const { User } = require('../models');
const { UnauthorizedError } = require('../utils/errors.utils');

const FIREBASE_ERROR_MESSAGES = {
  'auth/id-token-expired': 'Token expired',
  'auth/id-token-revoked': 'Token revoked',
  'auth/user-disabled': 'User account disabled',
  'auth/invalid-id-token': 'Invalid token',
  'auth/argument-error': 'Invalid token',
};

module.exports = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7).trim();

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token, true);
    } catch (firebaseError) {
      const message = FIREBASE_ERROR_MESSAGES[firebaseError.code] || 'Invalid token';
      throw new UnauthorizedError(message);
    }

    const user = await User.findOne({ where: { firebaseUid: decodedToken.uid } });
    if (!user) {
      throw new UnauthorizedError('User not registered');
    }

    req.user = user;
    req.firebaseClaims = decodedToken;

    return next();
  } catch (error) {
    return next(error);
  }
};
