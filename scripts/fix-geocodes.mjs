// One-time script to backfill lat/lng for existing incidents
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./impacthub-567ce-firebase-adminsdk-fbsvc-fdac2416cb.json', 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
  // Read from .env.local
  readFileSync('./.env.local', 'utf8')
    .split('\n')
    .find(line => line.startsWith('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY='))
    ?.split('=')[1]?.trim();

async function geocode(location) {
  if (!MAPS_API_KEY || !location) return null;
  try {
    const encoded = encodeURIComponent(location + ', India');
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${MAPS_API_KEY}`);
    const data = await res.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    console.warn(`No results for: ${location}, status: ${data.status}, error: ${data.error_message || 'none'}`);
    return null;
  } catch (err) {
    console.error(`Failed for: ${location}`, err.message);
    return null;
  }
}

async function main() {
  console.log('Using Maps API Key:', MAPS_API_KEY?.substring(0, 10) + '...');
  
  const snapshot = await db.collection('incidents').get();
  console.log(`Found ${snapshot.size} incidents`);
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.lat && data.lng) {
      console.log(`✅ ${data.location} already has coords: ${data.lat}, ${data.lng}`);
      continue;
    }
    
    console.log(`📍 Geocoding: ${data.location}...`);
    const coords = await geocode(data.location);
    
    if (coords) {
      await doc.ref.update({ lat: coords.lat, lng: coords.lng });
      console.log(`   ✅ Updated: ${data.location} => ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`   ❌ Could not geocode: ${data.location}`);
    }
  }
  
  console.log('\nDone! All incidents now have accurate coordinates.');
}

main().catch(console.error);
