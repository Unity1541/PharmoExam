// IMPORTANT: PASTE YOUR FIREBASE CONFIG OBJECT HERE
// 重要：請將您從 Firebase 控制台複製的 firebaseConfig 物件貼在此處

const firebaseConfig = {
  apiKey: "AIzaSyC94-4sWEx19HglgFQiC011iqcNofosuPc",
  authDomain: "myonlinetest-59a17.firebaseapp.com",
  projectId: "myonlinetest-59a17",
  storageBucket: "myonlinetest-59a17.firebasestorage.app",
  messagingSenderId: "563969240336",
  appId: "1:563969240336:web:127f122df6f2196f500995",
};

/**
 * Checks if the Firebase configuration has been set.
 * @returns {boolean} True if the config is set, false otherwise.
 */
function isFirebaseConfigured() {
  return (
    firebaseConfig &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}

// Global error holder
window.firebaseInitializationError = null;

// Initialize Firebase only if it's configured
let auth, db;
if (isFirebaseConfigured()) {
  try {
    // Initialize the core Firebase app
    firebase.initializeApp(firebaseConfig);

    // Conditionally initialize services only if their SDKs are loaded
    if (typeof firebase.auth === "function") {
      auth = firebase.auth();
    }

    if (typeof firebase.firestore === "function") {
      db = firebase.firestore();
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    window.firebaseInitializationError = error; // Store the error for other scripts to check
  }
} else {
  console.warn(
    "Firebase is not configured. The app will run in preview mode with mock data."
  );
}
