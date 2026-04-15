// ============================================================
// BANNER AD - Componente de Anúncios Patrocinados (React Native)
// Busca anúncios do Firestore e faz tracking
// ============================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Dimensions,
  Animated
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { 
  getAnuncioRandom, 
  registrarImpressao, 
  registrarClique,
  getContextoUsuario,
  foiVistoHoje
} from '../../services/anuncioService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tamanhos pré-definidos por tipo
const SIZES = {
  banner_superior: { width: SCREEN_WIDTH, height: 60 },
  banner_lateral: { width: 300, height: 250 },
  card: { width: SCREEN_WIDTH - 32, height: 200 },
  banner_full: { width: SCREEN_WIDTH, height: 100 },
  push: { width: SCREEN_WIDTH - 32, height: 120 },
  story: { width: 120, height: 200 }
};

export default function BannerAd({ 
  tipo = 'banner_superior', 
  style,
  onPress,
  allowRepeat = false, // Se false, não mostra o mesmo anúncio 2x no mesmo dia
  showBadge = true,
  fallback = null
}) {
  const { user } = useAuth();
  const [anuncio, setAnuncio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [impressaoRegistrada, setImpressaoRegistrada] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Buscar anúncio ao montar
  useEffect(() => {
    buscarAnuncio();
  }, [tipo, user]);

  const buscarAnuncio = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Contexto do usuário para segmentação
      const contexto = getContextoUsuario(user);
      
      // Buscar anúncio aleatório ativo
      let ad = await getAnuncioRandom(tipo, contexto);
      
      // Se não permitir repetição no mesmo dia, verificar
      if (ad && !allowRepeat && user?.uid) {
        const vistoHoje = await foiVistoHoje(ad.id, user.uid);
        if (vistoHoje) {
          // Buscar outro
          ad = await getAnuncioRandom(tipo, contexto);
        }
      }
      
      setAnuncio(ad);
      
      // Animar entrada
      if (ad) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
      }
      
    } catch (err) {
      console.error('[BannerAd] Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Registrar impressão quando visível
  useEffect(() => {
    if (anuncio && !impressaoRegistrada) {
      registrarImpressao(anuncio.id, anuncio.anuncianteId, {
        userId: user?.uid || null,
        device: 'mobile',
        pagina: 'home',
        custo: anuncio.modeloCobranca === 'cpm' ? (anuncio.valorCpm || 25) / 1000 : 0
      });
      
      setImpressaoRegistrada(true);
    }
  }, [anuncio, impressaoRegistrada, user]);

  // Handler de clique
  const handlePress = useCallback(async () => {
    if (!anuncio) return;
    
    try {
      // Registrar clique
      await registrarClique(anuncio.id, anuncio.anuncianteId, {
        userId: user?.uid || null,
        device: 'mobile',
        pagina: 'home',
        custo: anuncio.modeloCobranca === 'cpc' ? (anuncio.valorCpc || 0.5) : 0,
        converteu: false
      });
      
      // Callback opcional
      if (onPress) {
        onPress(anuncio);
      }
      
      // Abrir link
      if (anuncio.ctaLink) {
        const supported = await Linking.canOpenURL(anuncio.ctaLink);
        if (supported) {
          await Linking.openURL(anuncio.ctaLink);
        }
      }
      
    } catch (err) {
      console.error('[BannerAd] Erro ao registrar clique:', err);
    }
  }, [anuncio, user, onPress]);

  // Loading
  if (loading) {
    return (
      <View style={[styles.container, SIZES[tipo], style, styles.loading]}>
        <ActivityIndicator size="small" color="#9CA3AF" />
      </View>
    );
  }

  // Sem anúncio ou erro
  if (!anuncio || error) {
    return fallback || null;
  }

  const size = SIZES[tipo] || SIZES.banner_superior;
  const imageUrl = anuncio.imagemMobileUrl || anuncio.imagemUrl;

  return (
    <Animated.View 
      style={[
        styles.container, 
        size, 
        style,
        { opacity: fadeAnim }
      ]}
    >
      <TouchableOpacity 
        onPress={handlePress}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        {/* Imagem do anúncio */}
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }}
            style={[styles.image, size]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, size]}>
            <Text style={styles.placeholderText}>
              {anuncio.titulo || 'Anúncio'}
            </Text>
          </View>
        )}
        
        {/* Badge "Ad" */}
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Ad</Text>
          </View>
        )}
        
        {/* Título sobreposto (opcional) */}
        {tipo === 'card' && anuncio.titulo && (
          <View style={styles.overlay}>
            <Text style={styles.titulo} numberOfLines={2}>
              {anuncio.titulo}
            </Text>
            {anuncio.ctaTexto && (
              <Text style={styles.cta}>{anuncio.ctaTexto}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Componente para Story Ads (estilo Instagram)
export function StoryAd({ anuncios, onPress }) {
  const [atual, setAtual] = useState(0);
  
  if (!anuncios || anuncios.length === 0) return null;
  
  const anuncio = anuncios[atual];
  
  return (
    <View style={styles.storyContainer}>
      <TouchableOpacity onPress={() => onPress?.(anuncio)}>
        <Image
          source={{ uri: anuncio.imagemUrl }}
          style={styles.storyImage}
        />
        <View style={styles.storyBadge}>
          <Text style={styles.storyBadgeText}>Ad</Text>
        </View>
      </TouchableOpacity>
      
      {/* Indicadores */}
      <View style={styles.indicators}>
        {anuncios.map((_, idx) => (
          <View 
            key={idx}
            style={[
              styles.indicator,
              idx === atual && styles.indicatorActive
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// Componente para Modal/Interstitial
export function ModalAd({ visible, onClose, anuncio }) {
  const [countdown, setCountdown] = useState(5);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!visible || !anuncio) return;
    
    // Registrar impressão
    registrarImpressao(anuncio.id, anuncio.anuncianteId, {
      userId: user?.uid || null,
      device: 'mobile',
      pagina: 'modal',
      custo: anuncio.modeloCobranca === 'cpm' ? (anuncio.valorCpm || 25) / 1000 : 0
    });
    
    // Countdown para fechar
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [visible, anuncio, user]);
  
  const handlePress = async () => {
    if (!anuncio) return;
    
    await registrarClique(anuncio.id, anuncio.anuncianteId, {
      userId: user?.uid || null,
      device: 'mobile',
      pagina: 'modal',
      custo: anuncio.modeloCobranca === 'cpc' ? (anuncio.valorCpc || 0.5) : 0,
      converteu: false
    });
    
    if (anuncio.ctaLink) {
      Linking.openURL(anuncio.ctaLink);
    }
    
    onClose?.();
  };
  
  if (!visible || !anuncio) return null;
  
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <TouchableOpacity 
          style={[styles.closeButton, countdown > 0 && styles.closeButtonDisabled]}
          onPress={onClose}
          disabled={countdown > 0}
        >
          <Text style={styles.closeButtonText}>
            {countdown > 0 ? `${countdown}s` : 'X'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handlePress}>
          <Image
            source={{ uri: anuncio.imagemUrl }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        {anuncio.titulo && (
          <Text style={styles.modalTitle}>{anuncio.titulo}</Text>
        )}
        
        {anuncio.ctaTexto && (
          <TouchableOpacity style={styles.modalCta} onPress={handlePress}>
            <Text style={styles.modalCtaText}>{anuncio.ctaTexto}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  touchable: {
    flex: 1,
  },
  image: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  titulo: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cta: {
    color: '#3B82F6',
    fontSize: 12,
    marginTop: 4,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  
  // Story styles
  storyContainer: {
    width: 120,
    height: 200,
    marginHorizontal: 4,
  },
  storyImage: {
    width: 120,
    height: 200,
    borderRadius: 12,
  },
  storyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  storyBadgeText: {
    color: '#FFF',
    fontSize: 10,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 2,
  },
  indicatorActive: {
    backgroundColor: '#3B82F6',
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH - 32,
    maxHeight: 400,
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  closeButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  modalCta: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  modalCtaText: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
