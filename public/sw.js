// Service worker: makes the app installable and shows push notifications. No caching yet.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally empty: requests go straight to the network.
self.addEventListener("fetch", () => {});

// A push from the server (src/features/notifications/push.ts): { title, body, url, tag } as JSON.
self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    // Not JSON: show the generic notification below.
  }
  event.waitUntil(
    self.registration.showNotification(message.title || "FRICK", {
      body: message.body || "Novo u feedu",
      icon: "/icons/icon-192.png",
      tag: message.tag,
      data: { url: message.url || "/feed" },
    }),
  );
});

// Tapping a notification opens its page, in the app window if one is open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/feed", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
