import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyA8BykUfTs3iYtBf5k-LjcF5D0-1beeULY",
  authDomain: "react-todo-7e88a.firebaseapp.com",
  projectId: "react-todo-7e88a",
  storageBucket: "react-todo-7e88a.firebasestorage.app",
  messagingSenderId: "655556786906",
  appId: "1:655556786906:web:2decc5571139f9691143e3",
  measurementId: "G-GR9XWYKGZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app);

export { db, auth };
