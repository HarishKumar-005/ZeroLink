// This is a mock Firebase configuration.
// In a real app, you would initialize Firebase here with your project credentials.
// For example:
// import { initializeApp } from "firebase/app";
// import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
//
// const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "...",
//   projectId: "...",
//   storageBucket: "...",
//   messagingSenderId: "...",
//   appId: "..."
// };
//
// const app = initializeApp(firebaseConfig);
// export const db = getFirestore(app);
// enableIndexedDbPersistence(db).catch((err) => {
//   if (err.code == 'failed-precondition') {
//     // Multiple tabs open, persistence can only be enabled
//     // in one tab at a a time.
//   } else if (err.code == 'unimplemented') {
//     // The current browser does not support all of the
//     // features required to enable persistence
//   }
// });

// Since we don't have real credentials, we'll export mock objects.
// The useLogicStorage hook will handle the fallback to localStorage.
export const db = null;
