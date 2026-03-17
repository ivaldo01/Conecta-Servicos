import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import colors from '../../constants/colors';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateBR(value) {
  if (!value) return '—';

  try {
    if (typeof value?.toDate === 'function') {
      return value.toDate().toLocaleString('pt-BR');
    }

    if (value instanceof Date) {
      return value.toLocaleString('pt-BR');
    }

    if (typeof value === 'string') {
      return value;
    }

    return '—';
  } catch {
    return '—';
  }
}

function normalizarSaldoStatus(item) {
  if (item?.saldoStatus) return item.saldoStatus;

  if (item?.status === 'pago') return 'pendente_liberacao';
  if (item?.status === 'cancelado') return 'bloqueado';
  if (item?.status === 'vencido') return 'bloqueado';

  return 'sem_saldo';
}

function getSaqueStatusLabel(status) {
  switch (status) {
    case 'pago':
      return 'Pago';
    case 'processando':
      return 'Processando';
    case 'cancelado':
      return 'Cancelado';
    case 'solicitado':
    default:
      return 'Solicitado';
  }
}

function getSaqueStatusColor(status) {
  switch (status) {
    case 'pago':
      return '#1E8E3E';
    case 'processando':
      return '#1565C0';
    case 'cancelado':
      return '#6C757D';
    case 'solicitado':
    default:
      return '#E67E22';
  }
}

function InfoMiniCard({ icon, label, value, subtitle }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={styles.smallValue}>{value}</Text>
      {!!subtitle && <Text style={styles.smallSub}>{subtitle}</Text>}
    </View>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function FinanceiroPro() {
  const { usuario, loadingAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState([]);
  const [saques, setSaques] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [valorSaque, setValorSaque] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [loadingSaque, setLoadingSaque] = useState(false);

  useEffect(() => {
    if (!usuario?.uid) {
      setLoading(false);
      return;
    }

    let finalizados = 0;
    const resultados = {
      profissional: [],
      clinica: [],
      colaborador: [],
      saques: [],
    };

    const concluirCarga = () => {
      finalizados += 1;
      if (finalizados >= 4) {
        const mapa = new Map();

        [...resultados.profissional, ...resultados.clinica, ...resultados.colaborador].forEach((item) => {
          mapa.set(item.id, item);
        });

        setPagamentos(Array.from(mapa.values()));
        setSaques(resultados.saques);
        setLoading(false);
      }
    };

    const unsubProfissional = onSnapshot(
      query(collection(db, 'pagamentos'), where('profissionalId', '==', usuario.uid)),
      (snap) => {
        resultados.profissional = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        concluirCarga();
      },
      (error) => {
        console.log('Erro ao ouvir pagamentos por profissionalId:', error);
        resultados.profissional = [];
        concluirCarga();
      }
    );

    const unsubClinica = onSnapshot(
      query(collection(db, 'pagamentos'), where('clinicaId', '==', usuario.uid)),
      (snap) => {
        resultados.clinica = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        concluirCarga();
      },
      (error) => {
        console.log('Erro ao ouvir pagamentos por clinicaId:', error);
        resultados.clinica = [];
        concluirCarga();
      }
    );

    const unsubColaborador = onSnapshot(
      query(collection(db, 'pagamentos'), where('colaboradorId', '==', usuario.uid)),
      (snap) => {
        resultados.colaborador = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        concluirCarga();
      },
      (error) => {
        console.log('Erro ao ouvir pagamentos por colaboradorId:', error);
        resultados.colaborador = [];
        concluirCarga();
      }
    );

    const unsubSaques = onSnapshot(
      query(collection(db, 'saques'), where('profissionalId', '==', usuario.uid)),
      (snap) => {
        resultados.saques = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        concluirCarga();
      },
      (error) => {
        console.log('Erro ao ouvir saques:', error);
        resultados.saques = [];
        concluirCarga();
      }
    );

    return () => {
      unsubProfissional?.();
      unsubClinica?.();
      unsubColaborador?.();
      unsubSaques?.();
    };
  }, [usuario?.uid]);

  const resumo = useMemo(() => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    let totalRecebido = 0;
    let recebidoHoje = 0;
    let recebidoMes = 0;

    let saldoDisponivel = 0;
    let saldoPendente = 0;
    let saldoBloqueado = 0;

    let cobrancasGeradas = 0;
    let cobrancasPagas = 0;
    let cobrancasCanceladas = 0;
    let cobrancasVencidas = 0;

    pagamentos.forEach((item) => {
      const valorLiquido =
        Number(item?.valorLiquido ?? item?.valorCobrado ?? item?.valorOriginal ?? 0);

      const valorBruto =
        Number(item?.valorCobrado ?? item?.valorOriginal ?? item?.valorLiquido ?? 0);

      const saldoStatus = normalizarSaldoStatus(item);

      if (item?.status === 'gerada') cobrancasGeradas += 1;
      if (item?.status === 'pago') cobrancasPagas += 1;
      if (item?.status === 'cancelado') cobrancasCanceladas += 1;
      if (item?.status === 'vencido') cobrancasVencidas += 1;

      if (item?.status === 'pago') {
        totalRecebido += valorBruto;

        const dataPagamento =
          typeof item?.pagoEm?.toDate === 'function'
            ? item.pagoEm.toDate()
            : item?.pagoEm
            ? new Date(item.pagoEm)
            : null;

        if (dataPagamento instanceof Date && !Number.isNaN(dataPagamento.getTime())) {
          if (dataPagamento >= inicioHoje) {
            recebidoHoje += valorBruto;
          }

          if (dataPagamento >= inicioMes) {
            recebidoMes += valorBruto;
          }
        }

        if (saldoStatus === 'disponivel') {
          saldoDisponivel += valorLiquido;
        } else if (saldoStatus === 'pendente_liberacao') {
          saldoPendente += valorLiquido;
        } else if (saldoStatus === 'bloqueado') {
          saldoBloqueado += valorLiquido;
        }
      }

      if (item?.status === 'cancelado' || item?.status === 'vencido') {
        saldoBloqueado += valorLiquido;
      }
    });

    const totalSacado = saques
      .filter((item) => item?.status === 'pago')
      .reduce((acc, item) => acc + Number(item?.valorAprovado ?? item?.valorSolicitado ?? 0), 0);

    const saquesSolicitados = saques
      .filter((item) => item?.status === 'solicitado' || item?.status === 'processando')
      .reduce((acc, item) => acc + Number(item?.valorSolicitado ?? 0), 0);

    const ticketMedio = cobrancasPagas > 0 ? totalRecebido / cobrancasPagas : 0;

    const listaComparativo = [
      { label: 'Saldo disponível', valor: saldoDisponivel },
      { label: 'Saldo pendente', valor: saldoPendente },
      { label: 'Saldo sacado', valor: totalSacado },
      { label: 'Saldo bloqueado', valor: saldoBloqueado },
    ];

    const maiorValor = Math.max(...listaComparativo.map((item) => item.valor), 1);

    const dadosGrafico = listaComparativo.map((item) => ({
      ...item,
      percentual: Math.max(8, Math.round((item.valor / maiorValor) * 100)),
    }));

    return {
      totalRecebido,
      recebidoHoje,
      recebidoMes,
      saldoDisponivel,
      saldoPendente,
      saldoBloqueado,
      totalSacado,
      saquesSolicitados,
      cobrancasGeradas,
      cobrancasPagas,
      cobrancasCanceladas,
      cobrancasVencidas,
      ticketMedio,
      dadosGrafico,
    };
  }, [pagamentos, saques]);

  const ultimasCobrancas = useMemo(() => {
    return [...pagamentos]
      .sort((a, b) => {
        const dataA =
          typeof a?.atualizadoEm?.toDate === 'function' ? a.atualizadoEm.toDate().getTime() : 0;
        const dataB =
          typeof b?.atualizadoEm?.toDate === 'function' ? b.atualizadoEm.toDate().getTime() : 0;

        return dataB - dataA;
      })
      .slice(0, 6);
  }, [pagamentos]);

  const ultimosSaques = useMemo(() => {
    return [...saques]
      .sort((a, b) => {
        const dataA =
          typeof a?.criadoEm?.toDate === 'function' ? a.criadoEm.toDate().getTime() : 0;
        const dataB =
          typeof b?.criadoEm?.toDate === 'function' ? b.criadoEm.toDate().getTime() : 0;

        return dataB - dataA;
      })
      .slice(0, 6);
  }, [saques]);

  async function solicitarSaque() {
    const valor = Number(String(valorSaque).replace(',', '.'));

    if (!valor || valor <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor válido para o saque.');
      return;
    }

    if (valor > resumo.saldoDisponivel) {
      Alert.alert(
        'Saldo insuficiente',
        'O valor solicitado é maior do que o seu saldo disponível.'
      );
      return;
    }

    try {
      setLoadingSaque(true);

      const saqueRef = doc(collection(db, 'saques'));

      await setDoc(saqueRef, {
        profissionalId: usuario?.uid || null,
        profissionalNome: usuario?.nome || usuario?.nomeCompleto || 'Profissional',
        valorSolicitado: valor,
        valorAprovado: 0,
        status: 'solicitado',
        chavePix: chavePix || '',
        metodo: 'pix',
        observacao: 'Solicitação criada pelo profissional no painel financeiro.',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        pagoEm: null,
        canceladoEm: null,
      });

      setModalVisible(false);
      setValorSaque('');
      setChavePix('');

      Alert.alert(
        'Saque solicitado',
        'Sua solicitação foi registrada. Depois vamos ligar isso ao banco para o saque automático.'
      );
    } catch (error) {
      console.log('Erro ao solicitar saque:', error);
      Alert.alert('Erro', 'Não foi possível registrar a solicitação de saque.');
    } finally {
      setLoadingSaque(false);
    }
  }

  if (loadingAuth || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando financeiro...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Financeiro</Text>
            <Text style={styles.subtitle}>
              Acompanhe saldos, cobranças e solicitações de saque
            </Text>
          </View>

          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.refreshButton}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.cardLabel}>Saldo disponível</Text>
          <Text style={styles.totalValue}>{formatCurrency(resumo.saldoDisponivel)}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Ionicons name="wallet-outline" size={20} color="#FFF" />
            <Text style={styles.subText}>
              {formatCurrency(resumo.saquesSolicitados)} em saques solicitados
            </Text>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.ctaButton, styles.ctaPrimary]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
            <Text style={styles.ctaPrimaryText}>Solicitar saque</Text>
          </TouchableOpacity>

          <View style={styles.ctaSecondary}>
            <Text style={styles.ctaSecondaryLabel}>Saldo pendente</Text>
            <Text style={styles.ctaSecondaryValue}>{formatCurrency(resumo.saldoPendente)}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoMiniCard
            icon="today-outline"
            label="Recebido hoje"
            value={formatCurrency(resumo.recebidoHoje)}
            subtitle="pagamentos confirmados"
          />
          <InfoMiniCard
            icon="calendar-outline"
            label="Recebido no mês"
            value={formatCurrency(resumo.recebidoMes)}
            subtitle="entradas do mês"
          />
          <InfoMiniCard
            icon="checkmark-done-circle-outline"
            label="Total recebido"
            value={formatCurrency(resumo.totalRecebido)}
            subtitle={`${resumo.cobrancasPagas} cobrança(s) paga(s)`}
          />
          <InfoMiniCard
            icon="trending-up-outline"
            label="Ticket médio"
            value={formatCurrency(resumo.ticketMedio)}
            subtitle="por cobrança paga"
          />
          <InfoMiniCard
            icon="time-outline"
            label="Pendentes"
            value={String(resumo.cobrancasGeradas)}
            subtitle="aguardando pagamento"
          />
          <InfoMiniCard
            icon="card-outline"
            label="Total sacado"
            value={formatCurrency(resumo.totalSacado)}
            subtitle={`${ultimosSaques.filter((item) => item.status === 'pago').length} saque(s) pagos`}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Comparativo dos saldos</Text>

          {resumo.dadosGrafico.map((item) => (
            <View key={item.label} style={styles.barItem}>
              <View style={styles.barHeader}>
                <Text style={styles.barLabel}>{item.label}</Text>
                <Text style={styles.barValue}>{formatCurrency(item.valor)}</Text>
              </View>

              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${item.percentual}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Saques recentes</Text>

          {ultimosSaques.length === 0 ? (
            <EmptyState
              icon="cash-outline"
              title="Nenhum saque solicitado"
              subtitle="Quando você solicitar um saque, ele aparecerá aqui."
            />
          ) : (
            ultimosSaques.map((item) => {
              const statusColor = getSaqueStatusColor(item?.status);

              return (
                <View key={item.id} style={styles.saqueCard}>
                  <View style={styles.saqueLeft}>
                    <View style={[styles.saqueIconWrap, { backgroundColor: `${statusColor}15` }]}>
                      <Ionicons name="arrow-up-circle-outline" size={18} color={statusColor} />
                    </View>

                    <View style={styles.saqueTextBox}>
                      <Text style={styles.saqueTitle}>
                        {formatCurrency(item?.valorSolicitado || 0)}
                      </Text>
                      <Text style={styles.saqueSubtitle}>
                        {item?.chavePix ? `Chave Pix: ${item.chavePix}` : 'Chave Pix não informada'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.saqueRight}>
                    <Text style={[styles.saqueStatus, { color: statusColor }]}>
                      {getSaqueStatusLabel(item?.status)}
                    </Text>
                    <Text style={styles.saqueDate}>{formatDateBR(item?.criadoEm)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Últimas cobranças</Text>

          {ultimasCobrancas.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="Nenhuma cobrança encontrada"
              subtitle="Quando você gerar cobranças, elas aparecerão aqui."
            />
          ) : (
            ultimasCobrancas.map((item) => (
              <View key={item.id} style={styles.atendimentoCard}>
                <View style={styles.atendimentoAvatar}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                </View>

                <View style={styles.atendimentoContent}>
                  <Text style={styles.atendimentoCliente}>
                    {item?.clienteNome || 'Cliente'}
                  </Text>
                  <Text style={styles.atendimentoInfo}>
                    {item?.dataAgendamento || 'Data não informada'} às {item?.horarioAgendamento || '--:--'}
                  </Text>
                  <Text style={styles.atendimentoMeta}>
                    {item?.formaPagamentoLabel || 'Pix'} • {item?.status || 'gerada'}
                  </Text>
                </View>

                <Text style={styles.atendimentoValor}>
                  {formatCurrency(item?.valorCobrado || 0)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={22} color="#856404" />
          <Text style={styles.tipText}>
            Nesta fase, cobranças com status <Text style={styles.tipBold}>pago</Text> entram no
            financeiro. O saque já pode ser solicitado no app, e depois vamos ligar isso à API do banco.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solicitar saque</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>
              Saldo disponível: {formatCurrency(resumo.saldoDisponivel)}
            </Text>

            <Text style={styles.inputLabel}>Valor do saque</Text>
            <TextInput
              value={valorSaque}
              onChangeText={setValorSaque}
              placeholder="Ex: 50.00"
              keyboardType="decimal-pad"
              style={styles.input}
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Chave Pix</Text>
            <TextInput
              value={chavePix}
              onChangeText={setChavePix}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              style={styles.input}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.modalButton, loadingSaque && { opacity: 0.7 }]}
              onPress={solicitarSaque}
              disabled={loadingSaque}
            >
              {loadingSaque ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="arrow-up-circle-outline" size={18} color="#FFF" />
                  <Text style={styles.modalButtonText}>Confirmar solicitação</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },

  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },

  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },

  mainCard: {
    backgroundColor: colors.primary,
    padding: 25,
    borderRadius: 22,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    marginBottom: 14,
  },

  cardLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  totalValue: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: 'bold',
    marginVertical: 10,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginVertical: 15,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  subText: {
    color: '#FFF',
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
  },

  ctaRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 10,
  },

  ctaButton: {
    flex: 1.1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 10,
  },

  ctaPrimary: {
    backgroundColor: '#1E8E3E',
  },

  ctaPrimaryText: {
    color: '#FFF',
    fontWeight: '800',
    marginLeft: 8,
  },

  ctaSecondary: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },

  ctaSecondaryLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
  },

  ctaSecondaryValue: {
    fontSize: 16,
    color: colors.textDark,
    fontWeight: '800',
    marginTop: 4,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  infoCard: {
    backgroundColor: '#FFF',
    width: '48%',
    padding: 18,
    borderRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 14,
  },

  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
    marginTop: 10,
  },

  smallValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
  },

  smallSub: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },

  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 14,
  },

  barItem: {
    marginBottom: 14,
  },

  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  barLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },

  barValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
  },

  barTrack: {
    height: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 999,
    overflow: 'hidden',
  },

  barFill: {
    height: 12,
    backgroundColor: colors.primary,
    borderRadius: 999,
  },

  atendimentoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  atendimentoAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  atendimentoContent: {
    flex: 1,
    marginLeft: 12,
  },

  atendimentoCliente: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  atendimentoInfo: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  atendimentoMeta: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 3,
    fontWeight: '600',
  },

  atendimentoValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 10,
  },

  saqueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  saqueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  saqueIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saqueTextBox: {
    flex: 1,
    marginLeft: 10,
  },

  saqueTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  saqueSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 3,
  },

  saqueRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  saqueStatus: {
    fontSize: 12,
    fontWeight: '800',
  },

  saqueDate: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
  },

  tipCard: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 14,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },

  tipText: {
    color: '#856404',
    marginLeft: 10,
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },

  tipBold: {
    fontWeight: 'bold',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
  },

  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
    textAlign: 'center',
  },

  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },

  modalHint: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },

  inputLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
  },

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
    color: colors.textDark,
  },

  modalButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  modalButtonText: {
    color: '#FFF',
    fontWeight: '800',
    marginLeft: 8,
  },
});
