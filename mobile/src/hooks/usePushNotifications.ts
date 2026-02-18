import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { apiFetch, getToken } from '../lib/api';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Register token with backend
        registerTokenWithBackend(token);
      }
    });

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    // Handle notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationTap(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationTap = (data: any) => {
    // Navigate based on notification type
    if (data?.link) {
      router.push(data.link);
      return;
    }

    switch (data?.type) {
      case 'booking_request':
      case 'booking_accepted':
      case 'booking_completed':
        if (data.bookingId) {
          router.push(`/booking/${data.bookingId}`);
        }
        break;
      case 'new_message':
        if (data.conversationId) {
          router.push(`/chat/${data.conversationId}`);
        }
        break;
      case 'new_review':
        router.push('/artisan/reviews');
        break;
      case 'warranty_claim':
        router.push('/artisan/warranty');
        break;
      case 'verification_approved':
      case 'verification_rejected':
        router.push('/artisan/verification');
        break;
      default:
        router.push('/notifications');
    }
  };

  const registerTokenWithBackend = async (token: string) => {
    try {
      const authToken = await getToken();
      if (!authToken) return;

      await apiFetch('/push-tokens', {
        token: authToken,
        method: 'POST',
        body: JSON.stringify({
          token,
          platform: Platform.OS as 'ios' | 'android',
          deviceId: Constants.deviceId,
        }),
      });
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  };

  const unregisterToken = async () => {
    if (!expoPushToken) return;

    try {
      const authToken = await getToken();
      if (!authToken) return;

      await apiFetch('/push-tokens', {
        token: authToken,
        method: 'DELETE',
        body: JSON.stringify({ token: expoPushToken }),
      });
    } catch (error) {
      console.error('Failed to unregister push token:', error);
    }
  };

  return {
    expoPushToken,
    notification,
    unregisterToken,
  };
}

async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Must be a physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get the token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    token = pushToken.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
  }

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    });

    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Bookings',
      description: 'Booking requests and updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'New messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return token;
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: trigger || null,
  });
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}
