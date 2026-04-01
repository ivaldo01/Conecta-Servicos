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
        minHeight: 54,
        paddingVertical: 15,
        paddingHorizontal: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 5,
    },
    disabled: {
        opacity: 0.65,
    },
    text: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 0.2,
    },
});