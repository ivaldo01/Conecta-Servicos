import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
} from "react-native";
import {
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
    NativeMediaAspectRatio,
    TestIds,
} from "react-native-google-mobile-ads";
import colors from "../constants/colors";

const FORCE_PRODUCTION_ADS = process.env.EXPO_PUBLIC_FORCE_PRODUCTION_ADS === "true";

const NATIVE_AD_UNIT_ID =
    !__DEV__ || FORCE_PRODUCTION_ADS
        ? process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID
        : TestIds.NATIVE;

export default function NativeAdCard({
    width = 300,
    height = 250,
    compact = false,
    style,
}) {
    const [nativeAd, setNativeAd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        let loadedAd = null;

        if (!NATIVE_AD_UNIT_ID) {
            setLoading(false);
            return () => { };
        }

        NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID, {
            aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
            startVideoMuted: true,
            requestNonPersonalizedAdsOnly: true,
        })
            .then((ad) => {
                if (!active) {
                    ad?.destroy?.();
                    return;
                }
                loadedAd = ad;
                setNativeAd(ad);
            })
            .catch((error) => {
                console.log("Erro ao carregar Native Ad:", error);
                if (active) setError(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
            if (loadedAd) {
                loadedAd.destroy();
            }
        };
    }, []);

    if (loading) {
        return null;
    }

    if (!nativeAd || error) {
        return null;
    }

    return (
        <NativeAdView
            nativeAd={nativeAd}
            style={[styles.card, { width, height }, style]}
        >
            <Text style={styles.badge}>Anúncio</Text>

            {nativeAd.icon && (
                <NativeAsset assetType={NativeAssetType.ICON}>
                    <Image
                        source={{ uri: nativeAd.icon.url }}
                        style={styles.icon}
                    />
                </NativeAsset>
            )}

            <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text style={styles.title}>{nativeAd.headline}</Text>
            </NativeAsset>

            {!!nativeAd.body && (
                <NativeAsset assetType={NativeAssetType.BODY}>
                    <Text style={styles.body}>{nativeAd.body}</Text>
                </NativeAsset>
            )}

            <NativeMediaView style={styles.media} />

            {!!nativeAd.callToAction && (
                <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                    <Text style={styles.cta}>
                        {nativeAd.callToAction}
                    </Text>
                </NativeAsset>
            )}
        </NativeAdView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 12,
        marginRight: 12,
        justifyContent: "space-between",
    },

    loadingBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    loadingText: {
        marginTop: 8,
        fontSize: 12,
        color: "#666",
    },

    fallback: {
        textAlign: "center",
        color: "#999",
    },

    badge: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#1A73E8",
        marginBottom: 6,
    },

    icon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        marginBottom: 6,
    },

    title: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 4,
    },

    body: {
        fontSize: 12,
        color: "#666",
        marginBottom: 6,
    },

    media: {
        width: "100%",
        height: 120,
        borderRadius: 10,
        marginBottom: 6,
    },

    cta: {
        backgroundColor: "#1A73E8",
        color: "#fff",
        textAlign: "center",
        padding: 6,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: "bold",
    },
});