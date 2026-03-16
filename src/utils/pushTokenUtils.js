import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registrarPushTokenUsuario(uid) {
    try {
        if (!uid) return '';

        if (!Device.isDevice) {
            console.log('Push notifications precisam de um dispositivo físico.');
            return '';
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Permissão de notificação não concedida.');
            return '';
        }

        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ||
            Constants?.easConfig?.projectId;

        if (!projectId) {
            console.log('ProjectId do Expo/EAS não encontrado.');
            return '';
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync({
            projectId,
        });

        const pushToken = tokenResponse?.data || '';

        if (pushToken) {
            await updateDoc(doc(db, 'usuarios', uid), {
                pushToken,
            });
        }

        return pushToken;
    } catch (error) {
        console.log('Erro ao registrar push token:', error);
        return '';
    }
}
