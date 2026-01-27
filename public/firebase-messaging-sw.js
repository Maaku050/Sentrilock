// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBS0C9ujw7iU3w9ZJYOfWMwH6u7jHByE0c",
  authDomain: "sentrilock-9db8f.firebaseapp.com",
  projectId: "sentrilock-9db8f",
  storageBucket: "sentrilock-9db8f.firebasestorage.app",
  messagingSenderId: "715232745006",
  appId: "1:715232745006:web:d25afa781024303e5e31bf",
  measurementId: "G-TW27T7ZFEH",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });
});
