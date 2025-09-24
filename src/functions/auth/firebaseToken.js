const admin = require("firebase-admin");

// Initialize Firebase Admin using your service account JSON
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

exports.handler = async (event) => {
  try {
    // Get AWS user ID from JWT authorizer
    const userId = event.requestContext.authorizer.principalId;

    // Generate Firebase custom token
    const firebaseToken = await admin.auth().createCustomToken(userId);

    return {
      statusCode: 200,
      body: JSON.stringify({ firebaseToken }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to create Firebase token" }) };
  }
};
