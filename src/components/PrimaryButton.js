import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import colors from '../constants/colors';

export default function PrimaryButton({
    title,
    onPress,
    loading = false,
    disabled = false,
}) {
    return (
        <TouchableOpacity
            style={[styles.button, (loading || disabled) && styles.disabled]}
            onPress={onPress}
            disabled={loading || disabled}
        >
            {loading ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.text}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.7,
    },
    text: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});