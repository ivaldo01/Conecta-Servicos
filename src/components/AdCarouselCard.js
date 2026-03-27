import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AdCarouselCard({
    title = "Patrocinado",
    subtitle = "Espaço reservado para anúncio",
    width = 240,
    height = 230,
    variant = "light",
    onPress,
}) {
    const isDark = variant === "dark";

    return (
        <TouchableOpacity
            activeOpacity={0.92}
            onPress={onPress}
            style={[
                styles.card,
                {
                    width,
                    height,
                    backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E7ECF3",
                },
            ]}
        >
            <View style={styles.topRow}>
                <View
                    style={[
                        styles.badge,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#EEF4FF" },
                    ]}
                >
                    <Text
                        style={[
                            styles.badgeText,
                            { color: isDark ? "#FFFFFF" : "#1A73E8" },
                        ]}
                    >
                        Patrocinado
                    </Text>
                </View>

                <View
                    style={[
                        styles.iconBox,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#F4F7FB" },
                    ]}
                >
                    <Ionicons
                        name="megaphone-outline"
                        size={20}
                        color={isDark ? "#FFFFFF" : "#1A73E8"}
                    />
                </View>
            </View>

            <View style={styles.content}>
                <Text
                    numberOfLines={2}
                    style={[
                        styles.title,
                        { color: isDark ? "#FFFFFF" : "#202124" },
                    ]}
                >
                    {title}
                </Text>

                <Text
                    numberOfLines={4}
                    style={[
                        styles.subtitle,
                        { color: isDark ? "rgba(255,255,255,0.82)" : "#5F6368" },
                    ]}
                >
                    {subtitle}
                </Text>
            </View>

            <View
                style={[
                    styles.ctaBox,
                    {
                        backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "#F8FAFD",
                        borderColor: isDark ? "rgba(255,255,255,0.10)" : "#E7ECF3",
                    },
                ]}
            >
                <Text
                    style={[
                        styles.ctaText,
                        { color: isDark ? "#FFFFFF" : "#1A73E8" },
                    ]}
                >
                    Espaço de anúncio
                </Text>
                <Ionicons
                    name="arrow-forward-outline"
                    size={16}
                    color={isDark ? "#FFFFFF" : "#1A73E8"}
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        justifyContent: "space-between",
        overflow: "hidden",
    },

    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },

    badgeText: {
        fontSize: 11,
        fontWeight: "800",
    },

    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    content: {
        flex: 1,
        justifyContent: "center",
        paddingVertical: 10,
    },

    title: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 13,
        lineHeight: 20,
    },

    ctaBox: {
        minHeight: 54,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    ctaText: {
        fontSize: 13,
        fontWeight: "800",
    },
});