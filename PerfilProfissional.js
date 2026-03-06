import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { db } from "./firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function PerfilProfissional({ route, navigation }) {
  const { proId } = route.params || {};
  const [perfil, setPerfil] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (proId) carregarDados();
  }, [proId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const pSnap = await getDoc(doc(db, "usuarios", proId));
      if (pSnap.exists()) {
        setPerfil(pSnap.data());
        const sSnap = await getDocs(collection(db, "usuarios", proId, "servicos"));
        setServicos(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (error) { console.log(error); }
    finally { setLoading(false); }
  };

  const toggleServico = (servico) => {
    const jaSelecionado = servicosSelecionados.find(s => s.id === servico.id);
    if (jaSelecionado) {
      setServicosSelecionados(servicosSelecionados.filter(s => s.id !== servico.id));
    } else {
      setServicosSelecionados([...servicosSelecionados, servico]);
    }
  };

  const total = servicosSelecionados.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        {/* HEADER COM CAPA (Inspirado nas imagens) */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1625834317364-b32c140fd360?q=80&w=1000&auto=format&fit=crop' }}
          style={styles.cover}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </ImageBackground>

        <View style={styles.profileInfoArea}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{perfil?.nome?.charAt(0)}</Text>
          </View>

          <Text style={styles.nomeClinica}>{perfil?.nome || "Profissional"}</Text>
          <Text style={styles.especialidade}>{perfil?.especialidade || "Especialista"}</Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.warning} />
            <Text style={styles.ratingText}> 4.9 (120 avaliações)</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Text style={styles.statText}>2.5 km</Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EEE' }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.statText}>45 min</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.statText}>Verificado</Text>
            </View>
          </View>
        </View>

        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Nossos Serviços</Text>
          {servicos.map(s => {
            const selecionado = servicosSelecionados.find(sel => sel.id === s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.serviceCard, selecionado && styles.selectedCard]}
                onPress={() => toggleServico(s)}
              >
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{s.nome}</Text>
                  <Text style={styles.servicePrice}>R$ {parseFloat(s.preco).toFixed(2)}</Text>
                </View>
                <Ionicons
                  name={selecionado ? "checkmark-circle" : "add-circle-outline"}
                  size={28}
                  color={selecionado ? colors.success : colors.primary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FOOTER FIXO (Sticky Footer) */}
      {servicosSelecionados.length > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total Selecionado</Text>
            <Text style={styles.footerPrice}>R$ {total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.btnFinal}
            onPress={() => navigation.navigate("AgendamentoFinal", {
              clinicaId: proId,
              servicos: servicosSelecionados
            })}
          >
            <Text style={styles.btnText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cover: { height: 180, width: '100%', backgroundColor: colors.primary },
  backBtn: { margin: 40, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20, alignSelf: 'flex-start' },
  profileInfoArea: {
    backgroundColor: '#FFF',
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: 'center',
    paddingBottom: 20
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.inputFill,
    borderWidth: 4,
    borderColor: '#FFF',
    marginTop: -40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  nomeClinica: { fontSize: 22, fontWeight: 'bold', marginTop: 10, color: colors.textDark },
  especialidade: { fontSize: 14, color: colors.secondary, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  ratingText: { fontSize: 14, fontWeight: 'bold', color: colors.textDark },

  statsRow: {
    flexDirection: 'row',
    width: '90%',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 15
  },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statText: { fontSize: 12, fontWeight: '600', color: colors.secondary, marginTop: 4 },

  servicesSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: colors.textDark },
  serviceCard: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
  },
  selectedCard: { borderColor: colors.primary, backgroundColor: '#F0F7FF' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600', color: colors.textDark },
  servicePrice: { fontSize: 15, color: colors.primary, fontWeight: 'bold', marginTop: 4 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 20,
    paddingBottom: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#EEE',
    elevation: 20,
  },
  footerLabel: { fontSize: 12, color: colors.secondary },
  footerPrice: { fontSize: 20, fontWeight: 'bold', color: colors.textDark },
  btnFinal: {
    backgroundColor: colors.primary,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginRight: 10 }
});