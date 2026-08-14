import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const Notifications = isExpoGo ? null : require('expo-notifications');

Notifications?.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

function getProjectId() {
    return (
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        null
    );
}

export async function registrarPushTokenUsuario(userId) {
    try {
        if (!Notifications) {
            console.log('Push: indisponível no Expo Go; use uma development build.');
            return null;
        }

        if (!userId) {
            console.log('Push: userId ausente.');
            return null;
        }

        if (!Device.isDevice) {
            console.log('Push: precisa de dispositivo físico.');
            return null;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Push: permissão não concedida.');
            return null;
        }

        const projectId = getProjectId();

        if (!projectId) {
            console.log('Push: projectId do Expo/EAS não encontrado.');
            return null;
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync({
            projectId,
        });

        const token = tokenResponse?.data || null;

        if (!token) {
            console.log('Push: token não retornado.');
            return null;
        }

        await setDoc(
            doc(db, 'usuarios', userId),
            {
                pushToken: token,
                expoPushToken: token,
                pushTokenUpdatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        console.log('Push token salvo com sucesso:', token);
        return token;
    } catch (error) {
        console.log('Erro real ao registrar push token:', error);
        return null;
    }
}
