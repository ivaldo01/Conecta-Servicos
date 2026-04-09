import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_CONTENT_WIDTH = 500; // Largura máxima ideal para manter a proporção de app em telas grandes

/**
 * Componente que centraliza o conteúdo em telas grandes (Desktop/Tablet)
 * e mantém o layout normal em celulares.
 */
export default function DesktopWrapper({ children, style }) {
  const { width } = Dimensions.get('window');
  const isLargeScreen = Platform.OS === 'web' && width > 768;

  // Se não for Web ou se for uma tela pequena no Web (celular), retorna o layout normal
  if (Platform.OS !== 'web' || !isLargeScreen) {
    return <View style={[styles.mobileContainer, style]}>{children}</View>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: '#E5E7EB', // Fundo cinza claro para destacar o app no Desktop
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: '100vh',
  },
  innerContainer: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    height: '100%',
    maxHeight: 900, // Limita a altura para não ficar infinito no desktop
    backgroundColor: '#FFFFFF',
    overflow: 'visible', // Permite que o ScrollView interno funcione corretamente
    borderRadius: Platform.OS === 'web' ? 20 : 0,
    marginVertical: Platform.OS === 'web' ? 20 : 0,
    // Sombra para o "celular virtual" no Desktop
    ...Platform.select({
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
      }
    })
  },
});
