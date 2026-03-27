// components/CustomButton.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors'; 

export default function CustomButton({ title, icon, color, onPress, style }) {
  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: color || colors.primary }, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={colors.textLight} 
          style={styles.icon} 
        />
      )}
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
    // Sombra para parecer um botão moderno
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  icon: {
    marginRight: 10,
  },
});