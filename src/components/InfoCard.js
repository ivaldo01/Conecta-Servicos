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
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#E8EDF5',
        borderTopWidth: 4,
        borderTopColor: colors.primary,
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
        color: '#7A8596',
        marginTop: 6,
        lineHeight: 18,
    },
});