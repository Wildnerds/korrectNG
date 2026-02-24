/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('[Push Worker] Push received:', event);

  let data = {
    title: 'KorrectNG',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {} as Record<string, unknown>,
    tag: 'korrectng-notification',
    actions: [] as Array<{ action: string; title: string }>,
    requireInteraction: false,
    image: undefined as string | undefined,
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
      };
    } catch (e) {
      console.error('[Push Worker] Error parsing push data:', e);
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    image: data.image,
    tag: data.tag || 'korrectng-notification',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Push Worker] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = (event.notification.data || {}) as Record<string, string>;
  let url = '/dashboard';

  // Handle specific actions
  if (action === 'view' || action === 'pay' || action === 'confirm') {
    url = data.link || '/dashboard';
  } else if (action === 'dispute') {
    url = '/dashboard/disputes';
  } else if (action === 'dismiss') {
    return; // Just close the notification
  } else if (data.link) {
    url = data.link;
  } else {
    // Default navigation based on notification type
    switch (data.type) {
      case 'booking_request':
      case 'booking_accepted':
      case 'booking_completed':
        url = data.bookingId ? `/dashboard/bookings/${data.bookingId}` : '/dashboard/bookings';
        break;
      case 'new_message':
        url = data.conversationId ? `/messages/${data.conversationId}` : '/messages';
        break;
      case 'new_review':
        url = '/dashboard/artisan/reviews';
        break;
      case 'warranty_claim':
        url = '/dashboard/warranty';
        break;
      case 'verification_approved':
      case 'verification_rejected':
        url = '/dashboard/artisan/verification';
        break;
      case 'payment_received':
      case 'payment_released':
        url = '/dashboard/earnings';
        break;
      default:
        url = '/dashboard';
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            (client as WindowClient).navigate(url);
          }
          return;
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Push Worker] Notification closed:', event.notification.tag);
});

export {};
