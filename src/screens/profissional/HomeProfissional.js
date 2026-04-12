import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    onSnapshot,
    or,
    writeBatch,
    deleteDoc,
    updateDoc,
} from 'firebase/firestore';
import { Alert } from 'react-native';
import AdBanner from '../../components/AdBanner';
import NativeAdCard from '../../components/NativeAdCard';
import TutorialOnboarding from '../../components/TutorialOnboarding';
import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import { temAnuncios, getMaxFuncionarios } from '../../constants/plans';
import { getHojeStr as getHojeFiltroStr, isAtendendoAgora } from '../../utils/agendamentoUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_WIDTH = Math.min(SCREEN_WIDTH - 44, 300);
const HERO_HEIGHT = 250;

function getHojeExibicaoStr() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function parseNumero(valor) {
    const numero = Number(valor || 0);
    return Number.isFinite(numero) ? numero : 0;
}

function getNomeProfissional(dadosUsuario) {
    return (
        dadosUsuario?.nome ||
        dadosUsuario?.nomeNegocio ||
        dadosUsuario?.nomeFantasia ||
        'Profissional'
    );
}

function getResumoFinanceiro(agendamentos = []) {
    const concluidos = agendamentos.filter((item) => item?.status === 'concluido');
    const total = concluidos.reduce((acc, item) => {
        return acc + parseNumero(item?.valorTotal || item?.valor || 0);
    }, 0);
    return total;
}

function getCorStatus(status) {
    switch (status) {
        case 'confirmado': return '#16A34A';
        case 'pendente': return '#D97706';
        case 'concluido': return colors.primary;
        case 'cancelado': return '#DC2626';
        case 'recusado': return '#DC2626';
        default: return '#6B7280';
    }
}

function HeroSlide({ usuario }) {
    return (
        <View style={[styles.heroSlide, { width: HERO_WIDTH, height: HERO_HEIGHT }]}>
            {/* Círculos decorativos de fundo */}
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />

            <View style={styles.heroTopRow}>
                <View style={styles.heroTextArea}>
                    <Text style={styles.heroGreeting}>Bem-vindo de volta</Text>
                    <Text style={styles.heroTitle}>
                        {getNomeProfissional(usuario)} 👋
                    </Text>
                    <Text style={styles.heroDescription}>
                        Organize sua agenda, acompanhe seus ganhos e visualize seus próximos atendimentos.
                    </Text>
                </View>

                <View style={styles.heroIconBox}>
                    <Ionicons name="briefcase-outline" size={28} color="#FFF" />
                </View>
            </View>

            <View style={styles.heroBadge}>
                <Ionicons name="star-outline" size={12} color="#FFF" />
                <Text style={styles.heroBadgeText}>Painel profissional</Text>
            </View>
        </View>
    );
}

function SummarySlide({ pendentes, confirmadosHoje, concluidos }) {
    return (
        <View style={[styles.heroSlide, styles.heroSlideDark, { width: HERO_WIDTH, height: HERO_HEIGHT }]}>
            <View style={styles.heroCircle1Dark} />

            <View style={styles.summaryTop}>
                <View style={styles.summaryIconBox}>
                    <Ionicons name="analytics-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.summaryTitle}>Resumo do dia</Text>
            </View>

            <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                    <View style={[styles.summaryDot, { backgroundColor: '#FBBF24' }]} />
                    <Text style={styles.summaryLabel}>Pendentes</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#FBBF24' }]}>{pendentes}</Text>
            </View>

            <View style={styles.summaryRow}>
                <View style={styles.summaryRowLeft}>
                    <View style={[styles.summaryDot, { backgroundColor: '#34D399' }]} />
                    <Text style={styles.summaryLabel}>Confirmados hoje</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#34D399' }]}>{confirmadosHoje}</Text>
            </View>

            <View style={styles.summaryRowNoBorder}>
                <View style={styles.summaryRowLeft}>
                    <View style={[styles.summaryDot, { backgroundColor: '#93C5FD' }]} />
                    <Text style={styles.summaryLabel}>Concluídos</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#93C5FD' }]}>{concluidos}</Text>
            </View>
        </View>
    );
}

export default function HomeProfissional({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [usuario, setUsuario] = useState(null);
    const [agendamentos, setAgendamentos] = useState([]);
    const [proximos, setProximos] = useState([]);
    const [heroIndex, setHeroIndex] = useState(0);
    const [totalNotificacoesNaoLidas, setTotalNotificacoesNaoLidas] = useState(0);
    const [showTutorial, setShowTutorial] = useState(false);

    const heroRef = useRef(null);
    const hojeStr = useMemo(() => getHojeExibicaoStr(), []);
    const hojeFiltro = useMemo(() => getHojeFiltroStr(), []);

    const [configAgenda, setConfigAgenda] = useState(null);
    const [statusAtendimento, setStatusAtendimento] = useState({ atendendo: false, manual: false });

    // Cálculos para o resumo do dia
    const pendentes = useMemo(() =>
        agendamentos.filter(a => a.status === 'pendente').length
        , [agendamentos]);

    const confirmadosHoje = useMemo(() =>
        agendamentos.filter(a => a.status === 'confirmado' && a.dataFiltro === hojeFiltro).length
        , [agendamentos, hojeFiltro]);

    const concluidos = useMemo(() =>
        agendamentos.filter(a => a.status === 'concluido').length
        , [agendamentos]);

    const agendamentosHoje = useMemo(() => 
        agendamentos.filter(a => a.dataFiltro === hojeFiltro)
    , [agendamentos, hojeFiltro]);

    const faturamentoTotal = useMemo(() => 
        getResumoFinanceiro(agendamentos)
    , [agendamentos]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(
            collection(db, 'usuarios', user.uid, 'notificacoes'),
            (snapshot) => {
                const total = snapshot.docs.filter((item) => !item.data()?.lida).length;
                setTotalNotificacoesNaoLidas(total);
            }
        );

        return () => unsubscribe();
    }, []);

    // Verifica se deve mostrar o tutorial para novos profissionais
    useEffect(() => {
        const verificarTutorial = async () => {
            try {
                const user = auth.currentUser;
                if (!user?.uid) return;

                const userRef = doc(db, 'usuarios', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    // Se nunca viu o tutorial e é profissional, mostra o tutorial
                    if (!userData.tutorialVisto && (userData.tipo === 'profissional' || userData.tipo === 'clinica')) {
                        setTimeout(() => {
                            setShowTutorial(true);
                        }, 1000);
                    }
                }
            } catch (error) {
                console.log('Erro ao verificar tutorial:', error);
            }
        };

        verificarTutorial();
    }, []);

    useEffect(() => {
        let ativo = true;

        async function carregarDono() {
            try {
                const user = auth.currentUser;
                if (!user?.uid) return;

                const userRef = doc(db, 'usuarios', user.uid);
                const userSnap = await getDoc(userRef);

                if (ativo && userSnap.exists()) {
                    setUsuario(userSnap.data());
                }
            } catch (error) {
                console.log('Erro ao carregar dados do usuário:', error);
            }
        }

        carregarDono();
        const user = auth.currentUser;
        let unsubAgendamentos = null;
        let unsubAgenda = null;

        if (user?.uid) {
            const q = query(
                collection(db, 'agendamentos'),
                or(
                    where('profissionalId', '==', user.uid),
                    where('clinicaId', '==', user.uid),
                    where('colaboradorId', '==', user.uid)
                )
            );

            unsubAgendamentos = onSnapshot(q, (snapshot) => {
                const mapa = new Map();
                snapshot.forEach((docSnap) => {
                    mapa.set(docSnap.id, {
                        id: docSnap.id,
                        ...docSnap.data(),
                    });
                });

                const lista = Array.from(mapa.values());
                lista.sort((a, b) => {
                    const dataA = a?.dataCriacao?.seconds || 0;
                    const dataB = b?.dataCriacao?.seconds || 0;
                    return dataB - dataA;
                });

                const proximosOrdenados = [...lista]
                    .filter((item) => item?.status !== 'cancelado' && item?.status !== 'recusado')
                    .slice(0, 5);

                if (ativo) {
                    setAgendamentos(lista);
                    setProximos(proximosOrdenados);
                    setLoading(false);
                }
            }, (error) => {
                console.log('Erro no listener de agendamentos:', error);
                if (ativo) setLoading(false);
            });
            unsubAgenda = onSnapshot(doc(db, "usuarios", user.uid, "configuracoes", "agenda"), (snap) => {
                if (snap.exists()) {
                    setConfigAgenda(snap.data());
                }
            });
        } else {
            setLoading(false);
        }

        return () => {
            ativo = false;
            if (unsubAgenda) unsubAgenda();
            if (unsubAgendamentos) unsubAgendamentos();
        };

    }, []);

    // Calcula o status de atendimento em tempo real
    useEffect(() => {
        if (!usuario) return;

        const calcularStatus = () => {
            const manual = usuario.statusManual !== undefined;
            let atendendo = false;

            if (manual) {
                atendendo = usuario.statusManual;
            } else if (configAgenda) {
                atendendo = isAtendendoAgora(configAgenda);
            }

            setStatusAtendimento({ atendendo, manual });

            // Sincroniza o campo 'atendendo' no Firestore para que o cliente veja
            if (usuario.atendendo !== atendendo) {
                const userRef = doc(db, 'usuarios', auth.currentUser.uid);
                updateDoc(userRef, { atendendo }).catch(e => console.log('Erro ao sincronizar status:', e));
            }
        };

        calcularStatus();
        const interval = setInterval(calcularStatus, 60000); // Recalcula a cada minuto

        return () => clearInterval(interval);
    }, [usuario, configAgenda]);

    // Limpa horários que ficaram "travados" na coleção agenda_ocupada
    const limparHorariosPresos = async () => {
        try {
            const user = auth.currentUser;
            if (!user?.uid) return;

            Alert.alert(
                "Limpar Agenda",
                "Isso irá liberar todos os horários que podem estar 'travados' indevidamente por tentativas de agendamento não concluídas. Deseja continuar?",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Sim, Limpar",
                        onPress: async () => {
                            setLoading(true);
                            try {
                                const q = query(
                                    collection(db, 'agenda_ocupada'),
                                    where('clinicaId', '==', user.uid)
                                );
                                const snap = await getDocs(q);

                                if (snap.empty) {
                                    Alert.alert("Info", "Não foram encontrados horários travados.");
                                    setLoading(false);
                                    return;
                                }

                                const batch = writeBatch(db);
                                snap.forEach(d => batch.delete(d.ref));
                                await batch.commit();

                                Alert.alert("Sucesso", `${snap.size} horário(s) foram liberados com sucesso!`);
                            } catch (err) {
                                console.log('Erro ao limpar horários:', err);
                                Alert.alert("Erro", "Não foi possível limpar os horários.");
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.log('Erro ao disparar limpeza:', error);
        }
    };

    const toggleStatusManual = async () => {
        try {
            const userRef = doc(db, 'usuarios', auth.currentUser.uid);
            const novoStatusManual = !statusAtendimento.atendendo;

            await updateDoc(userRef, {
                statusManual: novoStatusManual,
                atendendo: novoStatusManual
            });

            // O onSnapshot do carregarDados (ou o do usuario se houvesse) iria atualizar, 
            // mas como usuario vem de getDoc inicial, vamos atualizar localmente o usuario
            setUsuario(prev => ({ ...prev, statusManual: novoStatusManual, atendendo: novoStatusManual }));
        } catch (error) {
            console.log('Erro ao alternar status manual:', error);
        }
    };

    const voltarParaAutomatico = async () => {
        try {
            const userRef = doc(db, 'usuarios', auth.currentUser.uid);
            const { deleteField } = await import('firebase/firestore');

            await updateDoc(userRef, {
                statusManual: deleteField(),
                // O useEffect vai recalcular o 'atendendo' logo em seguida
            });

            setUsuario(prev => {
                const novo = { ...prev };
                delete novo.statusManual;
                return novo;
            });
        } catch (error) {
            console.log('Erro ao voltar para automático:', error);
        }
    };


    const heroItems = useMemo(() => ([
        { tipo: 'hero', id: 'hero-main' },
        { tipo: 'ad', id: 'hero-ad-1' },
        { tipo: 'summary', id: 'hero-summary' },
        { tipo: 'ad', id: 'hero-ad-2' },
    ]), []);

    useEffect(() => {
        if (!heroItems.length) return;

        const interval = setInterval(() => {
            setHeroIndex((prev) => {
                const next = (prev + 1) % heroItems.length;
                heroRef.current?.scrollTo({
                    x: next * (HERO_WIDTH + 12),
                    animated: true,
                });
                return next;
            });
        }, 3500);

        return () => clearInterval(interval);
    }, [heroItems]);

    const atalhos = useMemo(() => {
        const base = [
            {
                id: 'agenda',
                titulo: 'Agenda',
                subtitulo: 'Gerencie atendimentos',
                icon: 'calendar-outline',
                cor: colors.primary,
                bg: '#EEF3FF',
                onPress: () => navigation.navigate('AgendaProfissional'),
            },
            {
                id: 'configAgenda',
                titulo: 'Minha Agenda',
                subtitulo: 'Dias e horários',
                icon: 'time-outline',
                cor: '#0F172A',
                bg: '#F1F5F9',
                onPress: () => navigation.navigate('ConfigurarAgenda'),
            },
            {
                id: 'servicos',
                titulo: 'Serviços',
                subtitulo: 'O que você oferece',
                icon: 'construct-outline',
                cor: '#7C3AED',
                bg: '#F3EEFF',
                onPress: () => navigation.navigate('ConfigurarServicos'),
            },
            {
                id: 'financeiro',
                titulo: 'Financeiro',
                subtitulo: 'Ganhos e saques',
                icon: 'wallet-outline',
                cor: '#16A34A',
                bg: '#EEF9F1',
                onPress: () => navigation.navigate('FinanceiroPro'),
            },
            {
                id: 'perfil',
                titulo: 'Perfil',
                subtitulo: 'Seu perfil público',
                icon: 'person-outline',
                cor: '#D97706',
                bg: '#FFF6E8',
                onPress: () => navigation.navigate('Perfil'),
            },
            {
                id: 'planosRecorrentes',
                titulo: 'Planos Recorrentes',
                subtitulo: 'Assinaturas mensais',
                icon: 'repeat-outline',
                cor: '#10B981',
                bg: '#ECFDF5',
                onPress: () => navigation.navigate('MeusPlanosRecorrentes'),
            },
        ];

        // Se não for colaborador e o plano permitir, adiciona Gerenciar Equipe
        const limiteEquipe = getMaxFuncionarios(usuario?.planoAtivo);

        if (usuario?.perfil !== 'colaborador' && limiteEquipe > 0) {
            base.push({
                id: 'equipe',
                titulo: 'Minha Equipe',
                subtitulo: 'Gerencie sua equipe',
                icon: 'people-outline',
                cor: '#E91E63',
                bg: '#FCE4EC',
                onPress: () => navigation.navigate('GerenciarColaboradores'),
            });
        }

        return base;
    }, [usuario, navigation]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Carregando painel profissional...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ── HEADER COLORIDO ── */}
            <View style={styles.header}>
                <View style={styles.headerCircle} />
                <View style={styles.headerTitleArea}>
                    <Text style={styles.headerTitle}>Painel Profissional</Text>
                    <Text style={styles.headerSubtitle}>{hojeStr}</Text>
                </View>

                <TouchableOpacity
                    style={styles.notificationButton}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Notificacoes')}
                >
                    <Ionicons name="notifications-outline" size={22} color="#FFF" />

                    {totalNotificacoesNaoLidas > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>
                                {totalNotificacoesNaoLidas > 9 ? '9+' : totalNotificacoesNaoLidas}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── STATUS DE ATENDIMENTO ── */}
            <View style={styles.statusSection}>
                <View style={[styles.statusContainer, { backgroundColor: statusAtendimento.atendendo ? '#F0FDF4' : '#FEF2F2' }]}>
                    <View style={styles.statusInfoArea}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusAtendimento.atendendo ? '#22C55E' : '#EF4444' }]} />
                        <View>
                            <Text style={[styles.statusTitle, { color: statusAtendimento.atendendo ? '#166534' : '#991B1B' }]}>
                                {statusAtendimento.atendendo ? 'Você está atendendo' : 'Você está fechado'}
                            </Text>
                            <Text style={styles.statusDescription}>
                                {statusAtendimento.manual
                                    ? 'Alterado manualmente'
                                    : 'Seguindo sua escala automática'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statusActions}>
                        <TouchableOpacity
                            style={styles.fixButton}
                            onPress={limparHorariosPresos}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="build-outline" size={18} color="#64748B" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.statusToggle, { backgroundColor: statusAtendimento.atendendo ? '#EF4444' : '#22C55E' }]}
                            onPress={toggleStatusManual}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.statusToggleText}>
                                {statusAtendimento.atendendo ? 'Pausar' : 'Abrir'}
                            </Text>
                        </TouchableOpacity>

                        {statusAtendimento.manual && (
                            <TouchableOpacity
                                style={styles.autoButton}
                                onPress={voltarParaAutomatico}
                            >
                                <Ionicons name="refresh-outline" size={16} color="#64748B" />
                                <Text style={styles.autoButtonText}>Auto</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── CARROSSEL HERO ── */}
                <ScrollView
                    ref={heroRef}
                    horizontal
                    pagingEnabled={false}
                    snapToInterval={HERO_WIDTH + 12}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.heroCarouselContent}
                    style={styles.heroCarousel}
                >
                    {heroItems.map((item) => {
                        if (item.tipo === 'hero') {
                            return <HeroSlide key={item.id} usuario={usuario} />;
                        }

                        if (item.tipo === 'summary') {
                            return (
                                <SummarySlide
                                    key={item.id}
                                    pendentes={pendentes}
                                    confirmadosHoje={confirmadosHoje}
                                    concluidos={concluidos}
                                />
                            );
                        }

                        return (
                            <NativeAdCard
                                key={item.id}
                                width={HERO_WIDTH}
                                height={HERO_HEIGHT}
                            />
                        );
                    })}
                </ScrollView>

                {/* ── MÉTRICAS ── */}
                <View style={styles.metricsGrid}>
                    <View style={[styles.metricCard, { borderTopColor: colors.primary }]}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#EEF3FF' }]}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.metricValue}>{agendamentosHoje.length}</Text>
                        <Text style={styles.metricLabel}>Hoje</Text>
                    </View>

                    <View style={[styles.metricCard, { borderTopColor: '#D97706' }]}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#FFF6E8' }]}>
                            <Ionicons name="time-outline" size={18} color="#D97706" />
                        </View>
                        <Text style={styles.metricValue}>{pendentes}</Text>
                        <Text style={styles.metricLabel}>Pendentes</Text>
                    </View>

                    <View style={[styles.metricCard, { borderTopColor: '#16A34A' }]}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#EEF9F1' }]}>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
                        </View>
                        <Text style={styles.metricValue}>{confirmadosHoje}</Text>
                        <Text style={styles.metricLabel}>Confirmados</Text>
                    </View>

                    <View style={[styles.metricCard, { borderTopColor: '#7C3AED' }]}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#F3EEFF' }]}>
                            <Ionicons name="ribbon-outline" size={18} color="#7C3AED" />
                        </View>
                        <Text style={styles.metricValue}>{concluidos}</Text>
                        <Text style={styles.metricLabel}>Concluídos</Text>
                    </View>
                </View>

                <AdBanner enabled={temAnuncios(usuario?.planoAtivo)} />

                {/* ── CARD FINANCEIRO ── */}
                <View style={styles.financeCard}>
                    <View style={styles.financeTop}>
                        <View style={styles.financeIconBox}>
                            <Ionicons name="wallet-outline" size={22} color="#FFF" />
                        </View>
                        <Text style={styles.financeCardTitle}>Resumo financeiro</Text>
                    </View>

                    <Text style={styles.financeValue}>{formatarMoeda(faturamentoTotal)}</Text>
                    <Text style={styles.financeHint}>
                        Total acumulado com atendimentos concluídos
                    </Text>

                    <TouchableOpacity
                        style={styles.financeButton}
                        onPress={() => navigation.navigate('FinanceiroPro')}
                    >
                        <Text style={styles.financeButtonText}>Ver financeiro completo</Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── ATALHOS ── */}
                <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Atalhos rápidos</Text>
                        <Text style={styles.sectionSubtitle}>Acesse as áreas principais</Text>
                    </View>

                    <View style={styles.shortcutsGrid}>
                        {atalhos.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.shortcutCard}
                                onPress={item.onPress}
                                activeOpacity={0.88}
                            >
                                <View style={[styles.shortcutIconBox, { backgroundColor: item.bg }]}>
                                    <Ionicons name={item.icon} size={22} color={item.cor} />
                                </View>
                                <Text style={styles.shortcutTitle}>{item.titulo}</Text>
                                <Text style={styles.shortcutSubtitle}>{item.subtitulo}</Text>
                                <View style={[styles.shortcutAccent, { backgroundColor: item.cor }]} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── PRÓXIMOS ATENDIMENTOS ── */}
                <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Próximos atendimentos</Text>
                        <Text style={styles.sectionSubtitle}>Seus próximos compromissos</Text>
                    </View>

                    {proximos.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconBox}>
                                <Ionicons name="calendar-clear-outline" size={28} color={colors.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>Nenhum atendimento encontrado</Text>
                            <Text style={styles.emptySubtitle}>
                                Seus próximos agendamentos aparecerão aqui.
                            </Text>
                        </View>
                    ) : (
                        proximos.map((item) => {
                            const corStatus = getCorStatus(item?.status);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.appointmentCard}
                                    onPress={() =>
                                        navigation.navigate('DetalhesAgendamentoPro', {
                                            agendamentoId: item.id,
                                            agendamento: item,
                                        })
                                    }
                                    activeOpacity={0.88}
                                >
                                    <View style={[styles.appointmentAccent, { backgroundColor: corStatus }]} />

                                    <View style={styles.appointmentLeft}>
                                        <View style={[styles.appointmentDateBox, { backgroundColor: corStatus + '18' }]}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={18}
                                                color={corStatus}
                                            />
                                        </View>

                                        <View style={styles.appointmentInfo}>
                                            <Text style={styles.appointmentClient} numberOfLines={1}>
                                                {item?.clienteNome || 'Cliente'}
                                            </Text>
                                            <Text style={styles.appointmentMeta} numberOfLines={1}>
                                                {item?.data || '-'} às {item?.horario || '-'}
                                            </Text>
                                            <View style={[styles.statusBadge, { backgroundColor: corStatus + '18' }]}>
                                                <View style={[styles.statusDot, { backgroundColor: corStatus }]} />
                                                <Text style={[styles.statusBadgeText, { color: corStatus }]}>
                                                    {item?.status || 'pendente'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <Ionicons
                                        name="chevron-forward-outline"
                                        size={18}
                                        color="#C0C8D4"
                                    />
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            <TutorialOnboarding
                userId={auth.currentUser?.uid}
                userType="profissional"
                visible={showTutorial}
                onComplete={() => setShowTutorial(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F3F8',
    },

    // ── HEADER ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 16,
        backgroundColor: colors.primary,
        overflow: 'hidden',
    },

    headerCircle: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -60,
        right: -30,
    },

    headerTitleArea: {
        flex: 1,
    },

    headerTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.2,
    },

    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
        fontWeight: '500',
    },

    notificationButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },

    notificationBadge: {
        position: 'absolute',
        top: 7,
        right: 7,
        backgroundColor: '#EF4444',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
    },

    notificationBadgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
    },

    content: {
        padding: 16,
        paddingBottom: 28,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.secondary,
    },

    // ── HERO CARROSSEL ──
    heroCarousel: {
        marginBottom: 16,
    },

    heroCarouselContent: {
        paddingRight: 8,
    },

    heroSlide: {
        backgroundColor: colors.primary,
        borderRadius: 22,
        padding: 20,
        marginRight: 12,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },

    heroSlideDark: {
        backgroundColor: '#1E2535',
    },

    heroCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -60,
        right: -50,
    },

    heroCircle2: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -30,
        left: 20,
    },

    heroCircle1Dark: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.04)',
        top: -60,
        right: -40,
    },

    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },

    heroTextArea: {
        flex: 1,
        paddingRight: 12,
    },

    heroGreeting: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },

    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        lineHeight: 28,
    },

    heroDescription: {
        marginTop: 10,
        fontSize: 13,
        lineHeight: 20,
        color: 'rgba(255,255,255,0.80)',
    },

    heroIconBox: {
        width: 54,
        height: 54,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },

    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 5,
    },

    heroBadgeText: {
        fontSize: 11,
        color: '#FFF',
        fontWeight: '700',
    },

    // ── SUMMARY SLIDE ──
    summaryTop: {
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    summaryIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    summaryTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFF',
    },

    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },

    summaryRowNoBorder: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },

    summaryRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    summaryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    summaryLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.70)',
        fontWeight: '500',
    },

    summaryValue: {
        fontSize: 18,
        fontWeight: '800',
    },

    // ── MÉTRICAS ──
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },

    metricCard: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderTopWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },

    metricIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },

    metricValue: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1A1D2E',
    },

    metricLabel: {
        marginTop: 4,
        fontSize: 12,
        color: '#8A94A6',
        fontWeight: '600',
    },

    // ── CARD FINANCEIRO ──
    financeCard: {
        backgroundColor: '#1E2535',
        borderRadius: 22,
        padding: 20,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
    },

    financeTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },

    financeIconBox: {
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    financeCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
    },

    financeValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 6,
    },

    financeHint: {
        fontSize: 13,
        lineHeight: 19,
        color: 'rgba(255,255,255,0.55)',
        marginBottom: 16,
    },

    financeButton: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingVertical: 11,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    financeButtonText: {
        color: colors.primary,
        fontWeight: '800',
        fontSize: 13,
    },

    // ── STATUS DE ATENDIMENTO ──
    statusSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },

    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },

    statusInfoArea: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },

    statusTitle: {
        fontSize: 15,
        fontWeight: '800',
    },

    statusDescription: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },

    statusActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    statusToggle: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
    },

    statusToggleText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 13,
    },

    autoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    autoButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    fixButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    // ── SEÇÕES GERAIS ──
    sectionBlock: {
        backgroundColor: '#FFF',
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },

    sectionHeader: {
        marginBottom: 14,
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1A1D2E',
    },

    sectionSubtitle: {
        marginTop: 3,
        fontSize: 12,
        color: '#8A94A6',
        fontWeight: '500',
    },

    // ── ATALHOS ──
    shortcutsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },

    shortcutCard: {
        width: '48%',
        backgroundColor: '#F8FAFD',
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EAEEf5',
        overflow: 'hidden',
    },

    shortcutIconBox: {
        width: 44,
        height: 44,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },

    shortcutTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1D2E',
    },

    shortcutSubtitle: {
        marginTop: 4,
        fontSize: 11,
        color: '#8A94A6',
        lineHeight: 16,
    },

    shortcutAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        opacity: 0.7,
    },

    // ── EMPTY STATE ──
    emptyCard: {
        paddingVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyIconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#EEF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },

    emptyTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1D2E',
        textAlign: 'center',
    },

    emptySubtitle: {
        marginTop: 6,
        fontSize: 13,
        color: '#8A94A6',
        textAlign: 'center',
        lineHeight: 20,
    },

    // ── CARDS DE ATENDIMENTO ──
    appointmentCard: {
        backgroundColor: '#F8FAFD',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#EAEEf5',
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },

    appointmentAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },

    appointmentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 10,
        paddingLeft: 8,
    },

    appointmentDateBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    appointmentInfo: {
        flex: 1,
    },

    appointmentClient: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1D2E',
    },

    appointmentMeta: {
        marginTop: 3,
        fontSize: 12,
        color: '#8A94A6',
        fontWeight: '500',
    },

    statusBadge: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 5,
    },

    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
});
