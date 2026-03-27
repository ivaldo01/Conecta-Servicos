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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';

import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';

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
    const { width } = useWindowDimensions();

    const tamanhoGaleria = useMemo(() => {
        const larguraCard = width - 32 - 32;
        const espacoEntreColunas = 10 * 2;
        return Math.floor((larguraCard - espacoEntreColunas) / 3);
    }, [width]);

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
            } catch (errorServicos) {
                console.log('Erro ao carregar serviços do profissional:', errorServicos);
                setServicos([]);
            }

            try {
                const avaliacoesRef = collection(db, 'avaliacoes');
                const avaliacoesSnap = await getDocs(query(avaliacoesRef));
                const listaAvaliacoes = avaliacoesSnap.docs
                    .map((item) => ({
                        id: item.id,
                        ...item.data(),
                    }))
                    .filter(
                        (item) =>
                            item?.profissionalId === profissionalId ||
                            item?.clinicaId === profissionalId ||
                            item?.colaboradorId === profissionalId
                    );

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
            perfil?.imagemBanner
        );
    }, [perfil]);

    const fotoUrl = useMemo(() => {
        return getImagemValida(
            perfil?.fotoPerfil ||
            perfil?.foto ||
            perfil?.avatar ||
            perfil?.photoURL ||
            perfil?.photoUrl
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

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.bannerWrapper}>
                {bannerUrl ? (
                    <Image source={{ uri: bannerUrl }} style={styles.banner} />
                ) : (
                    <View style={styles.bannerPlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#A0A8B3" />
                        <Text style={styles.bannerPlaceholderText}>Banner profissional</Text>
                    </View>
                )}
            </View>

            <View style={styles.headerCard}>
                <View style={styles.avatarShadow}>
                    {fotoUrl ? (
                        <Image source={{ uri: fotoUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={54} color="#A0A8B3" />
                        </View>
                    )}
                </View>

                <Text style={styles.nome}>{getNomeProfissional(perfil)}</Text>

                <Text style={styles.subInfo}>
                    {perfil?.categoria || perfil?.especialidade || 'Profissional verificado no app'}
                </Text>

                <View style={styles.ratingRow}>
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

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.primaryAction} onPress={agendarAgora}>
                        <Ionicons name="calendar-outline" size={18} color="#FFF" />
                        <Text style={styles.primaryActionText}>Agendar agora</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryAction} onPress={abrirWhatsApp}>
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        <Text style={styles.secondaryActionText}>WhatsApp</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={toggleFavorito}
                    disabled={loadingFavorito}
                >
                    {loadingFavorito ? (
                        <ActivityIndicator
                            size="small"
                            color={favorito ? '#E63946' : colors.primary}
                        />
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
                                {favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

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
                            {perfil?.endereco ||
                                perfil?.cidade ||
                                perfil?.bairro ||
                                'Endereço não informado'}
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
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Serviços e preços</Text>

                    {servicosSelecionados.length > 0 && (
                        <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#0F9D58" />
                            <Text style={styles.selectedBadgeText}>
                                {servicosSelecionados.length} selecionado(s)
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={styles.servicesHint}>
                    Toque nos serviços para selecionar e continuar o agendamento.
                </Text>

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
                                    <View style={styles.serviceLeft}>
                                        <View
                                            style={[
                                                styles.serviceIcon,
                                                selecionado && styles.serviceIconSelected,
                                            ]}
                                        >
                                            <Ionicons
                                                name={
                                                    selecionado
                                                        ? 'checkmark-circle'
                                                        : 'sparkles-outline'
                                                }
                                                size={18}
                                                color={
                                                    selecionado ? '#0F9D58' : colors.primary
                                                }
                                            />
                                        </View>

                                        <View style={styles.serviceTextBox}>
                                            <Text style={styles.serviceName}>
                                                {servico?.nome || 'Serviço'}
                                            </Text>
                                            <Text style={styles.serviceDescription}>
                                                {servico?.descricao ||
                                                    'Toque para selecionar este serviço.'}
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
                                <Text style={styles.selectionSummaryLabel}>
                                    Serviços selecionados
                                </Text>
                                <Text style={styles.selectionSummaryCount}>
                                    {servicosSelecionados.length}
                                </Text>
                            </View>

                            <Text style={styles.selectionSummaryValue}>
                                {formatarMoeda(totalSelecionado)}
                            </Text>

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
                                <Text style={styles.selectionButtonText}>
                                    Continuar agendamento
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
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

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Avaliações</Text>

                {avaliacoes.length === 0 ? (
                    <CardVazio
                        icon="star-outline"
                        title="Ainda sem avaliações"
                        subtitle="Depois dos atendimentos concluídos, as avaliações vão aparecer aqui."
                    />
                ) : (
                    avaliacoes.slice(0, 5).map((item) => (
                        <View key={item.id} style={styles.reviewCard}>
                            <View style={styles.reviewTop}>
                                <Text style={styles.reviewName}>
                                    {item?.clienteNome || 'Cliente'}
                                </Text>

                                <View style={styles.reviewStars}>
                                    <Ionicons name="star" size={14} color="#F4B400" />
                                    <Text style={styles.reviewStarsText}>
                                        {Number(item?.nota || item?.estrelas || 0).toFixed(1)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.reviewText}>
                                {item?.comentario || 'Sem comentário adicional.'}
                            </Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },

    content: {
        paddingBottom: 28,
    },

    centered: {
        flex: 1,
        backgroundColor: '#F7F9FC',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },

    loadingText: {
        marginTop: 12,
        color: colors.secondary,
        fontSize: 14,
    },

    emptyScreenTitle: {
        marginTop: 14,
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
        textAlign: 'center',
    },

    emptyScreenSubtitle: {
        marginTop: 8,
        fontSize: 14,
        color: colors.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },

    bannerWrapper: {
        width: '100%',
        height: 210,
        backgroundColor: '#EDEFF2',
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
        fontSize: 14,
        color: '#8B95A3',
        fontWeight: '600',
    },

    headerCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: -42,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 22,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E9EEF4',
        elevation: 3,
    },

    avatarShadow: {
        marginTop: -60,
        marginBottom: 12,
    },

    avatar: {
        width: 118,
        height: 118,
        borderRadius: 59,
        borderWidth: 4,
        borderColor: '#FFF',
    },

    avatarPlaceholder: {
        width: 118,
        height: 118,
        borderRadius: 59,
        backgroundColor: '#ECEFF3',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },

    nome: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textDark,
        textAlign: 'center',
    },

    subInfo: {
        marginTop: 6,
        fontSize: 14,
        color: colors.secondary,
        textAlign: 'center',
    },

    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },

    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7E0',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    ratingText: {
        marginLeft: 5,
        fontWeight: '800',
        color: '#A06A00',
    },

    ratingMeta: {
        marginLeft: 10,
        fontSize: 13,
        color: colors.secondary,
    },

    actionRow: {
        width: '100%',
        flexDirection: 'row',
        marginTop: 18,
    },

    primaryAction: {
        flex: 1.1,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },

    primaryActionText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 13,
    },

    secondaryAction: {
        flex: 0.9,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#F7F9FC',
        borderWidth: 1,
        borderColor: '#E5EAF0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    secondaryActionText: {
        color: '#25D366',
        fontWeight: '800',
        marginLeft: 6,
        fontSize: 13,
    },

    favoriteButton: {
        marginTop: 12,
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: '#F8FAFD',
        borderWidth: 1,
        borderColor: '#E7ECF3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    favoriteButtonText: {
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '700',
    },

    card: {
        marginTop: 16,
        marginHorizontal: 16,
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E9EEF4',
        padding: 16,
    },

    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        flexWrap: 'wrap',
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
        marginBottom: 12,
    },

    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECF8F1',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 10,
    },

    selectedBadgeText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '700',
        color: '#0F9D58',
    },

    servicesHint: {
        fontSize: 13,
        color: colors.secondary,
        marginBottom: 10,
        lineHeight: 20,
    },

    description: {
        fontSize: 14,
        color: colors.secondary,
        lineHeight: 22,
    },

    infoList: {
        marginTop: 14,
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },

    infoText: {
        marginLeft: 10,
        fontSize: 14,
        color: colors.textDark,
        flex: 1,
    },

    serviceItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        paddingHorizontal: 4,
    },

    serviceItemSelected: {
        backgroundColor: '#F5FBF7',
        borderBottomColor: '#DDEFE3',
    },

    serviceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 10,
    },

    serviceIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: `${colors.primary}12`,
        justifyContent: 'center',
        alignItems: 'center',
    },

    serviceIconSelected: {
        backgroundColor: '#E8F7EE',
    },

    serviceTextBox: {
        flex: 1,
        marginLeft: 12,
    },

    serviceName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textDark,
    },

    serviceDescription: {
        marginTop: 4,
        fontSize: 12,
        color: colors.secondary,
    },

    serviceRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },

    servicePrice: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: 6,
    },

    selectionSummary: {
        marginTop: 16,
        backgroundColor: '#F8FAFD',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E6EDF5',
        padding: 16,
    },

    selectionSummaryTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    selectionSummaryLabel: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: '700',
    },

    selectionSummaryCount: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.primary,
    },

    selectionSummaryValue: {
        marginTop: 8,
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
    },

    selectionButton: {
        marginTop: 14,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    selectionButtonDisabled: {
        opacity: 0.55,
    },

    selectionButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 14,
    },

    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },

    galleryCard: {
        marginRight: 10,
        marginBottom: 10,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F3F6FA',
        borderWidth: 1,
        borderColor: '#E8EDF3',
    },

    galleryItem: {
        width: '100%',
        height: '100%',
    },

    galleryItemFallback: {
        marginRight: 10,
        marginBottom: 10,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    galleryFallbackText: {
        marginTop: 6,
        fontSize: 11,
        textAlign: 'center',
        color: '#64748B',
    },

    reviewCard: {
        backgroundColor: '#F9FBFD',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#EDF2F6',
        padding: 12,
        marginBottom: 10,
    },

    reviewTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    reviewName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textDark,
        flex: 1,
        marginRight: 8,
    },

    reviewStars: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    reviewStarsText: {
        marginLeft: 4,
        fontWeight: '700',
        color: '#A06A00',
    },

    reviewText: {
        marginTop: 8,
        fontSize: 13,
        color: colors.secondary,
        lineHeight: 20,
    },

    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FBFD',
        borderWidth: 1,
        borderColor: '#EDF2F6',
        borderRadius: 16,
        paddingVertical: 26,
        paddingHorizontal: 16,
    },

    emptyTitle: {
        marginTop: 10,
        fontSize: 15,
        fontWeight: '800',
        color: colors.textDark,
        textAlign: 'center',
    },

    emptySubtitle: {
        marginTop: 6,
        fontSize: 12,
        color: colors.secondary,
        textAlign: 'center',
        lineHeight: 19,
    },
});