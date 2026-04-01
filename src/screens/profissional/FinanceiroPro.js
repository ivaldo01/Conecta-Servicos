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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';

import colors from '../../constants/colors';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useUsuario } from '../../hooks/useUsuario';
import { solicitarSaqueProfissional } from '../../services/paymentService';

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

function parseNumero(valor) {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) ? numero : 0;
}

function getValorBruto(item) {
  return parseNumero(
    item?.valorBruto ??
    item?.valorCobrado ??
    item?.valorOriginal ??
    item?.valorTotal ??
    item?.valor ??
    0
  );
}

function getValorLiquido(item) {
  const liquidoDireto = parseNumero(
    item?.valorLiquidoProfissional ??
    item?.valorLiquido ??
    0
  );

  if (liquidoDireto > 0) return liquidoDireto;

  const bruto = getValorBruto(item);
  const taxa = parseNumero(item?.taxaPlataforma ?? 0);

  if (taxa > 0 && bruto > 0) {
    return Math.max(0, bruto - taxa);
  }

  return bruto;
}

function getStatusPagamento(item) {
  return String(item?.status || item?.statusPagamento || item?.gatewayStatus || '').toLowerCase();
}

function getSaqueStatusLabel(status) {
  switch (status) {
    case 'pago':
      return 'Pago';
    case 'processando':
    case 'processing':
    case 'pending':
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
    case 'processing':
    case 'pending':
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
  const { usuario: authUser, loadingAuth } = useAuth();
  const { dadosUsuario, loadingUsuario } = useUsuario(authUser?.uid);

  const usuario = useMemo(
    () => ({
      ...(authUser || {}),
      ...(dadosUsuario || {}),
    }),
    [authUser, dadosUsuario]
  );

  const ehColaborador = useMemo(() => {
    if (usuario?.perfil === 'colaborador') return true;
    if (dadosUsuario?.perfil === 'colaborador') return true;
    if (usuario?.clinicaId && usuario?.clinicaId !== usuario?.uid && !usuario?.cnpj) {
      return true;
    }
    return false;
  }, [usuario, dadosUsuario]);

  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [saques, setSaques] = useState([]);
  const [saldoConta, setSaldoConta] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalBancoVisible, setModalBancoVisible] = useState(false);
  const [valorSaque, setValorSaque] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [loadingSaque, setLoadingSaque] = useState(false);

  const [dadosBancarios, setDadosBancarios] = useState({
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: 'corrente',
    chavePixPerfil: '',
  });
  const [loadingBanco, setLoadingBanco] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  useEffect(() => {
    if (!usuario?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let iniciouSaldo = false;
    let iniciouProfissional = false;
    let iniciouClinica = false;
    let iniciouColaborador = false;
    let iniciouSaques = false;
    let iniciouEquipe = false;

    let pagamentosProfissional = [];
    let pagamentosClinica = [];
    let pagamentosColaborador = [];
    let saquesAtuais = [];

    function atualizarLoading() {
      if (
        iniciouSaldo &&
        iniciouProfissional &&
        iniciouClinica &&
        iniciouColaborador &&
        iniciouSaques &&
        (ehColaborador || iniciouEquipe)
      ) {
        setLoading(false);
      }
    }

    function atualizarPagamentos() {
      const mapa = new Map();

      [
        ...pagamentosProfissional,
        ...pagamentosClinica,
        ...pagamentosColaborador,
      ].forEach((item) => {
        mapa.set(item.id, item);
      });

      setPagamentos(Array.from(mapa.values()));
    }

    const saldoRef = doc(db, 'saldos', usuario.uid);
    const unsubSaldo = onSnapshot(
      saldoRef,
      (snap) => {
        setSaldoConta(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        iniciouSaldo = true;
        atualizarLoading();
      },
      (error) => {
        console.log('Erro ao ouvir saldo:', error);
        setSaldoConta(null);
        iniciouSaldo = true;
        atualizarLoading();
      }
    );

    // Carregar dados bancários do perfil
    const carregarDadosBancarios = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'usuarios', usuario.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setDadosBancarios({
            banco: data.banco || '',
            agencia: data.agencia || '',
            conta: data.conta || '',
            tipoConta: data.tipoConta || 'corrente',
            chavePixPerfil: data.chavePix || data.pixAddressKey || '',
          });
        }
      } catch (e) {
        console.log('Erro ao carregar dados bancários:', e);
      }
    };
    carregarDadosBancarios();

    // Carregar lista de colaboradores se for gestor
    if (!ehColaborador) {
      const qColabs = query(collection(db, 'usuarios', usuario.uid, 'colaboradores'));
      const unsubColabs = onSnapshot(qColabs, (snap) => {
        setColaboradores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        iniciouEquipe = true;
        atualizarLoading();
      });
    }

    const unsubProfissional = onSnapshot(
      query(collection(db, 'pagamentos'), where('profissionalId', '==', usuario.uid)),
      (snap) => {
        pagamentosProfissional = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        atualizarPagamentos();
        iniciouProfissional = true;
        atualizarLoading();
      },
      (error) => {
        console.log('Erro ao ouvir pagamentos por profissionalId:', error);
        pagamentosProfissional = [];
        atualizarPagamentos();
        iniciouProfissional = true;
        atualizarLoading();
      }
    );

    const unsubClinica = onSnapshot(
      query(collection(db, 'pagamentos'), where('clinicaId', '==', usuario.uid)),
      (snap) => {
        pagamentosClinica = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        atualizarPagamentos();
        iniciouClinica = true;
        atualizarLoading();
      },
      (error) => {
        console.log('Erro ao ouvir pagamentos por clinicaId:', error);
        pagamentosClinica = [];
        atualizarPagamentos();
        iniciouClinica = true;
        atualizarLoading();
      }
    );

    const unsubColaborador = onSnapshot(
      query(collection(db, 'pagamentos'), where('colaboradorId', '==', usuario.uid)),
      (snap) => {
        pagamentosColaborador = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        atualizarPagamentos();
        iniciouColaborador = true;
        atualizarLoading();
      },
      (error) => {
        console.log('Erro ao ouvir pagamentos por colaboradorId:', error);
        pagamentosColaborador = [];
        atualizarPagamentos();
        iniciouColaborador = true;
        atualizarLoading();
      }
    );

    const unsubSaques = onSnapshot(
      query(collection(db, 'saques'), where('profissionalId', '==', usuario.uid)),
      (snap) => {
        saquesAtuais = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        setSaques(saquesAtuais);
        iniciouSaques = true;
        atualizarLoading();
      },
      (error) => {
        console.log('Erro ao ouvir saques:', error);
        saquesAtuais = [];
        setSaques([]);
        iniciouSaques = true;
        atualizarLoading();
      }
    );

    return () => {
      unsubSaldo?.();
      unsubProfissional?.();
      unsubClinica?.();
      unsubColaborador?.();
      unsubSaques?.();
    };
  }, [usuario?.uid, ehColaborador]);

  useEffect(() => {
    if (!usuario?.uid) {
      setAgendamentos([]);
      return;
    }

    let agendamentosProfissional = [];
    let agendamentosClinica = [];
    let agendamentosColaborador = [];

    function atualizarAgendamentos() {
      const mapa = new Map();

      [
        ...agendamentosProfissional,
        ...agendamentosClinica,
        ...agendamentosColaborador,
      ].forEach((item) => {
        mapa.set(item.id, item);
      });

      setAgendamentos(Array.from(mapa.values()));
    }

    const unsubAgendaProfissional = onSnapshot(
      query(collection(db, 'agendamentos'), where('profissionalId', '==', usuario.uid)),
      (snap) => {
        agendamentosProfissional = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        atualizarAgendamentos();
      },
      (error) => {
        console.log('Erro ao ouvir agendamentos por profissionalId:', error);
        agendamentosProfissional = [];
        atualizarAgendamentos();
      }
    );

    const unsubAgendaColaborador = onSnapshot(
      query(collection(db, 'agendamentos'), where('colaboradorId', '==', usuario.uid)),
      (snap) => {
        agendamentosColaborador = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
        atualizarAgendamentos();
      },
      (error) => {
        console.log('Erro ao ouvir agendamentos por colaboradorId:', error);
        agendamentosColaborador = [];
        atualizarAgendamentos();
      }
    );

    const unsubAgendaClinica = !ehColaborador
      ? onSnapshot(
        query(collection(db, 'agendamentos'), where('clinicaId', '==', usuario.uid)),
        (snap) => {
          agendamentosClinica = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
          atualizarAgendamentos();
        },
        (error) => {
          console.log('Erro ao ouvir agendamentos por clinicaId:', error);
          agendamentosClinica = [];
          atualizarAgendamentos();
        }
      )
      : null;

    return () => {
      unsubAgendaProfissional?.();
      unsubAgendaColaborador?.();
      unsubAgendaClinica?.();
    };
  }, [usuario?.uid, ehColaborador]);

  const rendimentosPorColaborador = useMemo(() => {
    if (ehColaborador) return [];

    const rendimentos = {};

    // Inicializa com zero para todos os colaboradores da equipe
    colaboradores.forEach(c => {
      rendimentos[c.id] = {
        nome: c.nome || 'Sem nome',
        total: 0,
        servicos: 0,
        id: c.id
      };
    });

    // Inclui o próprio gestor se ele realiza serviços
    if (usuario?.uid) {
      rendimentos[usuario.uid] = {
        nome: usuario?.nome || usuario?.nomeNegocio || 'Conta principal',
        total: 0,
        servicos: 0,
        id: usuario.uid
      };
    }

    pagamentos.forEach(p => {
      const status = getStatusPagamento(p);
      if (status === 'pago' || status === 'received' || status === 'confirmed') {
        const valor = getValorBruto(p);
        const colabId = p.colaboradorId || p.profissionalId;

        if (colabId && rendimentos[colabId]) {
          rendimentos[colabId].total += valor;
          rendimentos[colabId].servicos += 1;
        } else if (colabId) {
          // Se for um colaborador que não está na lista (ex: removido)
          rendimentos[colabId] = {
            nome: p.colaboradorNome || 'Profissional Externo',
            total: valor,
            servicos: 1,
            id: colabId
          };
        }
      }
    });

    return Object.values(rendimentos).sort((a, b) => b.total - a.total);
  }, [pagamentos, colaboradores, usuario, ehColaborador]);

  const resumo = useMemo(() => {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    let totalRecebido = 0;
    let recebidoHoje = 0;
    let recebidoMes = 0;
    let cobrancasGeradas = 0;
    let cobrancasPagas = 0;
    let cobrancasCanceladas = 0;
    let cobrancasVencidas = 0;
    let valorEmAberto = 0;

    const agendamentosConcluidosIds = new Set(
      agendamentos
        .filter((item) => String(item?.status || '').toLowerCase() === 'concluido')
        .map((item) => item.id)
    );

    const pagamentosConsiderados = ehColaborador
      ? pagamentos.filter((item) => agendamentosConcluidosIds.has(item?.agendamentoId || item?.id))
      : pagamentos;

    pagamentosConsiderados.forEach((item) => {
      const status = getStatusPagamento(item);
      const valorBruto = getValorBruto(item);
      const valorLiquido = getValorLiquido(item);
      const valorConsiderado = ehColaborador ? valorLiquido : valorBruto;

      if (
        status === 'gerada' ||
        status === 'pending' ||
        status === 'aguardando_cobranca'
      ) {
        cobrancasGeradas += 1;
        valorEmAberto += valorBruto;
      }

      if (status === 'pago' || status === 'received' || status === 'confirmed') {
        cobrancasPagas += 1;
        totalRecebido += valorConsiderado;

        const dataPagamento =
          typeof item?.confirmadoEm?.toDate === 'function'
            ? item.confirmadoEm.toDate()
            : typeof item?.pagoEm?.toDate === 'function'
              ? item.pagoEm.toDate()
              : item?.confirmadoEm
                ? new Date(item.confirmadoEm)
                : item?.pagoEm
                  ? new Date(item.pagoEm)
                  : null;

        if (dataPagamento instanceof Date && !Number.isNaN(dataPagamento.getTime())) {
          if (dataPagamento >= inicioHoje) {
            recebidoHoje += valorConsiderado;
          }

          if (dataPagamento >= inicioMes) {
            recebidoMes += valorConsiderado;
          }
        }
      }

      if (status === 'cancelado' || status === 'canceled') {
        cobrancasCanceladas += 1;
      }

      if (status === 'vencido' || status === 'overdue') {
        cobrancasVencidas += 1;
      }
    });

    const saldoDisponivelFirestore = parseNumero(saldoConta?.saldoDisponivel ?? 0);
    const saldoPendenteFirestore = parseNumero(saldoConta?.saldoPendente ?? 0);
    const saldoBloqueadoFirestore = parseNumero(saldoConta?.saldoBloqueado ?? 0);

    const saldoDisponivelFallback = pagamentos
      .filter((item) => ['pago', 'received', 'confirmed'].includes(getStatusPagamento(item)))
      .reduce((acc, item) => acc + getValorLiquido(item), 0);

    const saldoDisponivel =
      saldoConta ? saldoDisponivelFirestore : saldoDisponivelFallback;

    const saldoPendente = saldoConta ? saldoPendenteFirestore : 0;
    const saldoBloqueado = saldoConta ? saldoBloqueadoFirestore : 0;

    const totalSacado = saques
      .filter((item) => String(item?.status || '').toLowerCase() === 'pago')
      .reduce(
        (acc, item) =>
          acc +
          parseNumero(item?.valorAprovado ?? item?.valorSolicitado ?? item?.valor ?? 0),
        0
      );

    const saquesSolicitados = saques
      .filter((item) => {
        const status = String(item?.status || '').toLowerCase();
        return status === 'solicitado' || status === 'processando' || status === 'pending';
      })
      .reduce(
        (acc, item) =>
          acc +
          parseNumero(item?.valorSolicitado ?? item?.valor ?? 0),
        0
      );

    const ticketMedio = cobrancasPagas > 0 ? totalRecebido / cobrancasPagas : 0;

    const listaComparativo = ehColaborador
      ? [
        { label: 'Recebido hoje', valor: recebidoHoje },
        { label: 'Recebido no mês', valor: recebidoMes },
        { label: 'Total recebido', valor: totalRecebido },
        { label: 'Em aberto', valor: valorEmAberto },
      ]
      : [
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
      valorEmAberto,
      cobrancasGeradas,
      cobrancasPagas,
      cobrancasCanceladas,
      cobrancasVencidas,
      ticketMedio,
      dadosGrafico,
      saqueAutomaticoEm: saldoConta?.saqueAutomaticoEm || null,
      ultimaLiberacaoEm: saldoConta?.ultimaLiberacaoEm || null,
    };
  }, [pagamentos, agendamentos, saques, saldoConta, ehColaborador]);

  const ultimasCobrancas = useMemo(() => {
    return [...pagamentos]
      .sort((a, b) => {
        const dataA =
          typeof a?.atualizadoEm?.toDate === 'function'
            ? a.atualizadoEm.toDate().getTime()
            : typeof a?.criadoEm?.toDate === 'function'
              ? a.criadoEm.toDate().getTime()
              : 0;

        const dataB =
          typeof b?.atualizadoEm?.toDate === 'function'
            ? b.atualizadoEm.toDate().getTime()
            : typeof b?.criadoEm?.toDate === 'function'
              ? b.criadoEm.toDate().getTime()
              : 0;

        return dataB - dataA;
      })
      .slice(0, 6);
  }, [pagamentos]);

  const ultimosSaques = useMemo(() => {
    return [...saques]
      .sort((a, b) => {
        const dataA =
          typeof a?.solicitadoEm?.toDate === 'function'
            ? a.solicitadoEm.toDate().getTime()
            : typeof a?.criadoEm?.toDate === 'function'
              ? a.criadoEm.toDate().getTime()
              : 0;

        const dataB =
          typeof b?.solicitadoEm?.toDate === 'function'
            ? b.solicitadoEm.toDate().getTime()
            : typeof b?.criadoEm?.toDate === 'function'
              ? b.criadoEm.toDate().getTime()
              : 0;

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

    if (valor < 10) {
      Alert.alert('Valor mínimo', 'O valor mínimo para saque é R$ 10,00.');
      return;
    }

    if (valor > resumo.saldoDisponivel) {
      Alert.alert(
        'Saldo insuficiente',
        'O valor solicitado é maior do que o seu saldo disponível.'
      );
      return;
    }

    if (!chavePix || String(chavePix).trim().length < 5) {
      Alert.alert('Chave Pix inválida', 'Informe uma chave Pix válida.');
      return;
    }

    try {
      setLoadingSaque(true);

      await solicitarSaqueProfissional({
        valor,
        pixAddressKey: chavePix.trim(),
      });

      setModalVisible(false);
      setValorSaque('');
      setChavePix('');

      Alert.alert(
        'Saque solicitado',
        'Solicitação enviada com sucesso. O valor foi reservado para saque.'
      );
    } catch (error) {
      console.log('Erro ao solicitar saque:', error);
      Alert.alert(
        'Erro',
        error?.message || 'Não foi possível registrar a solicitação de saque.'
      );
    } finally {
      setLoadingSaque(false);
    }
  }

  async function salvarDadosBancarios() {
    if (!dadosBancarios.banco || !dadosBancarios.agencia || !dadosBancarios.conta) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha Banco, Agência e Conta.');
      return;
    }

    try {
      setLoadingBanco(true);
      const userRef = doc(db, 'usuarios', usuario.uid);
      await updateDoc(userRef, {
        banco: dadosBancarios.banco.trim(),
        agencia: dadosBancarios.agencia.trim(),
        conta: dadosBancarios.conta.trim(),
        tipoConta: dadosBancarios.tipoConta,
        chavePix: dadosBancarios.chavePixPerfil.trim(),
        pixAddressKey: dadosBancarios.chavePixPerfil.trim(),
        updatedAt: serverTimestamp(),
      });

      setModalBancoVisible(false);
      Alert.alert('Sucesso', 'Dados bancários atualizados com sucesso!');
    } catch (error) {
      console.log('Erro ao salvar dados bancários:', error);
      Alert.alert('Erro', 'Não foi possível salvar os dados bancários.');
    } finally {
      setLoadingBanco(false);
    }
  }

  async function exportarRelatorioFinanceiro() {
    try {
      setLoadingExport(true);

      const totalBruto = resumo.totalRecebido;
      const totalTaxas = pagamentos.reduce((acc, p) => {
        const status = getStatusPagamento(p);
        if (status === 'pago' || status === 'received' || status === 'confirmed') {
          return acc + (getValorBruto(p) - getValorLiquido(p));
        }
        return acc;
      }, 0);
      const totalLiquido = totalBruto - totalTaxas;

      const pagamentosHTML = pagamentos
        .filter(p => {
          const status = getStatusPagamento(p);
          return status === 'pago' || status === 'received' || status === 'confirmed';
        })
        .sort((a, b) => {
          const dataA = a?.confirmadoEm?.toDate?.() || new Date(0);
          const dataB = b?.confirmadoEm?.toDate?.() || new Date(0);
          return dataB - dataA;
        })
        .map(p => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-size: 11px;">${formatDateBR(p.confirmadoEm || p.pagoEm)}</td>
            <td style="padding: 10px; font-size: 11px;">${p.clienteNome || 'Cliente'}</td>
            <td style="padding: 10px; font-size: 11px;">${p.colaboradorNome || 'Eu'}</td>
            <td style="padding: 10px; font-size: 11px; text-align: right;">${formatCurrency(getValorBruto(p))}</td>
            <td style="padding: 10px; font-size: 11px; text-align: right; color: #d32f2f;">-${formatCurrency(getValorBruto(p) - getValorLiquido(p))}</td>
            <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: bold; color: #2e7d32;">${formatCurrency(getValorLiquido(p))}</td>
          </tr>
        `).join('');

      const equipeHTML = rendimentosPorColaborador.map(c => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
          <span>${c.nome}</span>
          <span style="font-weight: bold;">${formatCurrency(c.total)}</span>
        </div>
      `).join('');

      const saquesHTML = saques
        .sort((a, b) => {
          const dataA = a?.solicitadoEm?.toDate?.() || new Date(0);
          const dataB = b?.solicitadoEm?.toDate?.() || new Date(0);
          return dataB - dataA;
        })
        .map(s => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; font-size: 11px;">${formatDateBR(s.solicitadoEm || s.criadoEm)}</td>
            <td style="padding: 10px; font-size: 11px;">${s.pixAddressKey || s.chavePix || 'Não informada'}</td>
            <td style="padding: 10px; font-size: 11px; text-align: center;">
              <span style="padding: 2px 8px; border-radius: 10px; background: #eee; font-size: 9px; font-weight: bold;">
                ${String(s.status || 'pendente').toUpperCase()}
              </span>
            </td>
            <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: bold;">${formatCurrency(s.valor || s.valorSolicitado || 0)}</td>
          </tr>
        `).join('');

      const html = `
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid ${colors.primary}; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: ${colors.primary}; }
            .summary-box { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px; flex-wrap: wrap; gap: 10px; }
            .summary-item { text-align: center; flex: 1; min-width: 120px; }
            .summary-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
            .summary-value { font-size: 16px; font-weight: bold; }
            .section-title { font-size: 14px; font-weight: bold; margin: 25px 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid #eee; color: ${colors.primary}; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f4f4f4; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
            .total-balance-box { margin-top: 20px; padding: 15px; background: ${colors.primary}; color: #fff; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">RELATÓRIO FINANCEIRO DETALHADO</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">Período: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
          </div>

          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Total Bruto</div>
              <div class="summary-value">${formatCurrency(totalBruto)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Taxas Plataforma</div>
              <div class="summary-value" style="color: #d32f2f;">-${formatCurrency(totalTaxas)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Líquido</div>
              <div class="summary-value" style="color: #2e7d32;">${formatCurrency(totalLiquido)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Saldo Atual</div>
              <div class="summary-value" style="color: ${colors.primary};">${formatCurrency(resumo.saldoDisponivel)}</div>
            </div>
          </div>

          ${!ehColaborador ? `
            <div class="section-title">RENDIMENTOS POR EQUIPE</div>
            <div style="background: #fff; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
              ${equipeHTML}
            </div>
          ` : ''}

          <div class="section-title">DETALHAMENTO DE TRANSAÇÕES</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Profissional</th>
                <th style="text-align: right;">Bruto</th>
                <th style="text-align: right;">Taxas</th>
                <th style="text-align: right;">Líquido</th>
              </tr>
            </thead>
            <tbody>
              ${pagamentosHTML}
            </tbody>
          </table>

          ${saques.length > 0 ? `
            <div class="section-title">SOLICITAÇÕES DE SAQUE</div>
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Chave Pix</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${saquesHTML}
              </tbody>
            </table>
          ` : ''}

          <div class="total-balance-box">
            <span style="font-weight: bold; text-transform: uppercase; font-size: 12px;">Saldo Disponível para Saque</span>
            <span style="font-size: 20px; font-weight: bold;">${formatCurrency(resumo.saldoDisponivel)}</span>
          </div>

          <div class="footer">
            Relatório gerado em ${new Date().toLocaleString('pt-BR')} por ${usuario.nome || 'Gestor'}<br/>
            Sistema Conecta Serviços - Gestão Financeira Inteligente
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Relatório Financeiro' });
    } catch (error) {
      console.log('Erro ao exportar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório financeiro.');
    } finally {
      setLoadingExport(false);
    }
  }

  if (loadingAuth || loadingUsuario || loading) {
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
              {ehColaborador
                ? 'Veja apenas seus resultados e histórico de atendimentos'
                : 'Acompanhe saldos, cobranças e solicitações de saque'}
            </Text>
          </View>

          {!ehColaborador && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={exportarRelatorioFinanceiro} style={styles.refreshButton} disabled={loadingExport}>
                {loadingExport ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalBancoVisible(true)} style={styles.refreshButton}>
                <Ionicons name="settings-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.refreshButton}>
                <Ionicons name="cash-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!ehColaborador && rendimentosPorColaborador.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rendimentos por Equipe</Text>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
            </View>

            <View style={styles.colabsList}>
              {rendimentosPorColaborador.map((colab) => (
                <View key={colab.id} style={styles.colabFinanceCard}>
                  <View style={styles.colabFinanceLeft}>
                    <View style={styles.colabAvatar}>
                      <Text style={styles.colabAvatarText}>{colab.nome.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.colabName}>{colab.nome}</Text>
                      <Text style={styles.colabMeta}>{colab.servicos} serviços este mês</Text>
                    </View>
                  </View>
                  <View style={styles.colabFinanceRight}>
                    <Text style={styles.colabValue}>{formatCurrency(colab.total)}</Text>
                    <View style={styles.miniProgressContainer}>
                      <View
                        style={[
                          styles.miniProgressBar,
                          { width: `${Math.min(100, (colab.total / (resumo.totalRecebido || 1)) * 100)}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.mainCard}>
          <Text style={styles.cardLabel}>{ehColaborador ? 'Rendimentos recebidos' : 'Saldo disponível'}</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(ehColaborador ? resumo.totalRecebido : resumo.saldoDisponivel)}
          </Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Ionicons name={ehColaborador ? "stats-chart-outline" : "wallet-outline"} size={20} color="#FFF" />
            <Text style={styles.subText}>
              {ehColaborador
                ? `${resumo.cobrancasPagas} serviço(s) concluído(s) já pagos para você`
                : `${formatCurrency(resumo.saquesSolicitados)} em saques solicitados`}
            </Text>
          </View>

          {!ehColaborador && !!resumo.saqueAutomaticoEm && (
            <Text style={styles.nextTransferText}>
              Saque automático previsto: {formatDateBR(resumo.saqueAutomaticoEm)}
            </Text>
          )}
        </View>

        {!ehColaborador && (
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
        )}

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
            label={ehColaborador ? 'Total já recebido' : 'Total recebido'}
            value={formatCurrency(resumo.totalRecebido)}
            subtitle={ehColaborador ? `${resumo.cobrancasPagas} serviço(s) concluído(s) pagos` : `${resumo.cobrancasPagas} cobrança(s) paga(s)`}
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
          {ehColaborador ? (
            <InfoMiniCard
              icon="cash-outline"
              label="Em aberto"
              value={formatCurrency(resumo.valorEmAberto)}
              subtitle="cobranças aguardando pagamento"
            />
          ) : (
            <InfoMiniCard
              icon="card-outline"
              label="Total sacado"
              value={formatCurrency(resumo.totalSacado)}
              subtitle={`${ultimosSaques.filter((item) => String(item.status).toLowerCase() === 'pago').length} saque(s) pagos`}
            />
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {ehColaborador ? 'Comparativo dos resultados' : 'Comparativo dos saldos'}
          </Text>

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

        {!ehColaborador && (
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
                const statusColor = getSaqueStatusColor(String(item?.status || '').toLowerCase());

                return (
                  <View key={item.id} style={styles.saqueCard}>
                    <View style={styles.saqueLeft}>
                      <View style={[styles.saqueIconWrap, { backgroundColor: `${statusColor}15` }]}>
                        <Ionicons name="arrow-up-circle-outline" size={18} color={statusColor} />
                      </View>

                      <View style={styles.saqueTextBox}>
                        <Text style={styles.saqueTitle}>
                          {formatCurrency(
                            item?.valor ??
                            item?.valorSolicitado ??
                            item?.valorAprovado ??
                            0
                          )}
                        </Text>
                        <Text style={styles.saqueSubtitle}>
                          {item?.pixAddressKey || item?.chavePix
                            ? `Chave Pix: ${item?.pixAddressKey || item?.chavePix}`
                            : 'Chave Pix não informada'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.saqueRight}>
                      <Text style={[styles.saqueStatus, { color: statusColor }]}>
                        {getSaqueStatusLabel(String(item?.status || '').toLowerCase())}
                      </Text>
                      <Text style={styles.saqueDate}>
                        {formatDateBR(item?.solicitadoEm || item?.criadoEm)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

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
                    {item?.data || item?.dataAgendamento || 'Data não informada'} às{' '}
                    {item?.horario || item?.horarioAgendamento || '--:--'}
                  </Text>
                  <Text style={styles.atendimentoMeta}>
                    {(item?.formaPagamentoLabel || item?.formaPagamento || 'Pix')} • {getStatusPagamento(item)}
                  </Text>
                </View>

                <Text style={styles.atendimentoValor}>
                  {formatCurrency(getValorBruto(item))}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={22} color="#856404" />
          <Text style={styles.tipText}>
            {ehColaborador ? (
              'Esta subconta mostra apenas os seus rendimentos, atualizados automaticamente conforme os pagamentos recebidos nos serviços concluídos por você. Saques e saldo principal seguem sob gestão da conta superior.'
            ) : (
              <>
                Agora o financeiro usa o documento de saldo como fonte principal. Quando o pagamento
                for confirmado pelo webhook, o valor líquido deve aparecer em
                <Text style={styles.tipBold}> saldo disponível</Text>.
              </>
            )}
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
              style={[
                styles.modalButton,
                (loadingSaque || resumo.saldoDisponivel <= 0) && { opacity: 0.7 },
              ]}
              onPress={solicitarSaque}
              disabled={loadingSaque || resumo.saldoDisponivel <= 0}
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

      <Modal visible={modalBancoVisible} transparent animationType="slide" onRequestClose={() => setModalBancoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dados Bancários</Text>
              <TouchableOpacity onPress={() => setModalBancoVisible(false)}>
                <Ionicons name="close-outline" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.inputLabel}>Banco</Text>
              <TextInput
                value={dadosBancarios.banco}
                onChangeText={(text) => setDadosBancarios(prev => ({ ...prev, banco: text }))}
                placeholder="Ex: Nubank, Itaú..."
                style={styles.input}
                placeholderTextColor="#999"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Agência</Text>
                  <TextInput
                    value={dadosBancarios.agencia}
                    onChangeText={(text) => setDadosBancarios(prev => ({ ...prev, agencia: text }))}
                    placeholder="0001"
                    keyboardType="numeric"
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.inputLabel}>Conta</Text>
                  <TextInput
                    value={dadosBancarios.conta}
                    onChangeText={(text) => setDadosBancarios(prev => ({ ...prev, conta: text }))}
                    placeholder="12345-6"
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Chave Pix para Saques</Text>
              <TextInput
                value={dadosBancarios.chavePixPerfil}
                onChangeText={(text) => setDadosBancarios(prev => ({ ...prev, chavePixPerfil: text }))}
                placeholder="CPF, E-mail ou Celular"
                style={styles.input}
                placeholderTextColor="#999"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, loadingBanco && { opacity: 0.7 }]}
              onPress={salvarDadosBancarios}
              disabled={loadingBanco}
            >
              {loadingBanco ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFF" />
                  <Text style={styles.modalButtonText}>Salvar Dados</Text>
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

  nextTransferText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
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

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  colabsList: {
    gap: 12,
  },

  colabFinanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },

  colabFinanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  colabAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  colabAvatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  colabName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  colabMeta: {
    fontSize: 11,
    color: '#6C757D',
    marginTop: 2,
  },

  colabFinanceRight: {
    alignItems: 'flex-end',
    width: 100,
  },

  colabValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },

  miniProgressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },

  miniProgressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
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