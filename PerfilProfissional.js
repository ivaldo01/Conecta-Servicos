import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from "./firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function PerfilProfissional({ route, navigation }) {
  // Pegamos o proId garantindo que não seja nulo
  const { proId } = route.params || {};

  const [perfil, setPerfil] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [colaboradoresHabilitados, setColaboradoresHabilitados] = useState([]);
  const [colaboradorEscolhido, setColaboradorEscolhido] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (proId) {
      carregarDados();
    } else {
      Alert.alert("Erro", "ID do profissional inválido.");
      navigation.goBack();
    }
  }, [proId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const pSnap = await getDoc(doc(db, "usuarios", proId));

      if (pSnap.exists()) {
        const dadosPerfil = pSnap.data();
        setPerfil(dadosPerfil);

        // Busca serviços
        const sSnap = await getDocs(collection(db, "usuarios", proId, "servicos"));
        setServicos(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        Alert.alert("Erro", "Este perfil não existe mais.");
        navigation.goBack();
      }
    } catch (error) {
      console.log("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const tratarSelecaoServico = async (servico) => {
    setServicoSelecionado(servico);
    setColaboradorEscolhido(null);

    try {
      const colabSnap = await getDocs(collection(db, "usuarios", proId, "colaboradores"));
      const todosColab = colabSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (todosColab.length === 0) {
        // CORREÇÃO AQUI: Verificamos se perfil e perfil.nome existem antes de usar
        const nomeDono = perfil && perfil.nome ? perfil.nome : "Profissional";
        setColaboradorEscolhido({ id: proId, nome: nomeDono, cargo: 'Proprietário' });
        setColaboradoresHabilitados([]);
      } else {
        // Proteção para o filtro: garante que c.servicosHabilitados existe antes do includes
        const filtrados = todosColab.filter(c =>
          c.servicosHabilitados && Array.isArray(c.servicosHabilitados) && c.servicosHabilitados.includes(servico.id)
        );
        setColaboradoresHabilitados([{ id: 'qualquer', nome: 'Qualquer Profissional', cargo: 'Disponibilidade imediata' }, ...filtrados]);
      }
    } catch (error) {
      console.log("Erro ao processar serviço:", error);
    }
  };

  if (loading) return (
    <View style={styles.loadingCenter}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* Uso de ?. e || para evitar o erro de undefined */}
        <Text style={styles.nomeClinica}>{perfil?.nome || "Carregando..."}</Text>
        <Text style={styles.especialidade}>{perfil?.especialidade || ""}</Text>
      </View>

      <Text style={styles.sectionTitle}>1. Escolha o Serviço</Text>
      {servicos.map(s => (
        <TouchableOpacity
          key={s.id}
          style={[styles.card, servicoSelecionado?.id === s.id && styles.selected]}
          onPress={() => tratarSelecaoServico(s)}
        >
          <Text style={styles.txtServico}>{s?.nome || "Serviço"}</Text>
          <Text style={{ fontWeight: 'bold' }}>R$ {parseFloat(s?.preco || 0).toFixed(2)}</Text>
        </TouchableOpacity>
      ))}

      {servicoSelecionado && colaboradoresHabilitados.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>2. Com quem agendar?</Text>
          {colaboradoresHabilitados.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, colaboradorEscolhido?.id === c.id && styles.selected]}
              onPress={() => setColaboradorEscolhido(c)}
            >
              <View>
                {/* Proteção para nome do colaborador */}
                <Text style={{ fontWeight: 'bold' }}>{c?.nome || "Colaborador"}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{c?.cargo || ""}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {colaboradorEscolhido && (
        <TouchableOpacity
          style={styles.btnFinal}
          onPress={() => navigation.navigate("AgendamentoFinal", {
            clinicaId: proId,
            servico: servicoSelecionado,
            colaborador: colaboradorEscolhido
          })}
        >
          <Text style={styles.btnText}>Ver Horários</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 30, backgroundColor: '#fff', alignItems: 'center', elevation: 2 },
  nomeClinica: { fontSize: 22, fontWeight: 'bold' },
  especialidade: { color: '#666' },
  sectionTitle: { margin: 20, fontSize: 18, fontWeight: 'bold', color: colors.primary },
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  txtServico: { fontSize: 16 },
  btnFinal: { backgroundColor: colors.success || '#4CAF50', margin: 20, padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});