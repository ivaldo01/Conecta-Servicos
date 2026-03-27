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
} from 'firebase/firestore';
import AdBanner from '../../components/AdBanner';
import NativeAdCard from '../../components/NativeAdCard';
import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_WIDTH = Math.min(SCREEN_WIDTH - 44, 300);
const HERO_HEIGHT = 250;

function getHojeStr() {
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

function HeroSlide({ usuario }) {
    return (
        <View style={[styles.heroSlide, { width: HERO_WIDTH, height: HERO_HEIGHT }]}>
            <View style={styles.heroTopRow}>
                <View style={styles.heroTextArea}>
                    <Text style={styles.heroTitle}>
                        Olá, {getNomeProfissional(usuario)} 👋
                    </Text>
                    <Text style={styles.heroSubtitle}>Seu painel profissional</Text>
                    <Text style={styles.heroDescription}>
                        Organize sua agenda, acompanhe seus ganhos e visualize os próximos
                        atendimentos em um só lugar.
                    </Text>
                </View>

                <View style={styles.heroIconBox}>
                    <Ionicons name="briefcase-outline" size={28} color={colors.primary} />
                </View>
            </View>
        </View>
    );
}

function SummarySlide({ pendentes, confirmadosHoje, concluidos }) {
    return (
        <View style={[styles.heroSlide, { width: HERO_WIDTH, height: HERO_HEIGHT }]}>
            <View style={styles.summaryTop}>
                <View style={styles.summaryIconBox}>
                    <Ionicons name="analytics-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.summaryTitle}>Resumo do dia</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pendentes</Text>
                <Text style={styles.summaryValue}>{pendentes}</Text>
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Confirmados hoje</Text>
                <Text style={styles.summaryValue}>{confirmadosHoje}</Text>
            </View>

            <View style={styles.summaryRowNoBorder}>
                <Text style={styles.summaryLabel}>Concluídos</Text>
                <Text style={styles.summaryValue}>{concluidos}</Text>
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

    const heroRef = useRef(null);
    const hojeStr = useMemo(() => getHojeStr(), []);

    useEffect(() => {
        let ativo = true;

        async function carregarDados() {
            try {
                const user = auth.currentUser;

                if (!user?.uid) {
                    if (ativo) setLoading(false);
                    return;
                }

                const userRef = doc(db, 'usuarios', user.uid);
                const userSnap = await getDoc(userRef);

                if (ativo && userSnap.exists()) {
                    setUsuario(userSnap.data());
                }

                const possibilidades = [
                    query(collection(db, 'agendamentos'), where('profissionalId', '==', user.uid)),
                    query(collection(db, 'agendamentos'), where('clinicaId', '==', user.uid)),
                    query(collection(db, 'agendamentos'), where('colaboradorId', '==', user.uid)),
                ];

                const resultados = await Promise.allSettled(
                    possibilidades.map((consulta) => getDocs(consulta))
                );

                const mapa = new Map();

                resultados.forEach((resultado) => {
                    if (resultado.status === 'fulfilled') {
                        resultado.value.forEach((docSnap) => {
                            mapa.set(docSnap.id, {
                                id: docSnap.id,
                                ...docSnap.data(),
                            });
                        });
                    }
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
                }
            } catch (error) {
                console.log('Erro ao carregar dashboard profissional:', error);
            } finally {
                if (ativo) setLoading(false);
            }
        }

        carregarDados();

        return () => {
            ativo = false;
        };
    }, []);

    const agendamentosHoje = useMemo(() => {
        return agendamentos.filter((item) => item?.data === hojeStr);
    }, [agendamentos, hojeStr]);

    const pendentes = useMemo(() => {
        return agendamentos.filter((item) => item?.status === 'pendente').length;
    }, [agendamentos]);

    const confirmadosHoje = useMemo(() => {
        return agendamentosHoje.filter((item) => item?.status === 'confirmado').length;
    }, [agendamentosHoje]);

    const concluidos = useMemo(() => {
        return agendamentos.filter((item) => item?.status === 'concluido').length;
    }, [agendamentos]);

    const faturamentoTotal = useMemo(() => {
        return getResumoFinanceiro(agendamentos);
    }, [agendamentos]);

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

    const atalhos = [
        {
            id: 'agenda',
            titulo: 'Agenda',
            subtitulo: 'Gerencie seus atendimentos',
            icon: 'calendar-outline',
            onPress: () => navigation.navigate('AgendaProfissional'),
        },
        {
            id: 'servicos',
            titulo: 'Serviços',
            subtitulo: 'Atualize o que você oferece',
            icon: 'construct-outline',
            onPress: () => navigation.navigate('ConfigurarServicos'),
        },
        {
            id: 'financeiro',
            titulo: 'Financeiro',
            subtitulo: 'Acompanhe ganhos e saques',
            icon: 'wallet-outline',
            onPress: () => navigation.navigate('FinanceiroPro'),
        },
        {
            id: 'perfil',
            titulo: 'Perfil',
            subtitulo: 'Edite seu perfil público',
            icon: 'person-outline',
            onPress: () => navigation.navigate('Perfil'),
        },
    ];

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
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

                <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#EEF3FF' }]}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.metricValue}>{agendamentosHoje.length}</Text>
                        <Text style={styles.metricLabel}>Hoje</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#FFF6E8' }]}>
                            <Ionicons name="time-outline" size={20} color="#D97706" />
                        </View>
                        <Text style={styles.metricValue}>{pendentes}</Text>
                        <Text style={styles.metricLabel}>Pendentes</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#EEF9F1' }]}>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
                        </View>
                        <Text style={styles.metricValue}>{confirmadosHoje}</Text>
                        <Text style={styles.metricLabel}>Confirmados</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <View style={[styles.metricIconBox, { backgroundColor: '#F3EEFF' }]}>
                            <Ionicons name="ribbon-outline" size={20} color="#7C3AED" />
                        </View>
                        <Text style={styles.metricValue}>{concluidos}</Text>
                        <Text style={styles.metricLabel}>Concluídos</Text>
                    </View>
                </View>

                <AdBanner />

                <View style={styles.financeCard}>
                    <View style={styles.financeHeader}>
                        <Text style={styles.sectionTitle}>Resumo financeiro</Text>
                        <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                    </View>

                    <Text style={styles.financeValue}>{formatarMoeda(faturamentoTotal)}</Text>
                    <Text style={styles.financeHint}>
                        Total acumulado com atendimentos concluídos
                    </Text>

                    <TouchableOpacity
                        style={styles.financeButton}
                        onPress={() => navigation.navigate('FinanceiroPro')}
                    >
                        <Text style={styles.financeButtonText}>Ir para financeiro</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>

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
                                activeOpacity={0.9}
                            >
                                <View style={styles.shortcutIconBox}>
                                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                                </View>
                                <Text style={styles.shortcutTitle}>{item.titulo}</Text>
                                <Text style={styles.shortcutSubtitle}>{item.subtitulo}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Próximos atendimentos</Text>
                        <Text style={styles.sectionSubtitle}>Seus próximos compromissos</Text>
                    </View>

                    {proximos.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="calendar-clear-outline" size={28} color="#A0A0A0" />
                            <Text style={styles.emptyTitle}>Nenhum atendimento encontrado</Text>
                            <Text style={styles.emptySubtitle}>
                                Seus próximos agendamentos aparecerão aqui.
                            </Text>
                        </View>
                    ) : (
                        proximos.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.appointmentCard}
                                onPress={() =>
                                    navigation.navigate('DetalhesAgendamentoPro', {
                                        agendamentoId: item.id,
                                        agendamento: item,
                                    })
                                }
                                activeOpacity={0.92}
                            >
                                <View style={styles.appointmentLeft}>
                                    <View style={styles.appointmentDateBox}>
                                        <Ionicons
                                            name="calendar-outline"
                                            size={18}
                                            color={colors.primary}
                                        />
                                    </View>

                                    <View style={styles.appointmentInfo}>
                                        <Text style={styles.appointmentClient} numberOfLines={1}>
                                            {item?.clienteNome || 'Cliente'}
                                        </Text>
                                        <Text style={styles.appointmentMeta} numberOfLines={1}>
                                            {item?.data || '-'} às {item?.horario || '-'}
                                        </Text>
                                        <Text style={styles.appointmentStatus} numberOfLines={1}>
                                            Status: {item?.status || 'pendente'}
                                        </Text>
                                    </View>
                                </View>

                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={18}
                                    color={colors.secondary}
                                />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
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

    heroCarousel: {
        marginBottom: 16,
    },

    heroCarouselContent: {
        paddingRight: 8,
    },

    heroSlide: {
        backgroundColor: '#FFF',
        borderRadius: 22,
        padding: 18,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#EEF1F4',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },

    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    heroTextArea: {
        flex: 1,
        paddingRight: 12,
    },

    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textDark,
    },

    heroSubtitle: {
        marginTop: 4,
        fontSize: 14,
        color: colors.primary,
        fontWeight: '700',
    },

    heroDescription: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 20,
        color: colors.secondary,
    },

    heroIconBox: {
        width: 60,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF3FF',
    },

    summaryTop: {
        marginBottom: 12,
    },

    summaryIconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#EEF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },

    summaryTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
    },

    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF1F4',
    },

    summaryRowNoBorder: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },

    summaryLabel: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: '600',
    },

    summaryValue: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
    },

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
        borderWidth: 1,
        borderColor: '#EEF1F4',
    },

    metricIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },

    metricValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textDark,
    },

    metricLabel: {
        marginTop: 6,
        fontSize: 13,
        color: colors.secondary,
        fontWeight: '600',
    },

    financeCard: {
        backgroundColor: '#FFF',
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EEF1F4',
    },

    financeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
    },

    financeValue: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.primary,
    },

    financeHint: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 19,
        color: colors.secondary,
    },

    financeButton: {
        marginTop: 16,
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },

    financeButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginRight: 8,
    },

    sectionBlock: {
        backgroundColor: '#FFF',
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EEF1F4',
    },

    sectionHeader: {
        marginBottom: 14,
    },

    sectionSubtitle: {
        marginTop: 4,
        fontSize: 13,
        color: colors.secondary,
    },

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
        borderColor: '#E7ECF3',
    },

    shortcutIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#EEF3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },

    shortcutTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textDark,
    },

    shortcutSubtitle: {
        marginTop: 6,
        fontSize: 12,
        color: colors.secondary,
        lineHeight: 18,
    },

    emptyCard: {
        paddingVertical: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyTitle: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
        textAlign: 'center',
    },

    emptySubtitle: {
        marginTop: 6,
        fontSize: 13,
        color: colors.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    appointmentCard: {
        backgroundColor: '#F8FAFD',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E7ECF3',
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    appointmentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 10,
    },

    appointmentDateBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#EEF3FF',
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
        color: colors.textDark,
    },

    appointmentMeta: {
        marginTop: 3,
        fontSize: 12,
        color: colors.secondary,
    },

    appointmentStatus: {
        marginTop: 4,
        fontSize: 12,
        color: colors.primary,
        fontWeight: '700',
    },
});