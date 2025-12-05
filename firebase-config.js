// firebase-config.js
// This file correctly initializes the global 'firebase' object using the 
// Compatibility SDK (v9 compat) scripts loaded in admin.html.

const firebaseConfig = {
  apiKey: "AIzaSyBTbfSlz0xvfBzAWmJzXDGbIC6Up0-6eU4",
  authDomain: "aptitudelabs-in.firebaseapp.com",
  projectId: "aptitudelabs-in",
  storageBucket: "aptitudelabs-in.firebasestorage.app",
  messagingSenderId: "175469863880",
  appId: "1:175469863880:web:b7b25ed27120665af716fd"
};

// Initialize Firebase App using the global object
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}