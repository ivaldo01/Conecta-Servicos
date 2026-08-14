import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";
const ads = isExpoGo ? null : require("react-native-google-mobile-ads");
const FORCE_PRODUCTION_ADS = process.env.EXPO_PUBLIC_FORCE_PRODUCTION_ADS === "true";

export default function NativeAdCard(props) {
    if (!ads) return null;
    return <NativeAdContent {...props} />;
}

function NativeAdContent({ width = 300, height = 250, style }) {
    const [nativeAd, setNativeAd] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        let loadedAd = null;
        const unitId = !__DEV__ || FORCE_PRODUCTION_ADS
            ? process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID
            : ads.TestIds.NATIVE;
        if (!unitId) return undefined;

        ads.NativeAd.createForAdRequest(unitId, {
            aspectRatio: ads.NativeMediaAspectRatio.LANDSCAPE,
            startVideoMuted: true,
            requestNonPersonalizedAdsOnly: true,
        }).then((ad) => {
            if (!active) return ad?.destroy?.();
            loadedAd = ad;
            setNativeAd(ad);
        }).catch((err) => {
            console.log("Erro ao carregar Native Ad:", err);
            if (active) setError(true);
        });

        return () => {
            active = false;
            loadedAd?.destroy?.();
        };
    }, []);

    if (!nativeAd || error) return null;

    return (
        <ads.NativeAdView nativeAd={nativeAd} style={[styles.card, { width, height }, style]}>
            <Text style={styles.badge}>Anúncio</Text>
            {nativeAd.icon && (
                <ads.NativeAsset assetType={ads.NativeAssetType.ICON}>
                    <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
                </ads.NativeAsset>
            )}
            <ads.NativeAsset assetType={ads.NativeAssetType.HEADLINE}>
                <Text style={styles.title}>{nativeAd.headline}</Text>
            </ads.NativeAsset>
            {!!nativeAd.body && (
                <ads.NativeAsset assetType={ads.NativeAssetType.BODY}>
                    <Text style={styles.body}>{nativeAd.body}</Text>
                </ads.NativeAsset>
            )}
            <ads.NativeMediaView style={styles.media} />
            {!!nativeAd.callToAction && (
                <ads.NativeAsset assetType={ads.NativeAssetType.CALL_TO_ACTION}>
                    <Text style={styles.cta}>{nativeAd.callToAction}</Text>
                </ads.NativeAsset>
            )}
        </ads.NativeAdView>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 12, marginRight: 12, justifyContent: "space-between" },
    badge: { fontSize: 10, fontWeight: "bold", color: "#1A73E8", marginBottom: 6 },
    icon: { width: 32, height: 32, borderRadius: 8, marginBottom: 6 },
    title: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
    body: { fontSize: 12, color: "#666", marginBottom: 6 },
    media: { width: "100%", height: 120, borderRadius: 10, marginBottom: 6 },
    cta: { backgroundColor: "#1A73E8", color: "#fff", textAlign: "center", padding: 6, borderRadius: 8, fontSize: 12, fontWeight: "bold" },
});
