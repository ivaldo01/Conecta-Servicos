// Versão para MOBILE (Android/iOS)
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

export const initializeAds = async () => {
    try {
        await mobileAds().initialize();
        // console.log('Ads inicializados com sucesso.');
    } catch (error) {
        console.log('Erro ao inicializar Ads:', error);
    }
};

export const requestAdsConsent = async () => {
    try {
        const consentInfo = await AdsConsent.gatherConsent();
        return consentInfo;
    } catch (error) {
        console.log('Erro ao coletar consentimento:', error);
        return { canRequestAds: false };
    }
};
