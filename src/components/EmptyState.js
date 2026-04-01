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
            <View style={styles.iconWrap}>
                <Ionicons name={icon} size={34} color={colors.primary} />
            </View>
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
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },
    iconWrap: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: '#EEF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        marginTop: 10,
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 6,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 21,
    },
});