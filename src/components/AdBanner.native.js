import React, { useState } from "react";
import { View } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";
const ads = isExpoGo ? null : require("react-native-google-mobile-ads");
const FORCE_PRODUCTION_ADS = process.env.EXPO_PUBLIC_FORCE_PRODUCTION_ADS === "true";

export default function AdBanner({ compact = false, style, enabled = true }) {
    const [error, setError] = useState(false);

    if (!enabled || !ads || error) return null;

    const unitId = !__DEV__ || FORCE_PRODUCTION_ADS
        ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID
        : ads.TestIds.BANNER;
    if (!unitId) return null;

    return (
        <View style={[{ alignItems: "center", marginVertical: 12, minHeight: 60, justifyContent: "center" }, style]}>
            <ads.BannerAd
                unitId={unitId}
                size={compact ? ads.BannerAdSize.BANNER : ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                onAdFailedToLoad={(err) => {
                    console.log("Erro ao carregar Banner Ad:", err);
                    setError(true);
                }}
            />
        </View>
    );
}
