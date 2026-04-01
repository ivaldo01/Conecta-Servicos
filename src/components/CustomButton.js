// components/CustomButton.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function CustomButton({ title, icon, color, onPress, style, disabled = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: color || colors.primary },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
      disabled={disabled}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={colors.textLight}
          style={styles.icon}
        />
      ) : null}
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginVertical: 5,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  icon: {
    marginRight: 8,
  },
});