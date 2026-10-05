import {
    initializeApp,
    getApps,
    getApp
} from "firebase/app";

import {
    getAnalytics,
    isSupported
} from "firebase/analytics";

import {
    getAuth
} from "firebase/auth";

import {
    getFirestore
} from "firebase/firestore";

import {
    getDatabase
} from "firebase/database";

const firebaseConfig = {
    apiKey:
        "AIzaSyBtQ4O-pq55f8040XM8_gRVZMASKPcoUPQ",

    authDomain:
        "sintax-4980b.firebaseapp.com",

    databaseURL:
        "https://sintax-4980b-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId:
        "sintax-4980b",

    storageBucket:
        "sintax-4980b.firebasestorage.app",

    messagingSenderId:
        "372681780011",

    appId:
        "1:372681780011:web:cf8dad82b2b3c70f82736e",

    measurementId:
        "G-BBFGB2SSV8"
};

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(
              firebaseConfig
          );

const auth =
    getAuth(app);

const db =
    getFirestore(app);

const database =
    getDatabase(app);

let analytics = null;

if (
    typeof window !==
    "undefined"
) {
    isSupported()
        .then(supported => {
            if (supported) {
                analytics =
                    getAnalytics(
                        app
                    );
            }
        })
        .catch(error => {
            console.error(
                "Firebase Analytics initialization failed:",
                error
            );
        });
}

export {
    app,
    auth,
    db,
    database,
    analytics
};