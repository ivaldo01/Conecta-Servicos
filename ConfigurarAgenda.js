import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons'; // Adicionado para ícones
import colors from "./colors";

export default function ConfigurarAgenda({ route }) {
  const { colaboradorId, colaboradorNome } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [horarios, setHorarios] = useState([]);

  const user = auth.currentUser;
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const listaHorariosPadrao = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  useEffect(() => {
    carregarConfiguracoes();
  }, [colaboradorId]);

  const carregarConfiguracoes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const docRef = colaboradorId
        ? doc(db, "usuarios", user.uid, "colaboradores", colaboradorId, "configuracoes", "agenda")
        : doc(db, "usuarios", user.uid, "configuracoes", "agenda");

      const snap = await getDoc(docRef);

      if (snap.exists()) {
        setDiasSelecionados(snap.data().dias || []);
        setHorarios(snap.data().horarios || []);
      }
    } catch (e) {
      console.log("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (index) => {
    setDiasSelecionados(prev =>
      prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
    );
  };

  const toggleHorario = (h) => {
    setHorarios(prev =>
      prev.includes(h) ? prev.filter(item => item !== h) : [...prev, h]
    );
  };

  const salvarAgenda = async () => {
    if (diasSelecionados.length === 0) return Alert.alert("Ops", "Selecione ao menos um dia.");
    setSalvando(true);
    try {
      const docRef = colaboradorId
        ? doc(db, "usuarios", user.uid, "colaboradores", colaboradorId, "configuracoes", "agenda")
        : doc(db, "usuarios", user.uid, "configuracoes", "agenda");

      await setDoc(docRef, {
        dias: diasSelecionados,
        horarios: horarios,
        ultimaAtualizacao: new Date(),
        nomeReferencia: colaboradorNome || "Empresa"
      });
      Alert.alert("Sucesso", `Agenda atualizada com sucesso!`);
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {colaboradorNome ? `Agenda de ${colaboradorNome}` : "Minha Agenda Geral"}
        </Text>
        <Text style={styles.subtitle}>Selecione os dias e horários disponíveis para agendamento.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}><Ionicons name="calendar" size={18} /> Dias de Atendimento</Text>
        <View style={styles.diasContainer}>
          {diasSemana.map((dia, index) => (
            <TouchableOpacity
              key={dia}
              style={[styles.diaBox, diasSelecionados.includes(index) && styles.boxSelected]}
              onPress={() => toggleDia(index)}
            >
              <Text style={[styles.diaText, diasSelecionados.includes(index) && styles.textSelected]}>{dia}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}><Ionicons name="time" size={18} /> Horários Disponíveis</Text>
        <View style={styles.horariosGrid}>
          {listaHorariosPadrao.map(h => (
            <TouchableOpacity
              key={h}
              style={[styles.horaBox, horarios.includes(h) && styles.boxSelected]}
              onPress={() => toggleHorario(h)}
            >
              <Text style={[styles.horaText, horarios.includes(h) && styles.textSelected]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btnSalvar, { opacity: salvando ? 0.7 : 1 }]}
        onPress={salvarAgenda}
        disabled={salvando}
      >
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>SALVAR CONFIGURAÇÕES</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 25, paddingTop: 50, backgroundColor: '#FFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },

  card: { backgroundColor: '#FFF', margin: 15, padding: 20, borderRadius: 20, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: colors.textDark, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 },

  diasContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  diaBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E9ECEF' },

  horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  horaBox: { width: '30%', paddingVertical: 12, backgroundColor: '#F1F3F5', borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E9ECEF' },

  boxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  diaText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  horaText: { fontWeight: 'bold', color: '#666' },
  textSelected: { color: '#FFF' },

  btnSalvar: { backgroundColor: colors.success || '#28a745', margin: 20, padding: 18, borderRadius: 15, alignItems: 'center', marginBottom: 40, elevation: 3 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});