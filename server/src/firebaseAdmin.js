const admin = require("firebase-admin");

// On Cloud Run this picks up the service account's Application Default
// Credentials automatically — no key file needed. Locally, set
// GOOGLE_APPLICATION_CREDENTIALS to a service account JSON for `npm run dev`
// to reach Firestore/Auth.
if (!admin.apps.length) {
  admin.initializeApp();
}

module.exports = admin;
