import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import colors from "./colors";

// ADICIONADO: { route } para receber os dados do colaborador
export default function ConfigurarAgenda({ route }) {
  // ADICIONADO: Pega o ID e Nome se vierem da tela de colaboradores
  const { colaboradorId, colaboradorNome } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [horarios, setHorarios] = useState([]);

  const user = auth.currentUser;
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const listaHorariosPadrao = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  useEffect(() => {
    carregarConfiguracoes();
  }, [colaboradorId]); // Recarrega se mudar o colaborador

  const carregarConfiguracoes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // LÓGICA DE CAMINHO DINÂMICO:
      // Se tiver colaboradorId, salva na pasta dele. Se não, salva na agenda geral da empresa.
      const docRef = colaboradorId
        ? doc(db, "usuarios", user.uid, "colaboradores", colaboradorId, "configuracoes", "agenda")
        : doc(db, "usuarios", user.uid, "configuracoes", "agenda");

      const snap = await getDoc(docRef);

      if (snap.exists()) {
        setDiasSelecionados(snap.data().dias || []);
        setHorarios(snap.data().horarios || []);
      } else {
        // Se não houver configuração, limpa a tela para o novo cadastro
        setDiasSelecionados([]);
        setHorarios([]);
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
    setSalvando(true);
    try {
      // MESMA LÓGICA DE CAMINHO DINÂMICO PARA SALVAR
      const docRef = colaboradorId
        ? doc(db, "usuarios", user.uid, "colaboradores", colaboradorId, "configuracoes", "agenda")
        : doc(db, "usuarios", user.uid, "configuracoes", "agenda");

      await setDoc(docRef, {
        dias: diasSelecionados,
        horarios: horarios,
        ultimaAtualizacao: new Date(),
        nomeReferencia: colaboradorNome || "Empresa" // Apenas para facilitar a leitura no banco
      });
      Alert.alert("Sucesso", `Agenda de ${colaboradorNome || "sua empresa"} atualizada!`);
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;

  return (
    <ScrollView style={styles.container}>
      {/* Título dinâmico para você saber de quem é a agenda */}
      <Text style={styles.title}>
        {colaboradorNome ? `Agenda: ${colaboradorNome}` : "Minha Agenda Geral"}
      </Text>

      <Text style={styles.subtitle}>Em quais dias atende?</Text>
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

      <Text style={styles.subtitle}>Quais horários disponíveis?</Text>
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

      <TouchableOpacity style={styles.btnSalvar} onPress={salvarAgenda} disabled={salvando}>
        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>SALVAR CONFIGURAÇÕES</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 40, color: colors.primary },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#444' },
  diasContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  diaBox: { padding: 10, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', width: '13%', alignItems: 'center' },
  horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  horaBox: { width: '30%', padding: 12, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#DDD' },
  boxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  diaText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  horaText: { fontWeight: 'bold', color: '#666' },
  textSelected: { color: '#FFF' },
  btnSalvar: { backgroundColor: '#28a745', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 50 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});