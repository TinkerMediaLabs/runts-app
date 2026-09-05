/**
 * notifications.ts
 * Handles push notification permission, token registration and unregistration.
 *
 * Usage:
 *   import { Notifications } from '@/lib/notifications';
 *   await Notifications.registerToken(userId);   // call after sign-in
 *   await Notifications.unregisterToken(userId); // call when user disables notifications
 *   Notifications.addNotificationTapListener();  // call once at app startup
 */

import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { navigate } from '../navigation/RootNavigator';

// ---------------------------------------------------------------------------
// Notification handler — show alerts when app is in foreground
// ---------------------------------------------------------------------------

ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   false,
        shouldShowBanner: true,
        shouldShowList:   true,
    }),
});

// ---------------------------------------------------------------------------
// Tap listener — navigate to the story screen when a notification is tapped
// ---------------------------------------------------------------------------

let tapListenerSubscription: ReturnType<typeof ExpoNotifications.addNotificationResponseReceivedListener> | null = null;

function addNotificationTapListener(): void {
    if (tapListenerSubscription) return; // already registered

    tapListenerSubscription = ExpoNotifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        const storyId = data?.storyId as string | undefined;

        if (storyId) {
            navigate('StoryScreen', { storyID: storyId });
        }
    });
}

async function checkColdStartNotification(): Promise<void> {
    const response = await ExpoNotifications.getLastNotificationResponseAsync();
    const storyId = response?.notification.request.content.data?.storyId as string | undefined;

    if (storyId) {
        navigate('StoryScreen', { storyID: storyId });
    }
}

function removeNotificationTapListener(): void {
    tapListenerSubscription?.remove();
    tapListenerSubscription = null;
}

// ---------------------------------------------------------------------------
// Register device push token and save to UserDevice table
// ---------------------------------------------------------------------------

async function registerToken(userId: string): Promise<void> {
    if (!Device.isDevice) {
        console.log('[Notifications] Skipping — not a physical device');
        return;
    }

    try {
        // Request permission
        const { status: existing } = await ExpoNotifications.getPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
            const { status } = await ExpoNotifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('[Notifications] Permission denied');
            return;
        }

        // Get Expo push token
        const tokenData = await ExpoNotifications.getExpoPushTokenAsync({
            projectId: 'e36ad826-5ed4-43b4-a440-e0b4590e6c63',
        });

        const pushToken = tokenData.data;
        const platform  = Platform.OS;

        const client = generateClient<Schema>();

        // Check if a record already exists for this user
        const { data: existing_records } = await (client.models as any).UserDevice.list({
            filter: { userId: { eq: userId } },
        });

        if (existing_records && existing_records.length > 0) {
            // Update existing record
            await (client.models as any).UserDevice.update({
                id:        existing_records[0].id,
                pushToken,
                platform,
                updatedAt: new Date().toISOString(),
            });
        } else {
            // Create new record
            await (client.models as any).UserDevice.create({
                userId,
                pushToken,
                platform,
                updatedAt: new Date().toISOString(),
            });
        }

        console.log('[Notifications] Token registered:', pushToken);

    } catch (err) {
        console.warn('[Notifications] registerToken failed:', err);
    }
}

// ---------------------------------------------------------------------------
// Unregister — removes token from UserDevice table so Lambda skips this user
// Called when user disables author notifications in Settings
// ---------------------------------------------------------------------------

async function unregisterToken(userId: string): Promise<void> {
    if (!Device.isDevice) return;

    try {
        const client = generateClient<Schema>();

        const { data: records } = await (client.models as any).UserDevice.list({
            filter: { userId: { eq: userId } },
        });

        for (const record of records ?? []) {
            await (client.models as any).UserDevice.delete({ id: record.id });
        }

        console.log('[Notifications] Token unregistered for user:', userId);

    } catch (err) {
        console.warn('[Notifications] unregisterToken failed:', err);
    }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const Notifications = {
    registerToken,
    unregisterToken,
    addNotificationTapListener,
    removeNotificationTapListener,
    checkColdStartNotification,
};