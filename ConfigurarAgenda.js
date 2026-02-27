import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { db, auth } from "./firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';

const DIAS_SEMANA = [
  { id: 'seg', nome: 'Seg' }, { id: 'ter', nome: 'Ter' },
  { id: 'qua', nome: 'Qua' }, { id: 'qui', nome: 'Qui' },
  { id: 'sex', nome: 'Sex' }, { id: 'sab', nome: 'Sáb' },
  { id: 'dom', nome: 'Dom' },
];

export default function ConfigurarAgenda({ navigation }) {
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [inicio, setInicio] = useState('08:00');
  const [fim, setFim] = useState('18:00');
  const [duracao, setDuracao] = useState('60');

  const toggleDia = (id) => {
    setDiasSelecionados(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const salvarAgenda = async () => {
    if (diasSelecionados.length === 0) {
      Alert.alert("Atenção", "Selecione os dias que você atende.");
      return;
    }

    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, "usuarios", user.uid), {
        agendaConfig: {
          dias: diasSelecionados,
          horarioInicio: inicio,
          horarioFim: fim,
          duracaoAtendimento: duracao
        }
      });
      
      Alert.alert("Sucesso!", "Sua agenda foi configurada.");
      
      // --- CORREÇÃO AQUI ---
      // Mudamos de "Home" para "Main" para bater com o App.js
      navigation.replace("Main"); 
      
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar horários.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Horários de Atendimento</Text>
      
      <Text style={styles.label}>Em quais dias você atende?</Text>
      <View style={styles.diasContainer}>
        {DIAS_SEMANA.map(dia => (
          <TouchableOpacity 
            key={dia.id} 
            onPress={() => toggleDia(dia.id)}
            style={[styles.diaCard, diasSelecionados.includes(dia.id) && styles.diaAtivo]}
          >
            <Text style={[styles.diaTexto, diasSelecionados.includes(dia.id) && styles.textoAtivo]}>{dia.nome}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Início</Text>
          <TextInput style={styles.input} value={inicio} onChangeText={setInicio} placeholder="08:00" />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Fim</Text>
          <TextInput style={styles.input} value={fim} onChangeText={setFim} placeholder="18:00" />
        </View>
      </View>

      <Text style={styles.label}>Duração de cada serviço (minutos)</Text>
      <TextInput 
        style={styles.input} 
        value={duracao} 
        onChangeText={setDuracao} 
        keyboardType="numeric" 
      />

      <View style={{ marginTop: 20 }}>
        <CustomButton title="Concluir e Ir para Home" icon="calendar" color={colors.primary} onPress={salvarAgenda} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.textDark },
  label: { fontSize: 16, marginBottom: 8, color: '#444', fontWeight: '500' },
  diasContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, justifyContent: 'space-between' },
  diaCard: { width: '23%', padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', marginBottom: 10, backgroundColor: '#fff' },
  diaAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  diaTexto: { fontWeight: 'bold', color: '#666' },
  textoAtivo: { color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  col: { width: '48%' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 }
});