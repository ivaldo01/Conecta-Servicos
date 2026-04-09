import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../services/firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import colors from '../../constants/colors';

const STATUS_CONFIG = {
  ATIVO: { color: '#2E7D32', label: 'Ativo', icon: 'checkmark-circle' },
  PENDENTE_PAGAMENTO: { color: '#FF9800', label: 'Aguardando Pagamento', icon: 'time' },
  PAGO: { color: '#1565C0', label: 'Pago', icon: 'card' },
  VENCIDO: { color: '#E63946', label: 'Vencido', icon: 'alert-circle' },
  CANCELADO: { color: '#757575', label: 'Cancelado', icon: 'close-circle' },
  FINALIZADO: { color: '#6A1B9A', label: 'Finalizado', icon: 'flag' },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function MeusContratosScreen({ navigation }) {
  const [contratos, setContratos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [agendamentosDoContrato, setAgendamentosDoContrato] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'contratosRecorrentes'),
      where('clienteId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const contratosData = await Promise.all(
        snapshot.docs.map(async (docContrato) => {
          const data = docContrato.data();

          // Buscar dados do profissional
          const profDoc = await getDoc(doc(db, 'usuarios', data.profissionalId));
          const profissional = profDoc.exists ? profDoc.data() : null;

          // Buscar dados do plano
          const planoDoc = await getDoc(doc(db, 'planosRecorrentes', data.planoId));
          const plano = planoDoc.exists ? planoDoc.data() : null;

          return {
            id: docContrato.id,
            ...data,
            profissional,
            plano,
            proximoVencimento: data.proximoVencimento?.toDate?.() || data.proximoVencimento,
            dataInicio: data.dataInicio?.toDate?.() || data.dataInicio,
          };
        })
      );

      setContratos(contratosData.sort((a, b) => {
        // Ordenar: ATIVO primeiro, depois por data
        if (a.status === 'ATIVO' && b.status !== 'ATIVO') return -1;
        if (a.status !== 'ATIVO' && b.status === 'ATIVO') return 1;
        return 0;
      }));

      setCarregando(false);
      setAtualizando(false);
    });

    return () => unsubscribe();
  }, []);

  const carregarAgendamentos = async (contrato) => {
    if (!contrato.agendamentosIds || contrato.agendamentosIds.length === 0) {
      setAgendamentosDoContrato([]);
      return;
    }

    try {
      const agendamentos = await Promise.all(
        contrato.agendamentosIds.map(async (agendamentoId) => {
          const agendamentoDoc = await getDoc(doc(db, 'agendamentos', agendamentoId));
          if (agendamentoDoc.exists) {
            const data = agendamentoDoc.data();
            return {
              id: agendamentoDoc.id,
              ...data,
              dataAgendamento: data.dataAgendamento?.toDate?.() || data.dataAgendamento,
            };
          }
          return null;
        })
      );

      setAgendamentosDoContrato(
        agendamentos
          .filter(a => a !== null)
          .sort((a, b) => a.dataAgendamento - b.dataAgendamento)
      );
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    }
  };

  const abrirDetalhes = async (contrato) => {
    setContratoSelecionado(contrato);
    await carregarAgendamentos(contrato);
    setModalDetalhes(true);
  };

  const remarcarSessao = async (agendamento) => {
    Alert.alert(
      'Remarcar Sessão',
      `Deseja remarcar a sessão de ${format(agendamento.dataAgendamento, 'dd/MM/yyyy')} às ${agendamento.horaInicio}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remarcar',
          onPress: () => {
            // Navegar para tela de seleção de novo horário
            navigation.navigate('RemarcarSessao', {
              agendamentoId: agendamento.id,
              contratoId: contratoSelecionado.id,
              profissionalId: contratoSelecionado.profissionalId,
              dataAtual: agendamento.dataAgendamento,
            });
          }
        }
      ]
    );
  };

  const cancelarContrato = async (contrato) => {
    const podeCancelar = contrato.cicloAtual >= contrato.totalCiclos;

    if (!podeCancelar) {
      Alert.alert(
        'Período de Fidelidade',
        `Você está no mês ${contrato.cicloAtual} de ${contrato.totalCiclos} do período mínimo. Após completar ${contrato.totalCiclos} meses, você poderá cancelar sem multa.`,
        [
          { text: 'Entendi' },
          {
            text: 'Cancelar mesmo assim',
            style: 'destructive',
            onPress: () => confirmarCancelamento(contrato, true)
          }
        ]
      );
      return;
    }

    confirmarCancelamento(contrato, false);
  };

  const confirmarCancelamento = (contrato, comMulta) => {
    const mensagem = comMulta
      ? `Deseja realmente cancelar? Você será cobrado uma multa por descumprir o período de fidelidade.`
      : `Deseja realmente cancelar o contrato? Os agendamentos futuros serão cancelados.`;

    Alert.alert(
      'Confirmar Cancelamento',
      mensagem,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancelar contrato
              await updateDoc(doc(db, 'contratosRecorrentes', contrato.id), {
                status: 'CANCELADO',
                canceladoEm: serverTimestamp(),
                atualizadoEm: serverTimestamp(),
                motivoCancelamento: comMulta ? 'Fidelidade descumprida' : 'Solicitação do cliente'
              });

              // Cancelar agendamentos futuros
              const agendamentosFuturos = agendamentosDoContrato.filter(
                a => a.dataAgendamento > new Date() && a.status !== 'cancelado'
              );

              await Promise.all(
                agendamentosFuturos.map(agendamento =>
                  updateDoc(doc(db, 'agendamentos', agendamento.id), {
                    status: 'cancelado',
                    motivoCancelamento: 'Contrato cancelado',
                    canceladoEm: serverTimestamp(),
                  })
                )
              );

              Alert.alert('Sucesso', 'Contrato cancelado com sucesso!');
              setModalDetalhes(false);
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível cancelar o contrato');
            }
          }
        }
      ]
    );
  };

  const getProximoVencimentoText = (data) => {
    if (!data) return 'N/A';
    return format(data, 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.PENDENTE_PAGAMENTO;
  };

  const formatarHorarios = (horarios) => {
    if (!horarios || horarios.length === 0) return '';

    return horarios.map(h =>
      `${DIAS_SEMANA[h.diaSemana]} ${h.hora}`
    ).join(' • ');
  };

  const renderContrato = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirDetalhes(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.profissionalInfo}>
            <Text style={styles.profissionalNome}>
              {item.profissional?.nome || 'Profissional'}
            </Text>
            <Text style={styles.planoNome}>{item.plano?.nome}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              R$ {item.valorMensal?.toFixed(2).replace('.', ',')}/mês
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="repeat" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Ciclo {item.cicloAtual} de {item.totalCiclos} meses
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Próx. vencimento: {getProximoVencimentoText(item.proximoVencimento)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {formatarHorarios(item.horariosFixos)}
            </Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(item.sessoesRealizadas / item.sessoesTotaisContrato) * 100}%`,
                backgroundColor: statusConfig.color
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {item.sessoesRealizadas} de {item.sessoesTotaisContrato} sessões realizadas
          {item.sessoesRestantesMesAtual > 0 && ` • ${item.sessoesRestantesMesAtual} restantes este mês`}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAgendamento = (agendamento) => {
    const data = agendamento.dataAgendamento;
    const hoje = new Date();
    const isPassado = data < hoje;
    const dataHoje = format(hoje, 'yyyy-MM-dd');
    const dataAgendamento = format(data, 'yyyy-MM-dd');
    const isHoje = dataAgendamento === dataHoje;

    return (
      <View style={[
        styles.agendamentoItem,
        isPassado && styles.agendamentoPassado,
        agendamento.status === 'cancelado' && styles.agendamentoCancelado
      ]}>
        <View style={styles.agendamentoData}>
          <Text style={styles.agendamentoDiaSemana}>
            {format(data, 'EEE', { locale: ptBR }).toUpperCase()}
          </Text>
          <Text style={styles.agendamentoDiaNumero}>
            {format(data, 'dd')}
          </Text>
          <Text style={styles.agendamentoMes}>
            {format(data, 'MMM', { locale: ptBR })}
          </Text>
        </View>

        <View style={styles.agendamentoInfo}>
          <Text style={styles.agendamentoHora}>{agendamento.horaInicio || agendamento.hora}</Text>
          <Text style={styles.agendamentoStatus}>
            {agendamento.status === 'confirmado' ? 'Confirmado' :
              agendamento.status === 'cancelado' ? 'Cancelado' :
                agendamento.status === 'concluido' ? 'Concluído' : 'Agendado'}
          </Text>
          {agendamento.remarcadoDe && (
            <Text style={styles.agendamentoRemarcado}>(Remarcado)</Text>
          )}
        </View>

        {
          !isPassado && agendamento.status !== 'cancelado' && agendamento.status !== 'concluido' && (
            <TouchableOpacity
              style={styles.remarcarButton}
              onPress={() => remarcarSessao(agendamento)}
            >
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.remarcarText}>Remarcar</Text>
            </TouchableOpacity>
          )
        }
      </View >
    );
  };

  const onRefresh = () => {
    setAtualizando(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Planos</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={contratos}
        keyExtractor={item => item.id}
        renderItem={renderContrato}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhum plano contratado</Text>
            <Text style={styles.emptyText}>
              Você ainda não possui planos recorrentes ativos.
            </Text>
            <TouchableOpacity
              style={styles.buscarButton}
              onPress={() => navigation.navigate('BuscaProfissionais')}
            >
              <Text style={styles.buscarButtonText}>Buscar Profissionais</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal de Detalhes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalhes}
        onRequestClose={() => setModalDetalhes(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Contrato</Text>
              <TouchableOpacity onPress={() => setModalDetalhes(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            {contratoSelecionado && (
              <ScrollView style={styles.modalBody}>
                {/* Info do Profissional */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Profissional</Text>
                  <Text style={styles.sectionValue}>
                    {contratoSelecionado.profissional?.nome || 'N/A'}
                  </Text>
                  {contratoSelecionado.profissional?.especialidade && (
                    <Text style={styles.sectionSubvalue}>
                      {contratoSelecionado.profissional.especialidade}
                    </Text>
                  )}
                </View>

                {/* Info do Plano */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Plano</Text>
                  <Text style={styles.sectionValue}>
                    {contratoSelecionado.plano?.nome}
                  </Text>
                  <View style={styles.planoDetalhes}>
                    <Text style={styles.planoDetalhe}>
                      {contratoSelecionado.plano?.sessoesPorMes} sessões/mês
                    </Text>
                    <Text style={styles.planoDetalhe}>
                      {contratoSelecionado.plano?.duracaoMinutos}min cada
                    </Text>
                  </View>
                </View>

                {/* Progresso */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Progresso</Text>
                  <View style={styles.progressoBox}>
                    <View style={styles.progressoItem}>
                      <Text style={styles.progressoNumero}>
                        {contratoSelecionado.sessoesRealizadas}
                      </Text>
                      <Text style={styles.progressoLabel}>Realizadas</Text>
                    </View>
                    <View style={styles.progressoItem}>
                      <Text style={styles.progressoNumero}>
                        {contratoSelecionado.sessoesRestantesMesAtual}
                      </Text>
                      <Text style={styles.progressoLabel}>Restantes (mês)</Text>
                    </View>
                    <View style={styles.progressoItem}>
                      <Text style={styles.progressoNumero}>
                        {contratoSelecionado.sessoesTotaisContrato - contratoSelecionado.sessoesRealizadas}
                      </Text>
                      <Text style={styles.progressoLabel}>Restantes (total)</Text>
                    </View>
                  </View>
                </View>

                {/* Próximos Agendamentos */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Próximas Sessões</Text>
                  {agendamentosDoContrato.filter(a => a.dataAgendamento >= new Date()).length === 0 ? (
                    <Text style={styles.noAgendamentos}>
                      Nenhuma sessão agendada. O plano será renovado automaticamente.
                    </Text>
                  ) : (
                    agendamentosDoContrato
                      .filter(a => a.dataAgendamento >= new Date())
                      .slice(0, 5)
                      .map(agendamento => renderAgendamento(agendamento))
                  )}
                </View>

                {/* Ações */}
                {contratoSelecionado.status === 'ATIVO' && (
                  <View style={styles.acoesSection}>
                    <TouchableOpacity
                      style={styles.cancelarButton}
                      onPress={() => cancelarContrato(contratoSelecionado)}
                    >
                      <Ionicons name="close-circle" size={20} color="#E63946" />
                      <Text style={styles.cancelarButtonText}>
                        Cancelar Contrato
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profissionalInfo: {
    flex: 1,
  },
  profissionalNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  planoNome: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  buscarButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  buscarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  sectionSubvalue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planoDetalhes: {
    flexDirection: 'row',
    marginTop: 8,
  },
  planoDetalhe: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 16,
  },
  progressoBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  progressoItem: {
    alignItems: 'center',
  },
  progressoNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  noAgendamentos: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  agendamentoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  agendamentoPassado: {
    opacity: 0.6,
  },
  agendamentoCancelado: {
    backgroundColor: '#FFEBEE',
  },
  agendamentoData: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 8,
    minWidth: 60,
  },
  agendamentoDiaSemana: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  agendamentoDiaNumero: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  agendamentoMes: {
    fontSize: 10,
    color: colors.white,
  },
  agendamentoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  agendamentoHora: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  agendamentoStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  agendamentoRemarcado: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  remarcarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  remarcarText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  acoesSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E63946',
  },
  cancelarButtonText: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
