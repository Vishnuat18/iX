// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB9MJBJ_RvhZcSGyw0wFrF2p8x-g_qm97Y",
    authDomain: "ixvi-a2bb1.firebaseapp.com",
    projectId: "ixvi-a2bb1",
    storageBucket: "ixvi-a2bb1.firebasestorage.app",
    messagingSenderId: "642350452338",
    appId: "1:642350452338:web:4354d4c5647d1bdbef3ceb",
    measurementId: "G-RBKRL01T3H"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Firestore Persistence for offline support
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Firestore persistence failed: Multiple tabs open");
        } else if (err.code == 'unimplemented') {
            console.warn("Firestore persistence not supported by browser");
        }
    });

const googleProvider = new firebase.auth.GoogleAuthProvider();
const storage = firebase.storage();

window.firebaseAuth = auth;
window.firestore = db;
window.storage = storage;
window.googleProvider = googleProvider;
window.auth = auth;
window.db = db;
