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
  Image,
  ImageBackground,
  Linking,
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
  PAUSADO: { color: '#0284C7', label: 'Pausado', icon: 'pause-circle' },
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

  const abrirWhatsApp = () => {
    if (!contratoSelecionado) return;
    const { profissional } = contratoSelecionado;
    const telefone = profissional?.telefone || profissional?.whatsapp;
    if (!telefone) {
      Alert.alert('Ops', 'O profissional não possui telefone cadastrado.');
      return;
    }
    const numeroLimpo = telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Olá ${profissional?.nome || 'Profissional'}! Sou o cliente referente à assinatura do plano "${contratoSelecionado?.plano?.nome || 'Serviço'}". Gostaria de conversar com você!`);
    Linking.openURL(`https://wa.me/55${numeroLimpo}?text=${mensagem}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
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
    Alert.alert(
      'Opção Recomendada',
      'Em vez de cancelar e perder seus horários fixos com o profissional, que tal pausar sua assinatura por 30 dias?',
      [
        {
          text: 'Pausar Assinatura',
          style: 'default',
          onPress: async () => {
             try {
                await updateDoc(doc(db, 'contratosRecorrentes', contrato.id), {
                   status: 'PAUSADO',
                   atualizadoEm: serverTimestamp(),
                   motivoPausa: 'Retenção'
                });
                Alert.alert('Sucesso', 'Seu contrato foi pausado. Seus horários estão congelados!');
                setModalDetalhes(false);
             } catch(e) {
                Alert.alert('Erro', 'Não foi possível pausar.');
             }
          }
        },
        {
          text: 'Continuar Cancelamento',
          style: 'destructive',
          onPress: () => {
             const mensagem = comMulta
               ? `Fidelidade: Você será cobrado uma multa proporcional. Deseja mesmo cancelar?`
               : `Deseja realmente cancelar definitivamente o contrato?`;

             Alert.alert(
               'Atenção',
               mensagem,
               [
                 { text: 'Voltar', style: 'cancel' },
                 {
                   text: 'Sim, Cancelar',
                   style: 'destructive',
                   onPress: async () => {
                     try {
                       await updateDoc(doc(db, 'contratosRecorrentes', contrato.id), {
                         status: 'CANCELADO',
                         canceladoEm: serverTimestamp(),
                         atualizadoEm: serverTimestamp(),
                         motivoCancelamento: comMulta ? 'Fidelidade descumprida' : 'Solicitação do cliente'
                       });

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

                       Alert.alert('Sucesso', 'Cancelado com sucesso.');
                       setModalDetalhes(false);
                     } catch (error) {
                       Alert.alert('Erro', 'Não foi possível cancelar o contrato');
                     }
                   }
                 }
               ]
             );
          }
        },
        { text: 'Voltar', style: 'cancel' }
      ]
    );
  };

  const getProximoVencimentoText = (data) => {
    if (!data) return 'N/A';
    return format(data, 'dd/MM/yyyy', { locale: ptBR });
  };

  const reativarContrato = async (contrato) => {
    Alert.alert(
      'Reativar Assinatura',
      'Bem-vindo de volta! Deseja descongelar sua assinatura e retomar seus horários?',
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Sim, Reativar',
          style: 'default',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'contratosRecorrentes', contrato.id), {
                 status: 'ATIVO',
                 atualizadoEm: serverTimestamp()
              });
              Alert.alert('Sucesso', 'Sua assinatura está ATIVA novamente!');
              setModalDetalhes(false);
            } catch(e) {
              Alert.alert('Erro', 'Não foi possível reativar a assinatura.');
            }
          }
        }
      ]
    );
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
        <ImageBackground 
          source={{ uri: item.profissional?.fotoCapa || 'https://via.placeholder.com/400x150/F8FAFC/94A3B8?text=Agenda+Serviços' }}
          style={styles.cardBanner}
        >
          <View style={styles.bannerOverlay}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + 'E6' }]}>
              <Ionicons name={statusConfig.icon} size={14} color="#FFF" />
              <Text style={[styles.statusText, { color: '#FFF' }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Image 
              source={{ uri: item.profissional?.fotoPerfil || 'https://via.placeholder.com/150/E2E8F0/64748B?text=👤' }}
              style={styles.avatarFoto}
            />
            <View style={styles.profissionalInfo}>
              <Text style={styles.profissionalNome}>
                {item.profissional?.nome || 'Profissional'}
              </Text>
              <Text style={styles.planoNome}>{item.plano?.nome}</Text>
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
        </View>
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
                <View style={styles.acoesSection}>
                  <TouchableOpacity
                    style={styles.acaoWhatsappButton}
                    onPress={abrirWhatsApp}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                    <Text style={styles.acaoWhatsappText}>
                      Remarcar / Falar no WhatsApp
                    </Text>
                  </TouchableOpacity>

                  {contratoSelecionado.status === 'ATIVO' && (
                    <TouchableOpacity
                      style={styles.cancelarButton}
                      onPress={() => cancelarContrato(contratoSelecionado)}
                    >
                      <Ionicons name="pause-circle" size={20} color="#E63946" />
                      <Text style={styles.cancelarButtonText}>
                        Pausar ou Cancelar
                      </Text>
                    </TouchableOpacity>
                  )}

                  {contratoSelecionado.status === 'PAUSADO' && (
                    <TouchableOpacity
                      style={[styles.cancelarButton, { backgroundColor: '#E0F2FE', borderColor: '#38BDF8', marginTop: 10 }]}
                      onPress={() => reativarContrato(contratoSelecionado)}
                    >
                      <Ionicons name="play-circle" size={20} color="#0284C7" />
                      <Text style={[styles.cancelarButtonText, { color: '#0284C7' }]}>
                        Reativar Assinatura
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 56,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardBanner: {
    height: 90,
    width: '100%',
    backgroundColor: colors.primary,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'flex-end',
    padding: 12,
  },
  cardContent: {
    padding: 20,
    paddingTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: -35, // Puxa pra cima da capa
  },
  avatarFoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  profissionalInfo: {
    flex: 1,
    marginTop: 35, // Compensa o push up
  },
  profissionalNome: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  planoNome: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  cardBody: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 10,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  buscarButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buscarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    paddingBottom: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    padding: 24,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  sectionSubvalue: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
  },
  planoDetalhes: {
    flexDirection: 'row',
    marginTop: 10,
  },
  planoDetalhe: {
    fontSize: 14,
    color: '#475569',
    marginRight: 16,
    fontWeight: '500',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 20,
  },
  progressoItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressoNumero: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  progressoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  noAgendamentos: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  agendamentoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  agendamentoPassado: {
    opacity: 0.5,
  },
  agendamentoCancelado: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  agendamentoData: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 12,
    minWidth: 64,
  },
  agendamentoDiaSemana: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '800',
  },
  agendamentoDiaNumero: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginTop: 2,
  },
  agendamentoMes: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
    marginTop: 2,
  },
  agendamentoInfo: {
    flex: 1,
    marginLeft: 16,
  },
  agendamentoHora: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  agendamentoStatus: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  agendamentoRemarcado: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  remarcarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  remarcarText: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '700',
  },
  acoesSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 24,
    paddingBottom: 24,
  },
  cancelarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF0F2',
  },
  cancelarButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#E63946',
  },
  acaoWhatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#25D366',
    marginBottom: 12,
  },
  acaoWhatsappText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  }
});
