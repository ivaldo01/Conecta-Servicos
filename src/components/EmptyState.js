import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function EmptyState({
    icon = 'document-text-outline',
    title = 'Nada encontrado',
    subtitle = 'Não há informações para mostrar no momento.',
}) {
    return (
        <View style={styles.container}>
            <Ionicons name={icon} size={46} color={colors.secondary} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        marginTop: 10,
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        marginTop: 6,
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        lineHeight: 20,
    },
});