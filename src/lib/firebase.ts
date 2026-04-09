import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, onSnapshotsInSync } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connection state tracking
let isFirestoreConnected = true;
const connectionListeners: ((connected: boolean) => void)[] = [];

export const onConnectionChange = (callback: (connected: boolean) => void) => {
  connectionListeners.push(callback);
  callback(isFirestoreConnected);
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) connectionListeners.splice(index, 1);
  };
};

const notifyListeners = (connected: boolean) => {
  isFirestoreConnected = connected;
  connectionListeners.forEach(cb => cb(connected));
};

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent doc to test connection
    await getDocFromServer(doc(db, '_connection_test_', 'test'));
    console.log("Firestore connection successful.");
    notifyListeners(true);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Please check your Firebase configuration. The client is offline.");
      notifyListeners(false);
    } else {
      console.error("Firestore connection test failed:", error);
      notifyListeners(false);
    }
  }
}

// Monitor snapshots in sync to detect connection issues
onSnapshotsInSync(db, () => {
  // If we are getting snapshots, we are likely connected
  if (!isFirestoreConnected) {
    testConnection();
  }
});

testConnection();
// Re-test periodically
setInterval(testConnection, 30000);
