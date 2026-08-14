import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";
const ads = isExpoGo ? null : require("react-native-google-mobile-ads");

export const initializeAds = async () => {
    if (!ads) return;
    try {
        await ads.default().initialize();
    } catch (error) {
        console.log("Erro ao inicializar Ads:", error);
    }
};

export const requestAdsConsent = async () => {
    if (!ads) return { canRequestAds: false };
    try {
        return await ads.AdsConsent.gatherConsent();
    } catch (error) {
        console.log("Erro ao coletar consentimento:", error);
        return { canRequestAds: false };
    }
};
