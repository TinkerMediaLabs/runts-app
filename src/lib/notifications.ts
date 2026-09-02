/**
 * notifications.ts
 * Handles push notification permission and token registration.
 *
 * Usage:
 *   import { Notifications } from '@/lib/notifications';
 *   await Notifications.registerToken(userId); // call after sign-in
 */

import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Show notifications when app is in foreground
ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  false,
        shouldShowBanner: true,
        shouldShowList:   true,
    }),
});

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
        const platform  = Platform.OS; // 'ios' | 'android'

        // Save to UserDevice table
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
// Export
// ---------------------------------------------------------------------------

export const Notifications = {
    registerToken,
};