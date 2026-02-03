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

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon.png",
    badge: "/icon.png",
    data: payload.data, // ✅ Pass data through
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ ADD THIS - Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUnclassified: true })
      .then((windowClients) => {
        // Check if dashboard is already open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
