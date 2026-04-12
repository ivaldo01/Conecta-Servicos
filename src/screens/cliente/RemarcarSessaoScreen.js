import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../services/firebaseConfig';
import { 
  doc, 
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import colors from '../../constants/colors';

const HORARIOS_PADRAO = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

export default function RemarcarSessaoScreen({ route, navigation }) {
  const { agendamentoId, contratoId, profissionalId, dataAtual } = route.params;
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [profissional, setProfissional] = useState(null);
  const [contrato, setContrato] = useState(null);
  const [agendamentoAtual, setAgendamentoAtual] = useState(null);
  const [horariosOcupados, setHorariosOcupados] = useState([]);
  const [agendaConfig, setAgendaConfig] = useState(null);
  
  const [semanaSelecionada, setSemanaSelecionada] = useState(0);
  const [dataSelecionada, setDataSelecionada] = useState(null);
  const [horaSelecionada, setHoraSelecionada] = useState(null);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);

      // Carregar agendamento atual
      const agendamentoDoc = await getDoc(doc(db, 'agendamentos', agendamentoId));
      if (!agendamentoDoc.exists) {
        Alert.alert('Erro', 'Agendamento não encontrado');
        navigation.goBack();
        return;
      }
      setAgendamentoAtual({ id: agendamentoDoc.id, ...agendamentoDoc.data() });

      // Carregar profissional
      const profDoc = await getDoc(doc(db, 'usuarios', profissionalId));
      if (profDoc.exists) {
        setProfissional(profDoc.data());
      }

      // Carregar contrato
      const contratoDoc = await getDoc(doc(db, 'contratosRecorrentes', contratoId));
      if (contratoDoc.exists) {
        setContrato(contratoDoc.data());
      }

      // Carregar configuração de agenda (incluindo almoço)
      const agendaRef = doc(db, 'usuarios', profissionalId, 'configuracoes', 'agenda');
      const agendaSnap = await getDoc(agendaRef);
      if (agendaSnap.exists()) {
        setAgendaConfig(agendaSnap.data());
      }

      // Buscar horários ocupados do profissional
      await buscarHorariosOcupados();

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setCarregando(false);
    }
  };

  const buscarHorariosOcupados = async () => {
    const hoje = new Date();
    const dataFim = addDays(hoje, 60); // Próximos 60 dias

    // Buscar agendamentos do profissional
    const q = query(
      collection(db, 'agendamentos'),
      where('profissionalId', '==', profissionalId),
      where('status', 'in', ['pendente', 'confirmado'])
    );

    const snapshot = await getDocs(q);
    const ocupados = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(ag => {
        const dataAg = ag.dataAgendamento?.toDate?.() || new Date(ag.dataAgendamento);
        return dataAg >= hoje && dataAg <= dataFim && ag.id !== agendamentoId;
      });

    setHorariosOcupados(ocupados);
  };

  const gerarDiasSemana = (offsetSemanas = 0) => {
    const hoje = new Date();
    const inicioSemana = addDays(startOfWeek(hoje, { weekStartsOn: 0 }), offsetSemanas * 7);
    
    return Array.from({ length: 7 }, (_, i) => {
      const data = addDays(inicioSemana, i);
      return {
        data,
        diaSemana: i,
        dia: format(data, 'dd'),
        mes: format(data, 'MMM', { locale: ptBR }),
        nomeDia: format(data, 'EEE', { locale: ptBR })
      };
    });
  };

  const isHorarioDisponivel = (data, hora) => {
    // 1. Verifica agendamentos existentes
    const jaOcupado = horariosOcupados.some(ag => {
      const dataAg = ag.dataAgendamento?.toDate?.() || new Date(ag.dataAgendamento);
      return isSameDay(dataAg, data) && ag.horaInicio === hora;
    });

    if (jaOcupado) return false;

    // --- Lógica de Feriados ---
    const FERIADOS_BR = [
      "01-01", "21-04", "01-05", "07-09", "12-10", "02-11", "15-11", "20-11", "25-12"
    ];
    const diaMes = `${String(data.getDate()).padStart(2, '0')}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    const ehFeriado = FERIADOS_BR.includes(diaMes);

    if (ehFeriado && !agendaConfig?.atenderFeriados) return false;

    // 2. Verifica horário de almoço flexível
    if (agendaConfig?.configAlmoco) {
      const diaIdx = data.getDay();
      const config = agendaConfig.configAlmoco[diaIdx];
      
      // Checa Almoço
      if (config?.ativo && config.inicio && config.fim && hora) {
        try {
          const [h, m] = hora.split(':').map(Number);
          const [hIni, mIni] = config.inicio.split(':').map(Number);
          const [hFim, mFim] = config.fim.split(':').map(Number);

          if (!isNaN(h) && !isNaN(hIni) && !isNaN(hFim)) {
            const atual = h * 60 + m;
            const inicio = hIni * 60 + mIni;
            const fim = hFim * 60 + mFim;

            if (atual >= inicio && atual < fim) return false;
          }
        } catch (e) {
          console.log("Erro no calculo de almoço (Remarcar):", e);
        }
      }

      // Checa Expediente Diferenciado (Meio Período)
      const hInicioStr = config?.usarHorarioDiferenciado ? config.inicioExpediente : agendaConfig.horaInicio;
      const hFimStr = config?.usarHorarioDiferenciado ? config.fimExpediente : agendaConfig.horaFim;

      if (hInicioStr && hFimStr && hora) {
        try {
          const [h, m] = hora.split(':').map(Number);
          const [hIniExp, mIniExp] = hInicioStr.split(':').map(Number);
          const [hFimExp, mFimExp] = hFimStr.split(':').map(Number);

          const atual = h * 60 + m;
          const inicio = hIniExp * 60 + mIniExp;
          const fim = hFimExp * 60 + mFimExp;

          if (atual < inicio || atual >= (hFimStr === "00:00" ? 1440 : fim)) return false;
        } catch (e) {
           console.log("Erro no calculo de expediente (Remarcar):", e);
        }
      }
    }

    return true;
  };

  const confirmarRemarcacao = async () => {
    if (!dataSelecionada || !horaSelecionada) {
      Alert.alert('Atenção', 'Selecione uma data e horário');
      return;
    }

    setSalvando(true);

    try {
      const user = auth.currentUser;
      
      // 1. Cancelar agendamento antigo
      await updateDoc(doc(db, 'agendamentos', agendamentoId), {
        status: 'cancelado',
        motivoCancelamento: 'Remarcado pelo cliente',
        remarcadoPara: {
          data: dataSelecionada,
          hora: horaSelecionada
        },
        canceladoEm: serverTimestamp()
      });

      // 2. Criar novo agendamento
      const novoAgendamentoData = {
        clienteId: user.uid,
        clienteNome: contrato?.clienteNome || user.displayName || 'Cliente',
        profissionalId: profissionalId,
        colaboradorId: profissionalId,
        clinicaId: profissional?.clinicaId || null,
        
        dataAgendamento: dataSelecionada,
        horaInicio: horaSelecionada,
        horaFim: calcularHoraFim(horaSelecionada, contrato?.plano?.duracaoMinutos || 60),
        
        servico: contrato?.plano?.nome || 'Sessão',
        servicoId: contrato?.planoId,
        
        status: 'confirmado',
        statusPagamento: 'pago', // Já está pago pelo contrato
        
        // Vincular ao contrato
        contratoId: contratoId,
        tipoAgendamento: 'RECORRENTE',
        remarcadoDe: agendamentoId,
        numeroSessaoContrato: agendamentoAtual?.numeroSessaoContrato,
        
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      };

      const novoAgendamentoRef = await addDoc(
        collection(db, 'agendamentos'), 
        novoAgendamentoData
      );

      // 3. Atualizar contrato com novo agendamento
      const contratoRef = doc(db, 'contratosRecorrentes', contratoId);
      const contratoDoc = await getDoc(contratoRef);
      const contratoData = contratoDoc.data();
      
      const novosAgendamentosIds = [
        ...(contratoData.agendamentosIds || []).filter(id => id !== agendamentoId),
        novoAgendamentoRef.id
      ];

      await updateDoc(contratoRef, {
        agendamentosIds: novosAgendamentosIds,
        remarcacoesUsadasMes: (contratoData.remarcacoesUsadasMes || 0) + 1,
        atualizadoEm: serverTimestamp()
      });

      // 4. Registrar log de remarcação
      await addDoc(collection(db, 'sessoesRemarcadas'), {
        contratoId: contratoId,
        agendamentoOriginalId: agendamentoId,
        agendamentoNovoId: novoAgendamentoRef.id,
        clienteId: user.uid,
        profissionalId: profissionalId,
        dataOriginal: agendamentoAtual?.dataAgendamento,
        dataNova: dataSelecionada,
        horaOriginal: agendamentoAtual?.horaInicio,
        horaNova: horaSelecionada,
        motivo: motivo || 'Solicitação do cliente',
        remarcacaoNumero: (contratoData.remarcacoesUsadasMes || 0) + 1,
        dataRemarcacao: serverTimestamp()
      });

      Alert.alert(
        'Sucesso!',
        `Sessão remarcada para ${format(dataSelecionada, 'dd/MM/yyyy')} às ${horaSelecionada}`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('MeusContratos')
          }
        ]
      );

    } catch (error) {
      console.error('Erro ao remarcar:', error);
      Alert.alert('Erro', 'Não foi possível remarcar a sessão. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const calcularHoraFim = (horaInicio, duracaoMinutos) => {
    const [hora, minuto] = horaInicio.split(':').map(Number);
    const data = new Date();
    data.setHours(hora, minuto + duracaoMinutos);
    return format(data, 'HH:mm');
  };

  const diasSemana = gerarDiasSemana(semanaSelecionada);

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const remarcacoesRestantes = (contrato?.plano?.toleranciaRemarcacao || 2) - 
    (contrato?.remarcacoesUsadasMes || 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Remarcar Sessão</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info da sessão atual */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Sessão Atual</Text>
          <Text style={styles.infoText}>
            {agendamentoAtual?.dataAgendamento && 
              format(
                agendamentoAtual.dataAgendamento.toDate?.() || new Date(agendamentoAtual.dataAgendamento), 
                "dd 'de' MMMM", 
                { locale: ptBR }
              )
            } às {agendamentoAtual?.horaInicio}
          </Text>
          <Text style={styles.infoSubtext}>
            Profissional: {profissional?.nome}
          </Text>
        </View>

        {/* Alerta de remarcações */}
        {remarcacoesRestantes <= 1 && (
          <View style={[styles.alertaBox, remarcacoesRestantes === 0 && styles.alertaCritico]}>
            <Ionicons 
              name={remarcacoesRestantes === 0 ? "warning" : "alert-circle"} 
              size={24} 
              color={remarcacoesRestantes === 0 ? '#E63946' : '#FF9800'} 
            />
            <View style={styles.alertaContent}>
              <Text style={[styles.alertaTitle, remarcacoesRestantes === 0 && { color: '#E63946' }]}>
                {remarcacoesRestantes === 0 
                  ? 'Limite de remarcações atingido!' 
                  : 'Última remarcação disponível'}
              </Text>
              <Text style={styles.alertaText}>
                {remarcacoesRestantes === 0 
                  ? 'Você já usou todas as remarcações deste mês. Próximas remarcações terão custo adicional.'
                  : `Você tem apenas ${remarcacoesRestantes} remarcação(ões) restante(s) este mês.`}
              </Text>
            </View>
          </View>
        )}

        {/* Seletor de Semana */}
        <View style={styles.section}>
          <View style={styles.semanaHeader}>
            <TouchableOpacity 
              onPress={() => setSemanaSelecionada(Math.max(0, semanaSelecionada - 1))}
              disabled={semanaSelecionada === 0}
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={semanaSelecionada === 0 ? '#ccc' : colors.primary} 
              />
            </TouchableOpacity>
            <Text style={styles.semanaTitle}>
              {semanaSelecionada === 0 ? 'Esta semana' : `Em ${semanaSelecionada} semana(s)`}
            </Text>
            <TouchableOpacity onPress={() => setSemanaSelecionada(semanaSelecionada + 1)}>
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Dias da Semana */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.diasContainer}
          >
            {diasSemana.map((dia) => (
              <TouchableOpacity
                key={dia.data.toISOString()}
                style={[
                  styles.diaButton,
                  dataSelecionada && isSameDay(dataSelecionada, dia.data) && styles.diaButtonSelected,
                  dia.data < new Date() && styles.diaButtonDisabled
                ]}
                onPress={() => {
                  if (dia.data >= new Date()) {
                    setDataSelecionada(dia.data);
                    setHoraSelecionada(null);
                  }
                }}
                disabled={dia.data < new Date()}
              >
                <Text style={[
                  styles.diaNome,
                  dataSelecionada && isSameDay(dataSelecionada, dia.data) && styles.diaTextSelected
                ]}>
                  {dia.nomeDia}
                </Text>
                <Text style={[
                  styles.diaNumero,
                  dataSelecionada && isSameDay(dataSelecionada, dia.data) && styles.diaTextSelected
                ]}>
                  {dia.dia}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Horários */}
        {dataSelecionada && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Horários disponíveis para {format(dataSelecionada, "dd/MM", { locale: ptBR })}
            </Text>
            
            <View style={styles.horariosGrid}>
              {HORARIOS_PADRAO.map(hora => {
                const disponivel = isHorarioDisponivel(dataSelecionada, hora);
                return (
                  <TouchableOpacity
                    key={hora}
                    style={[
                      styles.horarioButton,
                      horaSelecionada === hora && styles.horarioButtonSelected,
                      !disponivel && styles.horarioButtonOcupado
                    ]}
                    onPress={() => disponivel && setHoraSelecionada(hora)}
                    disabled={!disponivel}
                  >
                    <Text style={[
                      styles.horarioText,
                      horaSelecionada === hora && styles.horarioTextSelected,
                      !disponivel && styles.horarioTextOcupado
                    ]}>
                      {hora}
                    </Text>
                    {!disponivel && (
                      <Text style={styles.ocupadoLabel}>Ocupado</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Resumo */}
        {dataSelecionada && horaSelecionada && (
          <View style={styles.resumoBox}>
            <Text style={styles.resumoTitle}>Nova Data e Horário</Text>
            <Text style={styles.resumoText}>
              {format(dataSelecionada, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
            <Text style={styles.resumoHora}>{horaSelecionada}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão Confirmar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmarButton,
            (!dataSelecionada || !horaSelecionada || salvando) && styles.confirmarButtonDisabled
          ]}
          onPress={confirmarRemarcacao}
          disabled={!dataSelecionada || !horaSelecionada || salvando}
        >
          {salvando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={colors.white} />
              <Text style={styles.confirmarButtonText}>
                Confirmar Remarcação
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
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
  infoBox: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  infoSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  alertaBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertaCritico: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#E63946',
  },
  alertaContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 4,
  },
  alertaText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  semanaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  semanaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  diasContainer: {
    paddingRight: 16,
  },
  diaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  diaButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  diaButtonDisabled: {
    opacity: 0.4,
  },
  diaNome: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  diaNumero: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 4,
  },
  diaTextSelected: {
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 16,
  },
  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  horarioButton: {
    width: '23%',
    margin: '1%',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  horarioButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  horarioButtonOcupado: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  horarioText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
  },
  horarioTextSelected: {
    color: colors.white,
  },
  horarioTextOcupado: {
    color: '#E63946',
  },
  ocupadoLabel: {
    fontSize: 10,
    color: '#E63946',
    marginTop: 2,
  },
  resumoBox: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  resumoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  resumoText: {
    fontSize: 16,
    color: colors.textDark,
  },
  resumoHora: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  footer: {
    backgroundColor: colors.white,
    padding: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  confirmarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmarButtonDisabled: {
    opacity: 0.6,
  },
  confirmarButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
