// firebaseconfig.js - Centralized Firebase config and initialization
const firebaseConfig = {
    apiKey: "AIzaSyCrjzxb0ZxJEAQhgZ2a4aicPat_miqKBk4",
    authDomain: "velan-traders.firebaseapp.com",
    projectId: "velan-traders",
    storageBucket: "velan-traders.firebasestorage.app",
    messagingSenderId: "68784649629",
    appId: "1:68784649629:web:113959855af21b7c2b2b74",
    measurementId: "G-50GQ5YR8P3"
  };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();
