import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function ConfigurarAgenda({ route }) {
  const { colaboradorId, colaboradorNome } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [diasSelecionados, setDiasSelecionados] = useState([]);

  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [intervaloMinutos, setIntervaloMinutos] = useState(60);

  const user = auth.currentUser;

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const intervalosDisponiveis = [15, 30, 45, 60];

  const listaHorariosDisponiveis = useMemo(() => {
    const horarios = [];
    for (let hora = 6; hora <= 24; hora++) {
      const horaFormatada = String(hora % 24).padStart(2, '0');
      horarios.push(`${horaFormatada}:00`);
      if (hora < 24) {
        horarios.push(`${horaFormatada}:30`);
      }
    }
    return horarios;
  }, []);

  const gerarHorarios = (inicio, fim, intervalo) => {
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);

    let inicioMin = hIni * 60 + mIni;
    let fimMin = hFim * 60 + mFim;

    if (fim === "00:00") {
      fimMin = 24 * 60;
    }

    const lista = [];

    if (inicioMin >= fimMin) return lista;

    for (let atual = inicioMin; atual <= fimMin; atual += intervalo) {
      const hora = Math.floor(atual / 60) % 24;
      const minuto = atual % 60;
      lista.push(
        `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
      );
    }

    return lista;
  };

  const horariosGerados = useMemo(() => {
    return gerarHorarios(horaInicio, horaFim, intervaloMinutos);
  }, [horaInicio, horaFim, intervaloMinutos]);

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
        const data = snap.data();
        setDiasSelecionados((data.dias || []).sort((a, b) => a - b));
        setHoraInicio(data.horaInicio || "08:00");
        setHoraFim(data.horaFim || "18:00");
        setIntervaloMinutos(data.intervaloMinutos || 60);
      }
    } catch (e) {
      console.log("Erro ao carregar agenda:", e);
      Alert.alert("Erro", "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (index) => {
    setDiasSelecionados((prev) => {
      const atualizado = prev.includes(index)
        ? prev.filter((d) => d !== index)
        : [...prev, index];

      return atualizado.sort((a, b) => a - b);
    });
  };

  const selecionarDiasUteis = () => {
    setDiasSelecionados([1, 2, 3, 4, 5]);
  };

  const selecionarTodosDias = () => {
    setDiasSelecionados([0, 1, 2, 3, 4, 5, 6]);
  };

  const limparDias = () => {
    setDiasSelecionados([]);
  };

  const salvarAgenda = async () => {
    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    if (diasSelecionados.length === 0) {
      Alert.alert("Ops", "Selecione ao menos um dia de atendimento.");
      return;
    }

    if (horaInicio === horaFim) {
      Alert.alert("Ops", "O horário inicial não pode ser igual ao final.");
      return;
    }

    if (horariosGerados.length === 0) {
      Alert.alert("Ops", "A combinação de início, fim e intervalo é inválida.");
      return;
    }

    setSalvando(true);

    try {
      const docRef = colaboradorId
        ? doc(db, "usuarios", user.uid, "colaboradores", colaboradorId, "configuracoes", "agenda")
        : doc(db, "usuarios", user.uid, "configuracoes", "agenda");

      await setDoc(
        docRef,
        {
          dias: [...diasSelecionados].sort((a, b) => a - b),
          horarios: horariosGerados,
          horaInicio,
          horaFim,
          intervaloMinutos,
          agendaAtiva: true,
          nomeReferencia: colaboradorNome || "Empresa",
          ultimaAtualizacao: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert("Sucesso", "Agenda atualizada com sucesso.");
    } catch (e) {
      console.log("Erro ao salvar agenda:", e);
      Alert.alert("Erro", "Falha ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {colaboradorNome ? `Agenda de ${colaboradorNome}` : "Minha Agenda Geral"}
        </Text>
        <Text style={styles.subtitle}>
          Defina os dias, horário inicial, horário final e intervalo dos atendimentos.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="calendar" size={18} /> Dias de Atendimento
        </Text>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={selecionarDiasUteis}>
            <Text style={styles.quickBtnText}>Seg a Sex</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={selecionarTodosDias}>
            <Text style={styles.quickBtnText}>Todos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtnDanger} onPress={limparDias}>
            <Text style={styles.quickBtnDangerText}>Limpar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.diasContainer}>
          {diasSemana.map((dia, index) => (
            <TouchableOpacity
              key={dia}
              style={[
                styles.diaBox,
                diasSelecionados.includes(index) && styles.boxSelected,
              ]}
              onPress={() => toggleDia(index)}
            >
              <Text
                style={[
                  styles.diaText,
                  diasSelecionados.includes(index) && styles.textSelected,
                ]}
              >
                {dia}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="time" size={18} /> Configuração dos Horários
        </Text>

        <Text style={styles.label}>Hora Inicial</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={horaInicio}
            onValueChange={(itemValue) => setHoraInicio(itemValue)}
            style={styles.picker}
            dropdownIconColor={colors.primary}
            itemStyle={styles.pickerItem}
          >
            {listaHorariosDisponiveis.map((hora) => (
              <Picker.Item
                key={hora}
                label={hora}
                value={hora}
                color={Platform.OS === 'android' ? '#222' : '#222'}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Hora Final</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={horaFim}
            onValueChange={(itemValue) => setHoraFim(itemValue)}
            style={styles.picker}
            dropdownIconColor={colors.primary}
            itemStyle={styles.pickerItem}
          >
            {listaHorariosDisponiveis.map((hora) => (
              <Picker.Item
                key={hora}
                label={hora}
                value={hora}
                color={Platform.OS === 'android' ? '#222' : '#222'}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Intervalo</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={intervaloMinutos}
            onValueChange={(itemValue) => setIntervaloMinutos(itemValue)}
            style={styles.picker}
            dropdownIconColor={colors.primary}
            itemStyle={styles.pickerItem}
          >
            {intervalosDisponiveis.map((intervalo) => (
              <Picker.Item
                key={intervalo}
                label={`${intervalo} minutos`}
                value={intervalo}
                color={Platform.OS === 'android' ? '#222' : '#222'}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="list" size={18} /> Prévia dos Horários Gerados
        </Text>

        <View style={styles.previewInfo}>
          <Text style={styles.previewInfoText}>
            {horariosGerados.length} horário(s) gerado(s)
          </Text>
        </View>

        <View style={styles.horariosGrid}>
          {horariosGerados.length > 0 ? (
            horariosGerados.map((h) => (
              <View key={h} style={styles.horaPreview}>
                <Text style={styles.horaPreviewText}>{h}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              Ajuste início, fim e intervalo para gerar horários válidos.
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btnSalvar, { opacity: salvando ? 0.7 : 1 }]}
        onPress={salvarAgenda}
        disabled={salvando}
      >
        {salvando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.btnText}>SALVAR CONFIGURAÇÕES</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    padding: 25,
    paddingTop: 50,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },

  card: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 20,
    elevation: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  quickBtn: {
    flex: 1,
    backgroundColor: '#EEF4FF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },

  quickBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },

  quickBtnDanger: {
    flex: 1,
    backgroundColor: '#FFF1F0',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  quickBtnDangerText: {
    color: '#D9534F',
    fontWeight: 'bold',
    fontSize: 13,
  },

  diasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  diaBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },

  boxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  diaText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
  },

  textSelected: {
    color: '#FFF',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginBottom: 6,
    marginTop: 10,
  },

  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    marginBottom: 8,
  },

  picker: {
    height: 55,
    width: '100%',
    color: '#222',
    backgroundColor: '#FFFFFF',
  },

  pickerItem: {
    color: '#222',
    fontSize: 16,
  },

  previewInfo: {
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },

  previewInfoText: {
    color: '#555',
    fontWeight: '600',
  },

  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  horaPreview: {
    width: '30%',
    paddingVertical: 10,
    backgroundColor: '#EAF4EA',
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },

  horaPreviewText: {
    fontWeight: 'bold',
    color: colors.success || '#28a745',
  },

  emptyText: {
    color: '#999',
    fontSize: 14,
    width: '100%',
    textAlign: 'center',
  },

  btnSalvar: {
    backgroundColor: colors.success || '#28a745',
    margin: 20,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 40,
    elevation: 3,
  },

  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});