import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Video } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import colors from '../theme/colors';

const { width } = Dimensions.get('window');

export default function NotificacoesDropdown() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const scaleAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'usuarios', user.uid, 'notificacoes'),
      orderBy('createdAt', 'desc'),
      where('tipo', '==', 'campanha')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotificacoes(data);
      setNaoLidas(data.filter(n => !n.lida).length);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const abrir = () => {
    setVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8
    }).start();
  };

  const fechar = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => setVisible(false));
  };

  const marcarComoLida = async (id) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'usuarios', user.uid, 'notificacoes', id), {
        lida: true
      });
    } catch (err) {
      console.error('Erro ao marcar notificação:', err);
    }
  };

  const marcarTodasComoLidas = async () => {
    if (!user?.uid) return;
    try {
      const promises = notificacoes
        .filter(n => !n.lida)
        .map(n => updateDoc(doc(db, 'usuarios', user.uid, 'notificacoes', n.id), { lida: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error('Erro ao marcar notificações:', err);
    }
  };

  const getIcone = (titulo) => {
    if (titulo?.toLowerCase().includes('promo') || titulo?.toLowerCase().includes('desconto')) {
      return 'pricetag';
    }
    if (titulo?.toLowerCase().includes('cupom')) {
      return 'ticket';
    }
    if (titulo?.toLowerCase().includes('evento') || titulo?.toLowerCase().includes('dia')) {
      return 'calendar';
    }
    return 'megaphone';
  };

  const getCorIcone = (titulo) => {
    if (titulo?.toLowerCase().includes('promo') || titulo?.toLowerCase().includes('desconto')) {
      return '#a78bfa';
    }
    if (titulo?.toLowerCase().includes('cupom')) {
      return '#4ade80';
    }
    if (titulo?.toLowerCase().includes('evento') || titulo?.toLowerCase().includes('dia')) {
      return '#60a5fa';
    }
    return '#f472b6';
  };

  return (
    <>
      <TouchableOpacity style={styles.botao} onPress={abrir}>
        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        {naoLidas > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{naoLidas > 99 ? '99+' : naoLidas}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={fechar}
      >
        <TouchableOpacity style={styles.overlay} onPress={fechar} activeOpacity={1}>
          <Animated.View 
            style={[styles.dropdown, { transform: [{ scale: scaleAnim }] }]}
            pointerEvents="auto"
          >
            <View style={styles.header}>
              <Text style={styles.titulo}>Campanhas & Promoções</Text>
              {naoLidas > 0 && (
                <TouchableOpacity onPress={marcarTodasComoLidas}>
                  <Text style={styles.marcarTodas}>Marcar todas lidas</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
              {notificacoes.length === 0 ? (
                <View style={styles.vazio}>
                  <Ionicons name="notifications-off-outline" size={40} color="#64748b" />
                  <Text style={styles.vazioTexto}>Nenhuma campanha ativa</Text>
                </View>
              ) : (
                notificacoes.map((notif) => (
                  <TouchableOpacity 
                    key={notif.id}
                    style={[styles.item, !notif.lida && styles.itemNaoLida]}
                    onPress={() => marcarComoLida(notif.id)}
                  >
                    <View style={[styles.iconeContainer, { backgroundColor: getCorIcone(notif.titulo) + '20' }]}>
                      <Ionicons 
                        name={getIcone(notif.titulo)} 
                        size={20} 
                        color={getCorIcone(notif.titulo)} 
                      />
                    </View>
                    
                    <View style={styles.conteudo}>
                      <Text style={styles.tituloNotif} numberOfLines={1}>{notif.titulo}</Text>
                      <Text style={styles.mensagemNotif} numberOfLines={2}>{notif.mensagem}</Text>
                      
                      {notif.imagemUrl && (
                        <Image 
                          source={{ uri: notif.imagemUrl }} 
                          style={styles.imagem} 
                          resizeMode="cover"
                        />
                      )}
                      
                      {notif.videoUrl && (
                        <Video
                          source={{ uri: notif.videoUrl }}
                          style={styles.video}
                          useNativeControls
                          resizeMode="contain"
                        />
                      )}
                      
                      {notif.cupom && (
                        <View style={styles.cupomBox}>
                          <Ionicons name="ticket" size={14} color="#22c55e" />
                          <Text style={styles.cupomTexto}>{notif.cupom}</Text>
                        </View>
                      )}
                    </View>

                    {!notif.lida && <View style={styles.ponto} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  botao: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 10,
  },
  dropdown: {
    width: width - 40,
    maxHeight: 500,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  titulo: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  marcarTodas: {
    color: '#8b5cf6',
    fontSize: 11,
  },
  lista: {
    maxHeight: 400,
  },
  vazio: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  vazioTexto: {
    color: '#64748b',
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.1)',
  },
  itemNaoLida: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  iconeContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conteudo: {
    flex: 1,
    gap: 6,
  },
  tituloNotif: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mensagemNotif: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  imagem: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  video: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  cupomBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    borderRadius: 6,
  },
  cupomTexto: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
    alignSelf: 'center',
  },
});
