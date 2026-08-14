import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Alert,
    useWindowDimensions,
    Platform,
    Animated as RNAnimated,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    interpolate
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../components/Sidebar';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    deleteDoc,
    serverTimestamp,
    where,
} from 'firebase/firestore';

import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import { temSeloVerificado } from '../../constants/plans';

function formatarTelefoneWhatsApp(telefone = '') {
    return String(telefone || '').replace(/\D/g, '');
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function calcularResumoAvaliacoes(avaliacoes = []) {
    if (!avaliacoes.length) {
        return {
            media: 0,
            total: 0,
        };
    }

    const soma = avaliacoes.reduce(
        (acc, item) => acc + Number(item?.nota || item?.estrelas || 0),
        0
    );

    return {
        media: soma / avaliacoes.length,
        total: avaliacoes.length,
    };
}

function getNomeProfissional(perfil) {
    return (
        perfil?.nome ||
        perfil?.nomeCompleto ||
        perfil?.nomeFantasia ||
        perfil?.nomeNegocio ||
        perfil?.clinicaNome ||
        'Profissional'
    );
}

function getDescricaoProfissional(perfil) {
    return (
        perfil?.descricaoPublica ||
        perfil?.descricao ||
        perfil?.bio ||
        'Este profissional ainda não adicionou uma descrição pública.'
    );
}

function StatusLight({ atendendo }) {
    const pulse = useSharedValue(0);

    useEffect(() => {
        if (atendendo) {
            pulse.value = withRepeat(
                withTiming(1, { duration: 1500 }),
                -1,
                false
            );
        } else {
            pulse.value = 0;
        }
    }, [atendendo]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.2]) }],
            opacity: interpolate(pulse.value, [0, 1], [0.6, 0]),
        };
    });

    return (
        <View style={styles.statusLightWrapper}>
            <View style={[styles.statusLightInner, { backgroundColor: atendendo ? '#22C55E' : '#94A3B8' }]} />
            {atendendo && (
                <Animated.View style={[styles.statusLightPulse, animatedStyle]} />
            )}
        </View>
    );
}

function getImagemValida(imagem) {
    if (!imagem) return null;

    if (typeof imagem === 'string') {
        return imagem.trim() || null;
    }

    if (typeof imagem === 'object') {
        return (
            imagem?.uri ||
            imagem?.url ||
            imagem?.secure_url ||
            imagem?.secureUrl ||
            imagem?.src ||
            imagem?.imageUrl ||
            imagem?.imagem ||
            imagem?.publicUrl ||
            imagem?.downloadURL ||
            imagem?.downloadUrl ||
            null
        );
    }

    return null;
}

function extrairListaGaleria(perfil) {
    const candidatos = [
        perfil?.galeriaFotos,
        perfil?.galeria,
        perfil?.fotosGaleria,
        perfil?.portfolio,
        perfil?.imagensGaleria,
        perfil?.fotos,
    ];

    const listaFinal = [];

    candidatos.forEach((grupo) => {
        if (!grupo) return;

        if (Array.isArray(grupo)) {
            grupo.forEach((item) => {
                const url = getImagemValida(item);
                if (url) listaFinal.push(url);
            });
            return;
        }

        if (typeof grupo === 'object') {
            Object.values(grupo).forEach((item) => {
                if (Array.isArray(item)) {
                    item.forEach((subItem) => {
                        const url = getImagemValida(subItem);
                        if (url) listaFinal.push(url);
                    });
                } else {
                    const url = getImagemValida(item);
                    if (url) listaFinal.push(url);
                }
            });
        }
    });

    return [...new Set(listaFinal)];
}

function CardVazio({ icon, title, subtitle }) {
    return (
        <View style={styles.emptyBox}>
            <Ionicons name={icon} size={28} color={colors.primary} />
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
        </View>
    );
}

export default function PerfilPublicoProfissional({ route, navigation }) {
    const { width: windowWidth } = useWindowDimensions();
    const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

    const profissionalId =
        route?.params?.profissionalId ||
        route?.params?.userId ||
        route?.params?.clinicaId ||
        route?.params?.id ||
        route?.params?.proId ||
        null;

    const perfilInicial = route?.params?.perfilInicial || null;

    const [loading, setLoading] = useState(true);
    const [perfil, setPerfil] = useState(
        perfilInicial
            ? {
                id: profissionalId,
                ...perfilInicial,
            }
            : null
    );
    const [servicos, setServicos] = useState([]);
    const [avaliacoes, setAvaliacoes] = useState([]);
    const [favorito, setFavorito] = useState(false);
    const [loadingFavorito, setLoadingFavorito] = useState(false);
    const [servicosSelecionados, setServicosSelecionados] = useState([]);
    const [imagensComErro, setImagensComErro] = useState({});

    const tamanhoGaleria = useMemo(() => {
        const larguraCard = isLargeScreen ? (Math.min(windowWidth, 1200) - 80) : (windowWidth - 32 - 32);
        const colunas = isLargeScreen ? 4 : 3;
        const espacoEntreColunas = 10 * (colunas - 1);
        return Math.floor((larguraCard - espacoEntreColunas) / colunas);
    }, [windowWidth, isLargeScreen]);

    useEffect(() => {
        carregarDados();
    }, [profissionalId]);

    const carregarDados = async () => {
        if (!profissionalId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            try {
                const perfilRef = doc(db, 'usuarios', profissionalId);
                const perfilSnap = await getDoc(perfilRef);

                if (perfilSnap.exists()) {
                    setPerfil({
                        id: perfilSnap.id,
                        ...perfilSnap.data(),
                    });
                } else if (!perfilInicial) {
                    setPerfil(null);
                }
            } catch (errorPerfil) {
                if (errorPerfil?.code === 'permission-denied') {
                    console.log(
                        `Sem permissão para ler perfil completo de ${profissionalId}. Usando perfil inicial/favorito.`
                    );

                    if (!perfilInicial) {
                        setPerfil((prev) => prev || null);
                    }
                } else {
                    throw errorPerfil;
                }
            }

            try {
                const servicosRef = collection(db, 'usuarios', profissionalId, 'servicos');
                const servicosSnap = await getDocs(query(servicosRef));
                const listaServicos = servicosSnap.docs.map((item) => ({
                    id: item.id,
                    ...item.data(),
                }));
                setServicos(listaServicos);
                console.log('📱 [PerfilPublicoProfissional] Serviços carregados:', listaServicos.map(s => ({ nome: s.nome, fotoUrl: s.fotoUrl })));
            } catch (errorServicos) {
                console.log('Erro ao carregar serviços do profissional:', errorServicos);
                setServicos([]);
            }

            try {
                const avaliacoesRef = collection(db, 'avaliacoes');
                const q = query(avaliacoesRef, where('profissionalId', '==', profissionalId));
                const avaliacoesSnap = await getDocs(q);
                const listaAvaliacoes = avaliacoesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvaliacoes(listaAvaliacoes);
            } catch (errorAvaliacoes) {
                console.log('Erro ao carregar avaliações:', errorAvaliacoes);
                setAvaliacoes([]);
            }

            const user = auth.currentUser;
            if (user?.uid) {
                try {
                    const favoritoRef = doc(db, 'usuarios', user.uid, 'favoritos', profissionalId);
                    const favoritoSnap = await getDoc(favoritoRef);
                    setFavorito(favoritoSnap.exists());
                } catch (errorFavorito) {
                    console.log('Erro ao verificar favorito:', errorFavorito);
                    setFavorito(false);
                }
            } else {
                setFavorito(false);
            }
        } catch (error) {
            console.log('Erro ao carregar perfil público:', error);

            if (!perfilInicial) {
                Alert.alert('Erro', 'Não foi possível carregar o perfil do profissional.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resumoAvaliacoes = useMemo(
        () => calcularResumoAvaliacoes(avaliacoes),
        [avaliacoes]
    );

    const bannerUrl = useMemo(() => {
        return getImagemValida(
            perfil?.bannerPerfil ||
            perfil?.banner ||
            perfil?.capaPerfil ||
            perfil?.capa ||
            perfil?.bannerUrl ||
            perfil?.imagemBanner ||
            perfil?.fotoBanner
        );
    }, [perfil]);

    const fotoUrl = useMemo(() => {
        return getImagemValida(
            perfil?.fotoPerfil ||
            perfil?.foto ||
            perfil?.avatar ||
            perfil?.photoURL ||
            perfil?.photoUrl ||
            perfil?.fotoUrl ||
            perfil?.imageUrl
        );
    }, [perfil]);

    const galeriaFotos = useMemo(() => {
        return extrairListaGaleria(perfil);
    }, [perfil]);

    const totalSelecionado = useMemo(() => {
        return servicosSelecionados.reduce(
            (acc, item) => acc + Number(item?.preco || 0),
            0
        );
    }, [servicosSelecionados]);

    const abrirWhatsApp = async () => {
        const telefoneOriginal =
            perfil?.whatsapp ||
            perfil?.telefone ||
            '';

        const telefone = formatarTelefoneWhatsApp(telefoneOriginal);

        if (!telefone) {
            Alert.alert(
                'WhatsApp indisponível',
                'Este profissional ainda não informou um telefone.'
            );
            return;
        }

        const nome = getNomeProfissional(perfil);
        const mensagem = `Olá, ${nome}! Vi seu perfil no Conecta Serviços e gostaria de saber mais sobre os atendimentos.`;
        const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;

        const supported = await Linking.canOpenURL(url);

        if (!supported) {
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
            return;
        }

        await Linking.openURL(url);
    };

    const toggleFavorito = async () => {
        const user = auth.currentUser;

        if (!user?.uid) {
            Alert.alert('Atenção', 'Você precisa estar logado para favoritar.');
            return;
        }

        try {
            setLoadingFavorito(true);

            const favoritoRef = doc(db, 'usuarios', user.uid, 'favoritos', profissionalId);

            if (favorito) {
                await deleteDoc(favoritoRef);
                setFavorito(false);
            } else {
                await setDoc(favoritoRef, {
                    profissionalId,
                    nome: getNomeProfissional(perfil),
                    especialidade: perfil?.especialidade || perfil?.categoria || '',
                    cidade: perfil?.cidade || perfil?.localizacao?.cidade || '',
                    fotoPerfil: fotoUrl || '',
                    bannerPerfil: bannerUrl || '',
                    createdAt: serverTimestamp(),
                });
                setFavorito(true);
            }
        } catch (error) {
            console.log('Erro ao atualizar favorito:', error);
            Alert.alert('Erro', 'Não foi possível atualizar os favoritos.');
        } finally {
            setLoadingFavorito(false);
        }
    };

    const toggleServico = (servico) => {
        const jaSelecionado = servicosSelecionados.some((item) => item.id === servico.id);

        if (jaSelecionado) {
            setServicosSelecionados((prev) =>
                prev.filter((item) => item.id !== servico.id)
            );
        } else {
            setServicosSelecionados((prev) => [...prev, servico]);
        }
    };

    const agendarAgora = () => {
        if (!perfil || !profissionalId) {
            Alert.alert('Erro', 'Profissional não encontrado.');
            return;
        }

        if (servicosSelecionados.length === 0) {
            Alert.alert(
                'Selecione um serviço',
                'Escolha pelo menos um serviço antes de continuar o agendamento.'
            );
            return;
        }

        navigation.navigate('AgendamentoFinal', {
            clinicaId: profissionalId,
            profissionalId,
            proId: profissionalId,
            profissional: perfil,
            origem: 'perfil_publico',
            servicos: servicosSelecionados,
        });
    };

    const verPlanosRecorrentes = () => {
        if (!perfil || !profissionalId) {
            Alert.alert('Erro', 'Profissional não encontrado.');
            return;
        }

        navigation.navigate('PlanosRecorrentes', {
            profissionalId: profissionalId,
            profissionalNome: getNomeProfissional(perfil),
        });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando perfil...</Text>
            </View>
        );
    }

    if (!profissionalId || !perfil) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={54} color={colors.danger} />
                <Text style={styles.emptyScreenTitle}>Perfil não encontrado</Text>
                <Text style={styles.emptyScreenSubtitle}>
                    Não foi possível localizar os dados públicos deste profissional.
                </Text>
            </View>
        );
    }

    const MainContent = (
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, isLargeScreen && styles.contentLarge]} showsVerticalScrollIndicator={false}>
            <View style={[styles.bannerWrapper, isLargeScreen && styles.bannerWrapperLarge]}>
                {bannerUrl ? (
                    <Image source={{ uri: bannerUrl }} style={styles.banner} />
                ) : (
                    <View style={styles.bannerPlaceholder}>
                        <Ionicons name="image-outline" size={isLargeScreen ? 48 : 32} color="#A0A8B3" />
                        <Text style={styles.bannerPlaceholderText}>Banner profissional</Text>
                    </View>
                )}
            </View>

            <View style={[styles.headerCard, isLargeScreen && styles.headerCardLarge]}>
                <View style={[styles.avatarShadow, isLargeScreen && styles.avatarShadowLarge]}>
                    {fotoUrl ? (
                        <Image source={{ uri: fotoUrl }} style={[styles.avatar, isLargeScreen && styles.avatarLarge]} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, isLargeScreen && styles.avatarPlaceholderLarge]}>
                            <Ionicons name="person" size={isLargeScreen ? 72 : 54} color="#A0A8B3" />
                        </View>
                    )}
                </View>

                <View style={isLargeScreen ? styles.headerTextLarge : null}>
                    <View style={styles.headerTitleRow}>
                        <Text style={[styles.nome, isLargeScreen && styles.nomeLarge, { marginBottom: 0 }]}>{getNomeProfissional(perfil)}</Text>
                        <View style={styles.nameBadges}>
                            <StatusLight atendendo={perfil?.atendendo} />
                            {temSeloVerificado(perfil?.planoAtivo) && (
                                <Ionicons name="checkmark-circle" size={24} color="#3498DB" />
                            )}
                        </View>
                    </View>

                    <Text style={[styles.subInfo, isLargeScreen && styles.subInfoLarge, { marginTop: 4 }]}>
                        {perfil?.categoria || perfil?.especialidade || 'Profissional verificado no app'}
                    </Text>

                    <View style={[styles.ratingRow, isLargeScreen && styles.ratingRowLarge]}>
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={15} color="#F4B400" />
                            <Text style={styles.ratingText}>
                                {resumoAvaliacoes.media > 0 ? resumoAvaliacoes.media.toFixed(1) : 'Novo'}
                            </Text>
                        </View>

                        <Text style={styles.ratingMeta}>
                            {resumoAvaliacoes.total > 0
                                ? `${resumoAvaliacoes.total} avaliação(ões)`
                                : 'Ainda sem avaliações'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.actionRow, isLargeScreen && styles.actionRowLarge]}>
                    <TouchableOpacity style={[styles.primaryAction, isLargeScreen && styles.primaryActionLarge]} onPress={agendarAgora}>
                        <Ionicons name="calendar-outline" size={18} color="#FFF" />
                        <Text style={styles.primaryActionText}>Agendar agora</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.secondaryAction, isLargeScreen && styles.secondaryActionLarge]} onPress={abrirWhatsApp}>
                        <Ionicons name="logo-whatsapp" size={20} color="#166534" />
                        <Text style={styles.secondaryActionText}>WhatsApp</Text>
                    </TouchableOpacity>
                </View>

                {!isLargeScreen && (
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={toggleFavorito}
                        disabled={loadingFavorito}
                    >
                        {loadingFavorito ? (
                            <ActivityIndicator size="small" color={favorito ? '#E63946' : colors.primary} />
                        ) : (
                            <>
                                <Ionicons
                                    name={favorito ? 'heart' : 'heart-outline'}
                                    size={18}
                                    color={favorito ? '#E63946' : colors.primary}
                                />
                                <Text
                                    style={[
                                        styles.favoriteButtonText,
                                        { color: favorito ? '#E63946' : colors.primary },
                                    ]}
                                >
                                    {favorito ? 'Favoritado' : 'Favoritar profissional'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {isLargeScreen && (
                    <TouchableOpacity
                        style={styles.favoriteButtonLarge}
                        onPress={toggleFavorito}
                        disabled={loadingFavorito}
                    >
                        {loadingFavorito ? (
                            <ActivityIndicator size="small" color={favorito ? '#E63946' : colors.primary} />
                        ) : (
                            <Ionicons
                                name={favorito ? 'heart' : 'heart-outline'}
                                size={22}
                                color={favorito ? '#E63946' : colors.primary}
                            />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <View style={[styles.cardsGridLarge, isLargeScreen && styles.cardsGridLargeRow]}>
                <View style={isLargeScreen ? styles.leftColumnLarge : null}>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Sobre o profissional</Text>
                        <Text style={styles.description}>{getDescricaoProfissional(perfil)}</Text>

                        <View style={styles.infoList}>
                            <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={18} color={colors.primary} />
                                <Text style={styles.infoText}>
                                    {perfil?.telefone || 'Telefone não informado'}
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={18} color={colors.primary} />
                                <Text style={styles.infoText}>
                                    {[
                                        perfil?.endereco,
                                        perfil?.bairro,
                                        perfil?.cidade,
                                        perfil?.estado || perfil?.localizacao?.estado
                                    ].filter(Boolean).join(', ') || 'Localização não informada'}
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="card-outline" size={18} color={colors.primary} />
                                <Text style={styles.infoText}>
                                    {perfil?.formaPagamentoPreferida ||
                                        'Aceita pagamentos conforme agendamento'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Galeria de trabalhos</Text>

                        {galeriaFotos.length === 0 ? (
                            <CardVazio
                                icon="images-outline"
                                title="Galeria ainda vazia"
                                subtitle="Quando o profissional adicionar fotos dos trabalhos, elas aparecerão aqui."
                            />
                        ) : (
                            <View style={styles.galleryGrid}>
                                {galeriaFotos.map((foto, index) => {
                                    const chave = `${foto}-${index}`;
                                    const comErro = !!imagensComErro[chave];

                                    if (comErro) {
                                        return (
                                            <View
                                                key={chave}
                                                style={[
                                                    styles.galleryItemFallback,
                                                    { width: tamanhoGaleria, height: tamanhoGaleria },
                                                ]}
                                            >
                                                <Ionicons name="image-outline" size={24} color="#94A3B8" />
                                                <Text style={styles.galleryFallbackText}>Imagem indisponível</Text>
                                            </View>
                                        );
                                    }

                                    return (
                                        <View
                                            key={chave}
                                            style={[
                                                styles.galleryCard,
                                                { width: tamanhoGaleria, height: tamanhoGaleria },
                                            ]}
                                        >
                                            <Image
                                                source={{ uri: foto }}
                                                style={styles.galleryItem}
                                                resizeMode="cover"
                                                onError={() => {
                                                    setImagensComErro((prev) => ({
                                                        ...prev,
                                                        [chave]: true,
                                                    }));
                                                }}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>

                <View style={isLargeScreen ? styles.rightColumnLarge : null}>
                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Serviços e preços</Text>

                            {servicosSelecionados.length > 0 && (
                                <View style={styles.selectedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color="#0F9D58" />
                                    <Text style={styles.selectedBadgeText}>
                                        {servicosSelecionados.length}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {servicos.length === 0 ? (
                            <CardVazio
                                icon="cut-outline"
                                title="Nenhum serviço cadastrado"
                                subtitle="Quando este profissional adicionar serviços, eles aparecerão aqui."
                            />
                        ) : (
                            <>
                                {servicos.map((servico) => {
                                    const selecionado = servicosSelecionados.some(
                                        (item) => item.id === servico.id
                                    );

                                    return (
                                        <TouchableOpacity
                                            key={servico.id}
                                            style={[
                                                styles.serviceItem,
                                                selecionado && styles.serviceItemSelected,
                                            ]}
                                            activeOpacity={0.9}
                                            onPress={() => toggleServico(servico)}
                                        >
                                            {servico?.fotoUrl ? (
                                                <Image source={{ uri: servico.fotoUrl }} style={styles.serviceImage} resizeMode="cover" />
                                            ) : (
                                                <View style={styles.serviceImagePlaceholder}>
                                                    <Ionicons name="cut-outline" size={24} color="#94A3B8" />
                                                </View>
                                            )}
                                            <View style={styles.serviceLeft}>
                                                <View style={styles.serviceTextBox}>
                                                    <Text style={styles.serviceName}>
                                                        {servico?.nome || 'Serviço'}
                                                    </Text>
                                                    <Text style={styles.serviceDescription} numberOfLines={1}>
                                                        {servico?.descricao || 'Toque para selecionar.'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.serviceRight}>
                                                <Text style={styles.servicePrice}>
                                                    {formatarMoeda(servico?.preco || 0)}
                                                </Text>
                                                <Ionicons
                                                    name={selecionado ? 'checkbox' : 'square-outline'}
                                                    size={20}
                                                    color={selecionado ? '#0F9D58' : '#A8B3C2'}
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                <View style={styles.selectionSummary}>
                                    <View style={styles.selectionSummaryTop}>
                                        <Text style={styles.selectionSummaryLabel}>Total</Text>
                                        <Text style={styles.selectionSummaryValue}>
                                            {formatarMoeda(totalSelecionado)}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.selectionButton,
                                            servicosSelecionados.length === 0 &&
                                            styles.selectionButtonDisabled,
                                        ]}
                                        onPress={agendarAgora}
                                        disabled={servicosSelecionados.length === 0}
                                    >
                                        <Ionicons name="calendar-outline" size={18} color="#FFF" />
                                        <Text style={styles.selectionButtonText}>Agendar</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Card de Planos Recorrentes */}
                                <TouchableOpacity
                                    style={styles.planosCard}
                                    onPress={verPlanosRecorrentes}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.planosCardContent}>
                                        <View style={styles.planosCardIconContainer}>
                                            <Ionicons name="repeat" size={28} color="#FFF" />
                                        </View>
                                        <View style={styles.planosCardTextContainer}>
                                            <Text style={styles.planosCardTitle}>Planos Recorrentes</Text>
                                            <Text style={styles.planosCardSubtitle}>
                                                Assinaturas mensais com horários fixos
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={24} color="#FF9800" />
                                    </View>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Avaliações</Text>

                        {avaliacoes.length === 0 ? (
                            <CardVazio
                                icon="star-outline"
                                title="Sem avaliações"
                                subtitle="Ainda não há avaliações."
                            />
                        ) : (
                            avaliacoes.slice(0, 3).map((item) => (
                                <View key={item.id} style={styles.reviewCard}>
                                    <View style={styles.reviewTop}>
                                        <Text style={styles.reviewName}>{item?.clienteNome || 'Cliente'}</Text>
                                        <View style={styles.reviewStars}>
                                            <Ionicons name="star" size={12} color="#F4B400" />
                                            <Text style={styles.reviewStarsText}>
                                                {Number(item?.nota || item?.estrelas || 0).toFixed(1)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.reviewText} numberOfLines={2}>
                                        {item?.comentario || 'Sem comentário.'}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.screenContainer}>
            {isLargeScreen ? (
                <View style={styles.webLayout}>
                    <Sidebar navigation={navigation} activeRoute="BuscaProfissionais" />
                    <View style={styles.webContentArea}>
                        {MainContent}
                    </View>
                </View>
            ) : (
                <SafeAreaView style={styles.containerFlex}>
                    {MainContent}
                </SafeAreaView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#0B0F1A',
    },
    webLayout: {
        flex: 1,
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
    },
    webContentArea: {
        flex: 1,
        backgroundColor: '#0B0F1A',
        height: '100%',
        display: 'flex',
        overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
    },
    containerFlex: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: 40,
    },
    contentLarge: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0B0F1A',
    },
    loadingText: {
        marginTop: 12,
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyScreenTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F1F5F9',
        marginTop: 16,
    },
    emptyScreenSubtitle: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
    content: {
        paddingBottom: 40,
    },
    contentLarge: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 40,
        paddingTop: 32,
    },
    bannerWrapper: {
        height: 180,
        backgroundColor: '#151925',
    },
    bannerWrapperLarge: {
        height: 280,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 0,
    },
    banner: {
        width: '100%',
        height: '100%',
    },
    bannerPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerPlaceholderText: {
        marginTop: 8,
        color: '#A0A8B3',
        fontSize: 14,
    },
    headerCard: {
        backgroundColor: 'rgba(21, 25, 37, 0.95)',
        marginTop: -30,
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    headerCardLarge: {
        marginTop: -60,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 40,
        padding: 40,
        textAlign: 'left',
    },
    avatarShadow: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        padding: 4,
        elevation: 8,
        shadowColor: '#3B82F6',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        marginTop: -60,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    avatarShadowLarge: {
        width: 140,
        height: 140,
        borderRadius: 70,
        marginTop: 0,
        marginBottom: 0,
        marginRight: 32,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    avatarLarge: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderLarge: {
        width: '100%',
        height: '100%',
    },
    headerTextLarge: {
        flex: 1,
        alignItems: 'flex-start',
    },
    nome: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F1F5F9',
        textAlign: 'center',
    },
    nomeLarge: {
        textAlign: 'left',
    },
    subInfo: {
        fontSize: 15,
        color: '#94A3B8',
        marginTop: 4,
        textAlign: 'center',
    },
    subInfoLarge: {
        textAlign: 'left',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        justifyContent: 'center',
    },
    ratingRowLarge: {
        justifyContent: 'flex-start',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FBBF24',
        marginLeft: 4,
    },
    ratingMeta: {
        fontSize: 13,
        color: '#64748B',
    },
    actionRow: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 24,
        gap: 10,
    },
    actionRowLarge: {
        width: 'auto',
        marginTop: 0,
        marginLeft: 'auto',
    },
    primaryAction: {
        flex: 1,
        backgroundColor: '#3B82F6',
        minHeight: 52,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#3B82F6',
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    primaryActionLarge: {
        flex: 0,
        paddingHorizontal: 24,
    },
    primaryActionText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 14,
        marginLeft: 8,
        flexShrink: 1,
    },
    secondaryAction: {
        flex: 1,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        minHeight: 52,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    secondaryActionLarge: {
        flex: 0,
        paddingHorizontal: 24,
    },
    secondaryActionText: {
        color: '#22C55E',
        fontWeight: '800',
        fontSize: 14,
        marginLeft: 6,
        flexShrink: 1,
    },
    favoriteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    favoriteButtonLarge: {
        width: 50,
        height: 50,
        marginTop: 0,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    favoriteButtonText: {
        marginLeft: 8,
        fontWeight: '700',
        fontSize: 14,
        color: '#EF4444',
    },
    cardsGridLarge: {
        paddingHorizontal: 16,
    },
    cardsGridLargeRow: {
        flexDirection: 'row',
        paddingHorizontal: 40,
        gap: 24,
    },
    leftColumnLarge: {
        flex: 1.5,
    },
    rightColumnLarge: {
        flex: 1,
    },
    card: {
        backgroundColor: '#151925',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(71, 85, 105, 0.45)',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F1F5F9',
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        color: '#CBD5E1',
        lineHeight: 24,
    },
    infoList: {
        marginTop: 16,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        color: '#AAB7C8',
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    emptyBox: {
        minHeight: 126,
        borderRadius: 16,
        paddingVertical: 22,
        paddingHorizontal: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.45)',
        borderWidth: 1,
        borderColor: 'rgba(71, 85, 105, 0.35)',
    },
    emptyTitle: {
        color: '#E2E8F0',
        fontSize: 15,
        fontWeight: '700',
        marginTop: 10,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: '#94A3B8',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 5,
        textAlign: 'center',
        maxWidth: 360,
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    galleryCard: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
    },
    galleryItem: {
        width: '100%',
        height: '100%',
    },
    galleryItemFallback: {
        borderRadius: 16,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryFallbackText: {
        fontSize: 10,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
    },
    serviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(59, 130, 246, 0.1)',
    },
    serviceItemSelected: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    serviceLeft: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    serviceTextBox: {
        flex: 1,
    },
    serviceName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F1F5F9',
    },
    serviceDescription: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
    },
    serviceRight: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 8,
        flexShrink: 0,
    },
    servicePrice: {
        fontSize: 15,
        fontWeight: '800',
        color: '#3B82F6',
    },
    selectionSummary: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(59, 130, 246, 0.15)',
    },
    selectionSummaryTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    selectionSummaryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    selectionSummaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F1F5F9',
    },
    selectionButton: {
        backgroundColor: '#3B82F6',
        height: 54,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#3B82F6',
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    selectionButtonDisabled: {
        backgroundColor: '#475569',
        shadowOpacity: 0,
        elevation: 0,
    },
    selectionButtonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
        marginLeft: 10,
    },
    reviewCard: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(59, 130, 246, 0.1)',
    },
    reviewTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    reviewName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F1F5F9',
    },
    reviewStars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewStarsText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FBBF24',
        marginLeft: 4,
    },
    reviewText: {
        fontSize: 14,
        color: '#94A3B8',
        lineHeight: 20,
    },
    planosCard: {
        marginTop: 16,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
        padding: 16,
        elevation: 2,
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    planosCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    planosCardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FBBF24',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planosCardTextContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    planosCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F59E0B',
    },
    planosCardSubtitle: {
        fontSize: 13,
        color: '#FDE68A',
        marginTop: 2,
        lineHeight: 18,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 20,
        gap: 8,
    },
    nameBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusLightWrapper: {
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusLightInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        zIndex: 2,
    },
    statusLightPulse: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22C55E',
        zIndex: 1,
    },
    serviceImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginRight: 12,
    },
    serviceImagePlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginRight: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
