import React from "react";
import { View, Text, StyleSheet, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../constants/colors";

export default function SponsoredCard({
    title = "Espaço patrocinado",
    subtitle = "Seu anúncio pode aparecer aqui para clientes e profissionais.",
    width = 240,
    height = 230,
    compact = false,
}) {
    return (
        <View style={[styles.card, { width, height }, compact && styles.cardCompact]}>
            <ImageBackground
                source={{ uri: "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=1200&auto=format&fit=crop" }}
                resizeMode="cover"
                imageStyle={styles.bgImage}
                style={styles.bg}
            >
                <View style={styles.overlay}>
                    <View style={styles.badge}>
                        <Ionicons name="megaphone-outline" size={12} color="#FFF" />
                        <Text style={styles.badgeText}>Patrocinado</Text>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.title} numberOfLines={2}>
                            {title}
                        </Text>

                        <Text style={styles.subtitle} numberOfLines={3}>
                            {subtitle}
                        </Text>

                        <View style={styles.cta}>
                            <Text style={styles.ctaText}>Saiba mais</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFF" />
                        </View>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        overflow: "hidden",
        marginRight: 12,
        backgroundColor: "#DDE7FF",
        borderWidth: 1,
        borderColor: "#D9E2F2",
    },

    cardCompact: {
        borderRadius: 20,
    },

    bg: {
        flex: 1,
    },

    bgImage: {
        borderRadius: 22,
    },

    overlay: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.45)",
        padding: 16,
        justifyContent: "space-between",
    },

    badge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.18)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    badgeText: {
        color: "#FFF",
        fontSize: 11,
        fontWeight: "800",
        marginLeft: 6,
    },

    content: {
        marginTop: 12,
    },

    title: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "800",
        lineHeight: 24,
        marginBottom: 8,
    },

    subtitle: {
        color: "rgba(255,255,255,0.92)",
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 14,
    },

    cta: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary || "#1A73E8",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },

    ctaText: {
        color: "#FFF",
        fontWeight: "800",
        marginRight: 8,
        fontSize: 13,
    },
});