import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

export default function InfoCard({ title, value, subtitle }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.value}>{value}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 18,
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    value: {
        fontSize: 24,
        color: colors.textDark,
        fontWeight: '800',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 6,
        lineHeight: 18,
    },
});
