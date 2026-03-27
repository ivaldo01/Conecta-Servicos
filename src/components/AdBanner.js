import React from "react";
import { View } from "react-native";
import {
    BannerAd,
    BannerAdSize,
    TestIds,
} from "react-native-google-mobile-ads";

const FORCE_PRODUCTION_ADS = process.env.EXPO_PUBLIC_FORCE_PRODUCTION_ADS === "true";

const BANNER_UNIT_ID =
    !__DEV__ || FORCE_PRODUCTION_ADS
        ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID
        : TestIds.BANNER;

export default function AdBanner({ compact = false, style }) {
    const size = compact
        ? BannerAdSize.BANNER
        : BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

    if (!BANNER_UNIT_ID) {
        return null;
    }

    return (
        <View style={[{ alignItems: "center", marginVertical: 12 }, style]}>
            <BannerAd
                unitId={BANNER_UNIT_ID}
                size={size}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    );
}