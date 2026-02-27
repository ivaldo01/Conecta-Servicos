import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';

export default function PerfilProfissional({ route, navigation }) {
  const { id } = route.params; // ID que veio do clique no mapa
  const [profissional, setProfissional] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        const docRef = doc(db, "usuarios", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfissional(docSnap.data());
        }
      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar o perfil.");
      } finally {
        setLoading(false);
      }
    };
    buscarDados();
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{flex:1}} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.nome}>{profissional?.nome}</Text>
        <Text style={styles.especialidade}>{profissional?.especialidade}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Sobre</Text>
        <Text style={styles.descricao}>{profissional?.descricao || 'Sem descrição disponível.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Horários de Atendimento</Text>
        <Text style={styles.info}>
          Dias: {profissional?.agendaConfig?.dias?.join(', ').toUpperCase() || 'Não configurado'}
        </Text>
        <Text style={styles.info}>
          Das {profissional?.agendaConfig?.horarioInicio} às {profissional?.agendaConfig?.horarioFim}
        </Text>
      </View>

      <View style={styles.footer}>
        <CustomButton 
          title="Escolher Horário e Agendar" 
          icon="calendar" 
          color={colors.success} 
          onPress={() => navigation.navigate("AgendamentoFinal", { profissionalId: id, agenda: profissional.agendaConfig })} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 30, backgroundColor: colors.primary, alignItems: 'center' },
  nome: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  especialidade: { fontSize: 16, color: '#e0e0e0', marginTop: 5 },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.textDark },
  descricao: { fontSize: 14, color: '#666', lineHeight: 20 },
  info: { fontSize: 15, color: '#444', marginBottom: 5 },
  footer: { padding: 20, marginBottom: 20 }
});