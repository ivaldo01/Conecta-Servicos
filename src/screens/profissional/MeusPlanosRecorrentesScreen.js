import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
  Modal,
  ScrollView,
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
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import colors from '../../constants/colors';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function MeusPlanosRecorrentesScreen({ navigation }) {
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [contratosPorPlano, setContratosPorPlano] = useState({});
  const [modalAssinantes, setModalAssinantes] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [expandedContratoId, setExpandedContratoId] = useState(null);
  const [salvandoSessao, setSalvandoSessao] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Buscar planos do profissional
    const q = query(
      collection(db, 'planosRecorrentes'),
      where('profissionalId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const planosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlanos(planosData);
      setCarregando(false);

      // Para cada plano, buscar quantos contratos ativos
      planosData.forEach(plano => {
        buscarContratosAtivos(plano.id);
      });
    });

    return () => unsubscribe();
  }, []);

  const buscarContratosAtivos = async (planoId) => {
    const q = query(
      collection(db, 'contratosRecorrentes'),
      where('planoId', '==', planoId),
      where('status', 'in', ['ATIVO', 'PENDENTE_PAGAMENTO'])
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const contratos = await Promise.all(snapshot.docs.map(async docContrato => {
        const data = docContrato.data();
        let clienteNome = 'Cliente Retornado';
        let clienteTelefone = 'Não informado';
        
        if (data.clienteId) {
          const userDoc = await getDoc(doc(db, 'usuarios', data.clienteId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            clienteNome = userData.nome || userData.nomeCompleto || 'Cliente';
            clienteTelefone = userData.whatsapp || userData.telefone || 'Não informado';
          }
        }
        return { id: docContrato.id, ...data, clienteNome, clienteTelefone };
      }));

      setContratosPorPlano(prev => ({
        ...prev,
        [planoId]: contratos
      }));
    });

    return unsubscribe;
  };

  const toggleStatusPlano = async (planoId, novoStatus) => {
    try {
      const planoRef = doc(db, 'planosRecorrentes', planoId);
      await updateDoc(planoRef, {
        ativo: novoStatus,
        atualizadoEm: serverTimestamp()
      });
      
      Alert.alert(
        'Sucesso',
        `Plano ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar o status do plano');
    }
  };

  const abrirWhatsApp = (telefone, clienteNome, planoNome) => {
    if (!telefone || telefone === 'Não informado') {
      Alert.alert('Ops', 'O cliente não possui telefone cadastrado.');
      return;
    }
    const numeroLimpo = telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Olá ${clienteNome}! Tudo bem? Sou o profissional referente à sua assinatura do plano "${planoNome}". Gostaria de conversar com você!`);
    Linking.openURL(`https://wa.me/55${numeroLimpo}?text=${mensagem}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    });
  };

  const registrarSessaoConcluida = (contrato) => {
    Alert.alert(
      'Registrar Presença',
      `Deseja marcar uma sessão como concluída para ${contrato.clienteNome}? (Isso atualizará o progresso do cliente)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            try {
              setSalvandoSessao(true);
              const contratoRef = doc(db, 'contratosRecorrentes', contrato.id);
              await updateDoc(contratoRef, {
                sessoesRealizadas: (contrato.sessoesRealizadas || 0) + 1,
                sessoesRestantesMesAtual: Math.max(0, (contrato.sessoesRestantesMesAtual || 1) - 1),
                atualizadoEm: serverTimestamp()
              });
              Alert.alert('Sucesso', 'Sessão registrada com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao registrar sessão.');
            } finally {
              setSalvandoSessao(false);
            }
          }
        }
      ]
    );
  };

  const excluirPlano = (plano) => {
    const listaContratos = contratosPorPlano[plano.id] || [];
    const contratosAtivos = listaContratos.length;
    
    if (contratosAtivos > 0) {
      Alert.alert(
        'Atenção',
        `Este plano possui ${contratosAtivos} contrato(s) ativo(s). Não é possível excluir. Desative o plano para não receber novas contratações.`
      );
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir o plano "${plano.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'planosRecorrentes', plano.id));
              Alert.alert('Sucesso', 'Plano excluído com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o plano');
            }
          }
        }
      ]
    );
  };

  const formatarHorarios = (horarios) => {
    if (!horarios || horarios.length === 0) return '';
    
    return horarios.map(h => {
      const dia = DIAS_SEMANA[h.diaSemana];
      return `${dia} ${h.hora}`;
    }).join(' • ');
  };

  const renderPlano = ({ item }) => {
    const listaContratos = contratosPorPlano[item.id] || [];
    const contratosAtivos = listaContratos.length;
    
    return (
      <View style={[styles.card, !item.ativo && styles.cardInativo]}>
        {/* Header do Card */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{item.nome}</Text>
            {item.descricao ? (
              <Text style={styles.cardDescricao}>{item.descricao}</Text>
            ) : null}
          </View>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText,
              item.ativo ? styles.statusAtivo : styles.statusInativo
            ]}>
              {item.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>

        {/* Informações */}
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Valor: </Text>
              R$ {item.valorMensal?.toFixed(2).replace('.', ',')}/mês
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Sessões: </Text>
              {item.sessoesPorMes}x por mês ({item.duracaoMinutos}min)
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Horários: </Text>
              {formatarHorarios(item.horariosFixos)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Fidelidade: </Text>
              {item.duracaoMinimaMeses} meses • {item.toleranciaRemarcacao} remarcações/mês
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Clientes: </Text>
              {contratosAtivos} contrato(s) ativo(s)
            </Text>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.cardActions}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Disponível</Text>
            <Switch
              value={item.ativo}
              onValueChange={(value) => toggleStatusPlano(item.id, value)}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor={item.ativo ? colors.white : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => excluirPlano(item)}
          >
            <Ionicons name="trash" size={20} color="#E63946" />
          </TouchableOpacity>
        </View>

        {/* Botão Ver Assinantes */}
        <TouchableOpacity 
          style={styles.btnVerAssinantes}
          onPress={() => {
            setPlanoSelecionado(item);
            setModalAssinantes(true);
          }}
        >
          <Ionicons name="people" size={18} color={colors.white} />
          <Text style={styles.btnVerAssinantesText}>Ver Assinantes ({contratosAtivos})</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Planos Recorrentes</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Botão Criar Novo */}
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => navigation.navigate('CriarPlanoRecorrente')}
      >
        <Ionicons name="add-circle" size={24} color={colors.white} />
        <Text style={styles.createButtonText}>Criar Novo Plano</Text>
      </TouchableOpacity>

      {/* Lista de Planos */}
      <FlatList
        data={planos}
        keyExtractor={item => item.id}
        renderItem={renderPlano}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={() => {}}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhum plano criado</Text>
            <Text style={styles.emptyText}>
              Crie planos recorrentes para oferecer pacotes mensais com horários fixos aos seus clientes
            </Text>
          </View>
        }
      />

      {/* Modal Ver Assinantes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalAssinantes}
        onRequestClose={() => {
          setModalAssinantes(false);
          setExpandedContratoId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assinantes Ativos</Text>
                <Text style={styles.modalSubtitle}>{planoSelecionado?.nome}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalAssinantes(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {planoSelecionado && contratosPorPlano[planoSelecionado.id]?.length > 0 ? (
                contratosPorPlano[planoSelecionado.id].map(contrato => {
                  const isExpanded = expandedContratoId === contrato.id;
                  return (
                    <TouchableOpacity 
                      key={contrato.id} 
                      style={[styles.assinanteCard, isExpanded && styles.assinanteCardExpanded]}
                      activeOpacity={0.8}
                      onPress={() => setExpandedContratoId(isExpanded ? null : contrato.id)}
                    >
                      <View style={styles.assinanteHeader}>
                        <View style={styles.assinanteAvatar}>
                          <Ionicons name="person" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.assinanteNome}>{contrato.clienteNome}</Text>
                          <Text style={styles.assinanteTelefone}>{contrato.clienteTelefone}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: contrato.status === 'ATIVO' ? '#E8F5E9' : '#FFF3E0' }]}>
                          <Text style={[styles.statusText, { color: contrato.status === 'ATIVO' ? '#2E7D32' : '#F57C00' }]}>
                            {contrato.status === 'ATIVO' ? 'Ativo' : 'Pendente'}
                          </Text>
                        </View>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color="#94A3B8" 
                          style={{ marginLeft: 8 }}
                        />
                      </View>

                      {isExpanded && (
                        <View style={styles.assinanteExpandedBody}>
                          <View style={styles.assinanteDetalhes}>
                            <Text style={styles.assinanteInfoText}>
                              <Text style={{ fontWeight: '600' }}>Ingresso:</Text> {contrato.dataInicio?.toDate ? contrato.dataInicio.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                            </Text>
                            <Text style={styles.assinanteInfoText}>
                              <Text style={{ fontWeight: '600' }}>Horários:</Text> {formatarHorarios(contrato.horariosFixos)}
                            </Text>
                            <Text style={styles.assinanteInfoText}>
                              <Text style={{ fontWeight: '600' }}>Progresso:</Text> {contrato.sessoesRealizadas || 0} de {contrato.sessoesTotaisContrato || 0} sessões
                            </Text>
                          </View>

                          <View style={styles.assinanteAcoes}>
                            <TouchableOpacity 
                              style={styles.acaoCheckinButton}
                              onPress={() => registrarSessaoConcluida(contrato)}
                            >
                              <Ionicons name="checkmark-done-circle" size={20} color={colors.white} />
                              <Text style={styles.acaoCheckinText}>Check-in de Sessão</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={styles.acaoWhatsappButton}
                              onPress={() => abrirWhatsApp(contrato.clienteTelefone, contrato.clienteNome, planoSelecionado.nome)}
                            >
                              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                              <Text style={styles.acaoWhatsappText}>Falar / Remarcar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>Nenhum assinante</Text>
                  <Text style={styles.emptyText}>Este plano ainda não possui clientes ativos.</Text>
                </View>
              )}
            </ScrollView>
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardInativo: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  cardDescricao: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusAtivo: {
    color: '#2E7D32',
  },
  statusInativo: {
    color: '#757575',
  },
  cardInfo: {
    padding: 16,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textDark,
    marginLeft: 8,
    flex: 1,
  },
  infoLabel: {
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: colors.textDark,
    marginRight: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
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
  btnVerAssinantes: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  btnVerAssinantesText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
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
    paddingBottom: 20,
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
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  modalBody: {
    padding: 24,
  },
  assinanteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  assinanteCardExpanded: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  assinanteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assinanteExpandedBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  assinanteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assinanteNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  assinanteTelefone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  assinanteDetalhes: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  assinanteInfoText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  assinanteAcoes: {
    flexDirection: 'column',
    gap: 10,
  },
  acaoCheckinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
  },
  acaoCheckinText: {
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  acaoWhatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#25D366',
  },
  acaoWhatsappText: {
    color: '#25D366',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  }
});
