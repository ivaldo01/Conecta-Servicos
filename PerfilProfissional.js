import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.nomeClinica}>{perfil?.nome || "Empresa"}</Text>
        <Text style={styles.especialidade}>{perfil?.especialidade}</Text>
      </View>

      <Text style={styles.sectionTitle}>1. Selecione os Serviços</Text>
      {servicos.map(s => {
        const selecionado = servicosSelecionados.find(sel => sel.id === s.id);
        return (
          <TouchableOpacity
            key={s.id}
            style={[styles.card, selecionado && styles.selected]}
            onPress={() => toggleServico(s)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={selecionado ? "checkbox" : "square-outline"} size={24} color={selecionado ? colors.primary : "#ccc"} />
              <Text style={[styles.txtServico, { marginLeft: 10 }]}>{s.nome}</Text>
            </View>
            <Text style={{ fontWeight: 'bold' }}>R$ {parseFloat(s.preco).toFixed(2)}</Text>
          </TouchableOpacity>
        );
      })}

      {servicosSelecionados.length > 0 && (
        <View style={styles.footerFix}>
          <Text style={styles.txtTotal}>Total: R$ {total.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.btnFinal}
            onPress={() => navigation.navigate("AgendamentoFinal", {
              clinicaId: proId,
              servicos: servicosSelecionados
            })}
          >
            <Text style={styles.btnText}>Escolher Data e Hora</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 30, backgroundColor: '#fff', alignItems: 'center', elevation: 2 },
  nomeClinica: { fontSize: 22, fontWeight: 'bold' },
  especialidade: { color: '#666' },
  sectionTitle: { margin: 20, fontSize: 18, fontWeight: 'bold', color: colors.primary },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  selected: { borderColor: colors.primary, backgroundColor: '#F0F7FF' },
  txtServico: { fontSize: 16 },
  footerFix: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', marginTop: 20 },
  txtTotal: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  btnFinal: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});