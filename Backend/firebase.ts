import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
//import { getFirestore } from "firebase/firestore";


const firebaseConfig = { 
    apiKey: "AIzaSyBe8XL1FOtFA7dGVSt_Js0jg3z3k_A5CAk",
    authDomain: "cosplanner-capstone.firebaseapp.com", 
    projectId: "cosplanner-capstone",
    appId: "1:718332114100:web:55db6c04a95afaaa5453e1",
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const google = new GoogleAuthProvider();










// const admin = require('firebase-admin'); //testing
// const serviceAccount = require('./serviceAccountKey.json');
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

// module.exports = {admin};