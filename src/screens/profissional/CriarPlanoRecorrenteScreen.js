import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import colors from '../../constants/colors';

const DIAS_SEMANA = [
  { id: 0, nome: 'Domingo', sigla: 'Dom' },
  { id: 1, nome: 'Segunda', sigla: 'Seg' },
  { id: 2, nome: 'Terça', sigla: 'Ter' },
  { id: 3, nome: 'Quarta', sigla: 'Qua' },
  { id: 4, nome: 'Quinta', sigla: 'Qui' },
  { id: 5, nome: 'Sexta', sigla: 'Sex' },
  { id: 6, nome: 'Sábado', sigla: 'Sáb' },
];

const HORARIOS_PADRAO = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

export default function CriarPlanoRecorrenteScreen({ navigation }) {
  const [carregando, setCarregando] = useState(false);

  // Dados do plano
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorMensal, setValorMensal] = useState('');
  const [sessoesPorMes, setSessoesPorMes] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('60');
  const [duracaoMinimaMeses, setDuracaoMinimaMeses] = useState('3');
  const [toleranciaRemarcacao, setToleranciaRemarcacao] = useState('2');
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(true);

  // Nova lógica: Dias disponíveis + faixa de horário
  const [diasDisponiveis, setDiasDisponiveis] = useState([]); // [1, 3, 5] = Seg, Qua, Sex
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [horarioFim, setHorarioFim] = useState('18:00');

  const toggleDia = (diaId) => {
    if (diasDisponiveis.includes(diaId)) {
      setDiasDisponiveis(diasDisponiveis.filter(d => d !== diaId));
    } else {
      setDiasDisponiveis([...diasDisponiveis, diaId].sort());
    }
  };

  const getNomeDia = (diaSemana) => {
    return DIAS_SEMANA.find(d => d.id === diaSemana)?.nome || '';
  };

  const validarDados = () => {
    if (!nome.trim()) return 'Digite o nome do plano';
    if (!valorMensal || Number(valorMensal) <= 0) return 'Digite o valor mensal';
    if (!sessoesPorMes || Number(sessoesPorMes) <= 0) return 'Digite a quantidade de sessões por mês';
    if (diasDisponiveis.length === 0) return 'Selecione pelo menos um dia da semana';

    const horaInicio = parseInt(horarioInicio.split(':')[0]);
    const horaFim = parseInt(horarioFim.split(':')[0]);
    if (horaFim <= horaInicio) return 'Horário de fim deve ser maior que horário de início';

    // Sem limites - profissional define quantas sessões quiser
    return null;
  };

  const salvarPlano = async () => {
    const erro = validarDados();
    if (erro) {
      Alert.alert('Atenção', erro);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setCarregando(true);

    try {
      const planoData = {
        profissionalId: user.uid,
        nome: nome.trim(),
        descricao: descricao.trim(),
        valorMensal: Number(valorMensal),
        sessoesPorMes: Number(sessoesPorMes),
        duracaoMinutos: Number(duracaoMinutos) || 60,
        duracaoMinimaMeses: Number(duracaoMinimaMeses) || 3,
        toleranciaRemarcacao: Number(toleranciaRemarcacao) || 2,
        renovacaoAutomatica,
        // Nova estrutura: dias disponíveis + faixa horário
        diasDisponiveis: diasDisponiveis,
        horarioInicio: horarioInicio,
        horarioFim: horarioFim,
        // Mantemos horariosFixos vazio para compatibilidade (será preenchido quando cliente escolher)
        horariosFixos: [],
        ativo: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      await addDoc(collection(db, 'planosRecorrentes'), planoData);

      Alert.alert(
        'Sucesso!',
        'Plano recorrente criado com sucesso!\n\nClientes já podem contratar este plano.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      Alert.alert('Erro', 'Não foi possível criar o plano. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Plano Recorrente</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Seção: Informações Básicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Plano</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Plano *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Pacote Personal 8x"
              value={nome}
              onChangeText={setNome}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva o que está incluso no plano..."
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>
        </View>

        {/* Seção: Valor e Sessões */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valor e Sessões</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Valor Mensal R$ *</Text>
              <TextInput
                style={styles.input}
                placeholder="400,00"
                value={valorMensal}
                onChangeText={setValorMensal}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Sessões/Mês *</Text>
              <TextInput
                style={styles.input}
                placeholder="8"
                value={sessoesPorMes}
                onChangeText={setSessoesPorMes}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Duração (min)</Text>
              <TextInput
                style={styles.input}
                placeholder="60"
                value={duracaoMinutos}
                onChangeText={setDuracaoMinutos}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Fidelidade (meses)</Text>
              <TextInput
                style={styles.input}
                placeholder="3"
                value={duracaoMinimaMeses}
                onChangeText={setDuracaoMinimaMeses}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Fidelidade: período mínimo que o cliente deve permanecer. Após este período, pode cancelar sem multa.
            </Text>
          </View>
        </View>

        {/* Seção: Dias e Horários Disponíveis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dias e Horários Disponíveis *</Text>
          <Text style={styles.subtitle}>
            Selecione os dias da semana e a faixa de horário que você atenderá clientes deste plano
          </Text>

          {/* Seletor de Dias (múltiplos) */}
          <Text style={styles.label}>Dias da Semana</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.diasScroll}
          >
            {DIAS_SEMANA.map(dia => (
              <TouchableOpacity
                key={dia.id}
                style={[
                  styles.diaButton,
                  diasDisponiveis.includes(dia.id) && styles.diaButtonSelected
                ]}
                onPress={() => toggleDia(dia.id)}
              >
                <Text style={[
                  styles.diaText,
                  diasDisponiveis.includes(dia.id) && styles.diaTextSelected
                ]}>
                  {dia.sigla}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Seletor de Faixa de Horário */}
          <Text style={[styles.label, { marginTop: 16 }]}>Faixa de Horário</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Início</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horasScroll}
              >
                {HORARIOS_PADRAO.map(hora => (
                  <TouchableOpacity
                    key={`inicio-${hora}`}
                    style={[
                      styles.horaButton,
                      horarioInicio === hora && styles.horaButtonSelected
                    ]}
                    onPress={() => setHorarioInicio(hora)}
                  >
                    <Text style={[
                      styles.horaText,
                      horarioInicio === hora && styles.horaTextSelected
                    ]}>
                      {hora}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Fim</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horasScroll}
              >
                {HORARIOS_PADRAO.map(hora => (
                  <TouchableOpacity
                    key={`fim-${hora}`}
                    style={[
                      styles.horaButton,
                      horarioFim === hora && styles.horaButtonSelected
                    ]}
                    onPress={() => setHorarioFim(hora)}
                  >
                    <Text style={[
                      styles.horaText,
                      horarioFim === hora && styles.horaTextSelected
                    ]}>
                      {hora}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Resumo dos dias selecionados */}
          {diasDisponiveis.length > 0 && (
            <View style={styles.horariosList}>
              <Text style={styles.horariosListTitle}>Configuração:</Text>
              <View style={styles.horarioItem}>
                <View style={styles.horarioInfo}>
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                  <Text style={styles.horarioText}>
                    {diasDisponiveis.map(d => getNomeDia(d)).join(', ')}
                  </Text>
                </View>
              </View>
              <View style={styles.horarioItem}>
                <View style={styles.horarioInfo}>
                  <Ionicons name="time" size={18} color={colors.primary} />
                  <Text style={styles.horarioText}>
                    Das {horarioInicio} às {horarioFim}
                  </Text>
                </View>
              </View>

              <View style={styles.calculoBox}>
                <Text style={styles.calculoText}>
                  {diasDisponiveis.length} dia(s) × 4 semanas = {diasDisponiveis.length * 4} sessões/mês
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Seção: Configurações Avançadas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações Avançadas</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarcações Permitidas/Mês</Text>
            <TextInput
              style={styles.input}
              placeholder="2"
              value={toleranciaRemarcacao}
              onChangeText={setToleranciaRemarcacao}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Quantas vezes o cliente pode remarcar sessões por mês sem custo adicional
            </Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Renovação Automática</Text>
              <Text style={styles.switchDescription}>
                Após o período de fidelidade, renova automaticamente todo mês
              </Text>
            </View>
            <Switch
              value={renovacaoAutomatica}
              onValueChange={setRenovacaoAutomatica}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor={renovacaoAutomatica ? colors.white : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, carregando && styles.saveButtonDisabled]}
          onPress={salvarPlano}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={colors.white} />
              <Text style={styles.saveButtonText}>Criar Plano Recorrente</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },
  diasScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  diaButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  diaButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  diaText: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
  diaTextSelected: {
    color: colors.white,
  },
  horasScroll: {
    flexDirection: 'row',
  },
  horaButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  horaButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  horaText: {
    fontSize: 13,
    color: colors.textDark,
  },
  horaTextSelected: {
    color: colors.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  horariosList: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  horariosListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 12,
  },
  horarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  horarioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  horarioText: {
    fontSize: 15,
    color: colors.textDark,
    marginLeft: 8,
  },
  calculoBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  calculoText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textDark,
  },
  switchDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
