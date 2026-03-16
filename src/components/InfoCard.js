import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
        borderRadius: 16,
        padding: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    title: {
        fontSize: 13,
        color: '#777',
        fontWeight: '600',
    },
    value: {
        fontSize: 22,
        color: '#222',
        fontWeight: 'bold',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
    },
});