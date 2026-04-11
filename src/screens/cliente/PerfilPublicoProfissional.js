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
} from 'react-native';
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.nome, isLargeScreen && styles.nomeLarge, { marginBottom: 0 }]}>{getNomeProfissional(perfil)}</Text>
                        {temSeloVerificado(perfil?.planoAtivo) && (
                            <Ionicons name="checkmark-circle" size={24} color="#3498DB" style={{ marginLeft: 6 }} />
                        )}
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
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        <Text style={styles.secondaryActionText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.favoriteButton, isLargeScreen && styles.favoriteButtonLarge]}
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
                                {!isLargeScreen && (
                                    <Text
                                        style={[
                                            styles.favoriteButtonText,
                                            { color: favorito ? '#E63946' : colors.primary },
                                        ]}
                                    >
                                        Favoritar
                                    </Text>
                                )}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
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
        backgroundColor: '#F8FAFC',
    },
    webLayout: {
        flex: 1,
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
    },
    webContentArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
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
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 12,
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    emptyScreenTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
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
        backgroundColor: '#E2E8F0',
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
        backgroundColor: '#FFF',
        marginTop: -30,
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginBottom: 20,
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
        backgroundColor: '#FFF',
        padding: 4,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        marginTop: -60,
        marginBottom: 16,
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
        backgroundColor: '#F1F5F9',
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
        color: '#1E293B',
        textAlign: 'center',
    },
    nomeLarge: {
        textAlign: 'left',
    },
    subInfo: {
        fontSize: 15,
        color: '#64748B',
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
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 10,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#92400E',
        marginLeft: 4,
    },
    ratingMeta: {
        fontSize: 13,
        color: '#94A3B8',
    },
    actionRow: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 24,
        gap: 12,
    },
    actionRowLarge: {
        width: 'auto',
        marginTop: 0,
        marginLeft: 'auto',
    },
    primaryAction: {
        flex: 2,
        backgroundColor: colors.primary,
        height: 50,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryActionLarge: {
        flex: 0,
        paddingHorizontal: 24,
    },
    primaryActionText: {
        color: '#FFF',
        fontWeight: '700',
        marginLeft: 8,
    },
    secondaryAction: {
        flex: 1,
        backgroundColor: '#F0FDF4',
        height: 50,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    secondaryActionLarge: {
        flex: 0,
        paddingHorizontal: 24,
    },
    secondaryActionText: {
        color: '#166534',
        fontWeight: '700',
        marginLeft: 8,
    },
    favoriteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 10,
        width: '100%',
    },
    favoriteButtonLarge: {
        width: 50,
        height: 50,
        marginTop: 0,
        backgroundColor: '#FFF1F2',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FFE4E6',
    },
    favoriteButtonText: {
        marginLeft: 8,
        fontWeight: '700',
        fontSize: 14,
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
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 24,
    },
    infoList: {
        marginTop: 20,
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        color: '#64748B',
        marginLeft: 12,
        flex: 1,
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    galleryCard: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
    },
    galleryItem: {
        width: '100%',
        height: '100%',
    },
    galleryItemFallback: {
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryFallbackText: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 4,
        textAlign: 'center',
    },
    serviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    serviceItemSelected: {
        backgroundColor: '#F0FDF4',
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    serviceLeft: {
        flex: 1,
        marginRight: 16,
    },
    serviceTextBox: {
        flex: 1,
    },
    serviceName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    serviceDescription: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
    },
    serviceRight: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 12,
    },
    servicePrice: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.primary,
    },
    selectionSummary: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
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
        color: '#64748B',
    },
    selectionSummaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
    },
    selectionButton: {
        backgroundColor: colors.primary,
        height: 54,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    selectionButtonDisabled: {
        backgroundColor: '#CBD5E1',
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
        borderBottomColor: '#F8FAFC',
    },
    reviewTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    reviewName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    reviewStars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewStarsText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F59E0B',
        marginLeft: 4,
    },
    reviewText: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    planosCard: {
        marginTop: 16,
        backgroundColor: '#FFF8E1',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FFE0B2',
        padding: 16,
        elevation: 2,
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
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
        backgroundColor: '#FF9800',
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
        color: '#E65100',
    },
    planosCardSubtitle: {
        fontSize: 13,
        color: '#F57C00',
        marginTop: 2,
    },

});