const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID;

const app = initializeApp({
  credential: cert({
    projectId: projectId,
    clientEmail: clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  })
});

async function listBuckets() {
  try {
    const [buckets] = await getStorage(app).getBuckets();
    console.log('Buckets:');
    buckets.forEach(b => console.log(b.name));
    
    if (buckets.length > 0) {
      console.log('Setting CORS on:', buckets[0].name);
      await buckets[0].setCorsConfiguration([
        {
          origin: ['*'],
          method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
          maxAgeSeconds: 3600
        }
      ]);
      console.log('CORS set successfully!');
    }
  } catch (error) {
    console.error('Error listing buckets:', error);
  }
}

listBuckets();
