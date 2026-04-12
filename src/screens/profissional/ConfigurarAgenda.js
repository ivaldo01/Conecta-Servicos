import React, { useState, useEffect, useMemo, memo } from 'react';
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
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function ConfigurarAgenda({ route }) {
  const { colaboradorId, colaboradorNome } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [perfilUsuario, setPerfilUsuario] = useState(null);

  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [intervaloMinutos, setIntervaloMinutos] = useState(60);
  const [configAlmoco, setConfigAlmoco] = useState({}); // { "1": { ativo: true, inicio, fim, usarHorarioDiferenciado, ... } }
  
  // Estado para templates da UI (não salvos diretamente, mas usados para atualizar a config)
  const [almocoTemplate, setAlmocoTemplate] = useState({ inicio: '12:00', fim: '13:00' });
  const [especialTemplate, setEspecialTemplate] = useState({ ativo: true, inicio: '08:00', fim: '12:00' });
  const [atenderFeriados, setAtenderFeriados] = useState(false);
  const [exibirPrevia, setExibirPrevia] = useState(false);

  const user = auth.currentUser;
  const ehColaborador = perfilUsuario?.perfil === 'colaborador' && !colaboradorId;

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

  const pickerItems = useMemo(() => {
    return listaHorariosDisponiveis.map(h => (
      <Picker.Item 
        key={h} 
        label={h} 
        value={h} 
        color={Platform.OS === 'android' ? '#222' : '#222'}
      />
    ));
  }, [listaHorariosDisponiveis]);

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
      const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
      const dadosPerfil = perfilSnap.exists() ? perfilSnap.data() : {};
      setPerfilUsuario(dadosPerfil);

      const ehSubconta = dadosPerfil?.perfil === 'colaborador' && !colaboradorId;
      const donoAgendaId = ehSubconta ? (dadosPerfil?.clinicaId || user.uid) : user.uid;
      const agendaColaboradorId = colaboradorId || (ehSubconta ? user.uid : null);

      let docRef = agendaColaboradorId
        ? doc(db, "usuarios", donoAgendaId, "colaboradores", agendaColaboradorId, "configuracoes", "agenda")
        : doc(db, "usuarios", donoAgendaId, "configuracoes", "agenda");

      let snap = await getDoc(docRef);

      if (!snap.exists() && ehSubconta && dadosPerfil?.clinicaId) {
        snap = await getDoc(doc(db, "usuarios", dadosPerfil.clinicaId, "configuracoes", "agenda"));
      }

      if (snap.exists()) {
        const data = snap.data();
        setDiasSelecionados((data.dias || []).sort((a, b) => a - b));
        setHoraInicio(data.horaInicio || "08:00");
        setHoraFim(data.horaFim || "18:00");
        setIntervaloMinutos(data.intervaloMinutos || 60);
        setConfigAlmoco(data.configAlmoco || {});
        setAtenderFeriados(data.atenderFeriados || false);
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
    setConfigAlmoco({});
  };

  const toggleAlmocoDia = (idx) => {
    const diaKey = String(idx);
    setConfigAlmoco(prev => {
      const configAtual = prev[diaKey] || { 
        ativo: false, 
        inicio: almocoTemplate.inicio, 
        fim: almocoTemplate.fim,
        usarHorarioDiferenciado: false,
        inicioExpediente: horaInicio,
        fimExpediente: horaFim
      };
      
      return {
        ...prev,
        [diaKey]: {
          ...configAtual,
          ativo: !configAtual.ativo,
          inicio: almocoTemplate.inicio,
          fim: almocoTemplate.fim
        }
      };
    });
  };

  const toggleEspecialDia = (idx) => {
    const diaKey = String(idx);
    setConfigAlmoco(prev => {
      const configAtual = prev[diaKey] || { 
        ativo: false, 
        inicio: almocoTemplate.inicio, 
        fim: almocoTemplate.fim,
        usarHorarioDiferenciado: false,
        inicioExpediente: especialTemplate.inicio,
        fimExpediente: especialTemplate.fim
      };
      
      const novoStatus = !configAtual.usarHorarioDiferenciado;
      
      // Se tiver ativando especial e estiver em modo "Não Atendo", removemos o dia da agenda principal
      if (novoStatus && !especialTemplate.ativo) {
        setDiasSelecionados(prev => prev.filter(d => d !== idx));
      }

      return {
        ...prev,
        [diaKey]: {
          ...configAtual,
          usarHorarioDiferenciado: novoStatus,
          inicioExpediente: especialTemplate.inicio,
          fimExpediente: especialTemplate.fim
        }
      };
    });
  };

  const salvarAgenda = async () => {
    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    if (ehColaborador) {
      Alert.alert("Acesso restrito", "A disponibilidade e a escala são definidas pela conta principal.");
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

      // Calcula a união de todos os horários possíveis para garantir que 
      // qualquer slot de qualquer dia esteja no array principal
      let todosHoras = new Set();
      
      // Adiciona horários do expediente geral
      gerarHorarios(horaInicio, horaFim, intervaloMinutos).forEach(h => todosHoras.add(h));
      
      // Adiciona horários de expedientes customizados
      Object.values(configAlmoco).forEach(conf => {
        if (conf.usarHorarioDiferenciado && conf.inicioExpediente && conf.fimExpediente) {
          gerarHorarios(conf.inicioExpediente, conf.fimExpediente, intervaloMinutos)
            .forEach(h => todosHoras.add(h));
        }
      });

      const horariosFinais = Array.from(todosHoras).sort();

      await setDoc(
        docRef,
        {
          dias: [...diasSelecionados].sort((a, b) => a - b),
          horarios: horariosFinais,
          horaInicio,
          horaFim,
          intervaloMinutos,
          configAlmoco,
          atenderFeriados,
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
          {ehColaborador
            ? 'Minha agenda de atendimento'
            : colaboradorNome
              ? `Agenda de ${colaboradorNome}`
              : "Minha Agenda Geral"}
        </Text>
        <Text style={styles.subtitle}>
          {ehColaborador
            ? 'Sua disponibilidade é definida pela conta principal. Consulte abaixo os horários liberados para você.'
            : 'Defina os dias, horário inicial, horário final e intervalo dos atendimentos.'}
        </Text>
      </View>

      {ehColaborador && (
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>Consulta somente leitura</Text>
            <Text style={styles.noticeText}>
              Alterações em agenda, escala e disponibilidade são feitas pela conta principal da empresa.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="calendar" size={18} /> Dias de Atendimento
        </Text>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, ehColaborador && styles.disabledAction]}
            onPress={selecionarDiasUteis}
            disabled={ehColaborador}
          >
            <Text style={styles.quickBtnText}>Seg a Sex</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtn, ehColaborador && styles.disabledAction]}
            onPress={selecionarTodosDias}
            disabled={ehColaborador}
          >
            <Text style={styles.quickBtnText}>Todos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickBtnDanger, ehColaborador && styles.disabledAction]}
            onPress={limparDias}
            disabled={ehColaborador}
          >
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
                ehColaborador && styles.disabledAction,
              ]}
              onPress={() => toggleDia(index)}
              disabled={ehColaborador}
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
            enabled={!ehColaborador}
            mode="dropdown"
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
            enabled={!ehColaborador}
            mode="dropdown"
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
            enabled={!ehColaborador}
            mode="dropdown"
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

      {/* Card de Almoço Simplificado */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="restaurant-outline" size={18} /> Pausas e Almoço
        </Text>
        <Text style={styles.smallSubtitle}>Ajuste os horários e toque nos dias para aplicar a pausa.</Text>
        
        <View style={styles.templatePickerRow}>
          <View style={styles.templateInputBox}>
            <Text style={styles.breakLabel}>Início</Text>
            <View style={styles.miniPickerContainer}>
              <Picker
                selectedValue={almocoTemplate.inicio}
                onValueChange={(v) => setAlmocoTemplate(prev => ({ ...prev, inicio: v }))}
                style={styles.miniPicker}
                enabled={!ehColaborador}
                mode="dropdown"
              >
                {pickerItems}
              </Picker>
            </View>
          </View>
          <View style={styles.templateInputBox}>
            <Text style={styles.breakLabel}>Fim</Text>
            <View style={styles.miniPickerContainer}>
              <Picker
                selectedValue={almocoTemplate.fim}
                onValueChange={(v) => setAlmocoTemplate(prev => ({ ...prev, fim: v }))}
                style={styles.miniPicker}
                enabled={!ehColaborador}
                mode="dropdown"
              >
                {pickerItems}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.diasGrid}>
          {diasSemana.map((dia, idx) => {
            const ativo = configAlmoco[String(idx)]?.ativo;
            return (
              <TouchableOpacity
                key={`almoco-${dia}`}
                style={[styles.diaSquare, ativo && styles.diaSquareActive]}
                onPress={() => toggleAlmocoDia(idx)}
                disabled={ehColaborador}
              >
                <Text style={[styles.diaSquareText, ativo && styles.diaSquareTextActive]}>{dia}</Text>
                {ativo && <Ionicons name="checkmark-circle" size={12} color="#FFF" style={styles.checkIcon} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Card de Fim de Semana e Feriados */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="calendar-outline" size={18} /> Fins de Semana e Feriados
        </Text>
        
        <View style={styles.statusButtonsRow}>
          <TouchableOpacity 
            style={[styles.statusBtn, especialTemplate.ativo && styles.statusBtnAtendo]}
            onPress={() => setEspecialTemplate(prev => ({ ...prev, ativo: true }))}
          >
            <Text style={[styles.statusBtnText, especialTemplate.ativo && styles.statusBtnTextActive]}>ATENDO</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statusBtn, !especialTemplate.ativo && styles.statusBtnNaoAtendo]}
            onPress={() => setEspecialTemplate(prev => ({ ...prev, ativo: false }))}
          >
            <Text style={[styles.statusBtnText, !especialTemplate.ativo && styles.statusBtnTextActive]}>NÃO ATENDO</Text>
          </TouchableOpacity>
        </View>

        {especialTemplate.ativo && (
          <View style={styles.templatePickerRow}>
            <View style={styles.templateInputBox}>
              <Text style={styles.breakLabel}>Abrir às</Text>
              <View style={styles.miniPickerContainer}>
                <Picker
                  selectedValue={especialTemplate.inicio}
                  onValueChange={(v) => setEspecialTemplate(prev => ({ ...prev, inicio: v }))}
                  style={styles.miniPicker}
                  mode="dropdown"
                >
                  {pickerItems}
                </Picker>
              </View>
            </View>
            <View style={styles.templateInputBox}>
              <Text style={styles.breakLabel}>Fechar às</Text>
              <View style={styles.miniPickerContainer}>
                <Picker
                  selectedValue={especialTemplate.fim}
                  onValueChange={(v) => setEspecialTemplate(prev => ({ ...prev, fim: v }))}
                  style={styles.miniPicker}
                  mode="dropdown"
                >
                  {pickerItems}
                </Picker>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.labelGrid}>Aplicar esta regra aos dias:</Text>
        <View style={styles.diasGrid}>
          {diasSemana.map((dia, idx) => {
            const especial = configAlmoco[String(idx)]?.usarHorarioDiferenciado;
            return (
              <TouchableOpacity
                key={`especial-${dia}`}
                style={[styles.diaSquare, especial && (especialTemplate.ativo ? styles.diaSquareActive : styles.diaSquareInactive)]}
                onPress={() => toggleEspecialDia(idx)}
                disabled={ehColaborador}
              >
                <Text style={[styles.diaSquareText, especial && styles.diaSquareTextActive]}>{dia}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={styles.holidayToggle} 
          onPress={() => setAtenderFeriados(!atenderFeriados)}
        >
          <Ionicons 
            name={atenderFeriados ? "checkbox" : "square-outline"} 
            size={24} 
            color={atenderFeriados ? colors.primary : "#CCC"} 
          />
          <Text style={styles.holidayToggleText}>Aplicar horários especiais aos feriados nacionais</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.previewToggleHeader} 
          onPress={() => setExibirPrevia(!exibirPrevia)}
        >
          <Text style={styles.sectionTitleNoBorder}>
            <Ionicons name="list" size={18} /> Prévia dos Horários Gerados
          </Text>
          <Ionicons name={exibirPrevia ? "chevron-up" : "chevron-down"} size={20} color="#999" />
        </TouchableOpacity>

        {exibirPrevia && (
          <>
            <View style={styles.previewInfo}>
              <Text style={styles.previewInfoText}>
                {horariosGerados.length} horário(s) gerado(s) baseado no expediente geral
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
          </>
        )}
      </View>

      {!ehColaborador && (
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
      )}
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

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 0,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D9E7FF',
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F3B73',
    marginBottom: 4,
  },

  noticeText: {
    fontSize: 13,
    color: '#5E6B7A',
    lineHeight: 18,
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

  disabledAction: {
    opacity: 0.55,
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
  // Novos estilos para almoço
  smallSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
    marginTop: -10,
  },
  breakDayRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  breakDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakDayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  miniToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  miniToggleActive: {
    backgroundColor: colors.primary + '15',
  },
  miniToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999',
  },

  miniToggleTextActive: {
    color: colors.primary,
  },

  breakInputs: {
    flexDirection: 'row',
  },
  breakInputBox: {
    flex: 1,
    marginRight: 15,
  },

  breakLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },

  miniPickerContainer: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    height: 40,
    justifyContent: 'center',
  },

  miniPicker: {
    height: 45,
    width: '100%',
  },
  templatePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  templateInputBox: {
    flex: 1,
    marginHorizontal: 5,
  },
  diasGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  diaSquare: {
    width: '13%',
    aspectRatio: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  diaSquareActive: {
    backgroundColor: colors.primary,
  },
  diaSquareInactive: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  diaSquareText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  diaSquareTextActive: {
    color: '#FFF',
  },
  checkIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEE',
    marginHorizontal: 5,
  },
  statusBtnAtendo: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  statusBtnNaoAtendo: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#999',
  },
  statusBtnTextActive: {
    color: '#333',
  },
  labelGrid: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  holidayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 12,
  },
  holidayToggleText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  breakHeaderWithActions: {
    flexDirection: 'column',
    marginBottom: 10,
  },
  btnReplicate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D0E6FF',
  },
  btnReplicateText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  previewToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  sectionTitleNoBorder: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
});