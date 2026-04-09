import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    FlatList,
    Alert,
    Image,
    Platform,
    useWindowDimensions,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
} from 'firebase/firestore';

import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import Sidebar from '../../components/Sidebar';

function getNomeProfissional(item) {
    return (
        item?.nome ||
        item?.nomeCompleto ||
        item?.nomeNegocio ||
        item?.nomeFantasia ||
        'Profissional'
    );
}

function getCidade(item) {
    return (
        item?.cidade ||
        item?.localizacao?.cidade ||
        'Cidade não informada'
    );
}

function getAvatar(item) {
    return (
        item?.fotoPerfil ||
        item?.foto ||
        item?.avatar ||
        item?.photoURL ||
        item?.photoUrl ||
        null
    );
}

function getBanner(item) {
    return (
        item?.bannerPerfil ||
        item?.banner ||
        item?.capaPerfil ||
        item?.capa ||
        item?.bannerUrl ||
        item?.imagemBanner ||
        null
    );
}

function getEspecialidade(item) {
    return (
        item?.especialidade ||
        item?.categoriaNome ||
        item?.categoria ||
        'Especialidade não informada'
    );
}

export default function FavoritosCliente({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [favoritos, setFavoritos] = useState([]);
    const [removendoId, setRemovendoId] = useState(null);

    const { width: windowWidth } = useWindowDimensions();
    const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

    const carregarFavoritos = useCallback(async () => {
        const user = auth.currentUser;

        if (!user?.uid) {
            setFavoritos([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const favoritosRef = collection(db, 'usuarios', user.uid, 'favoritos');
            const favoritosSnap = await getDocs(favoritosRef);

            const listaBase = favoritosSnap.docs.map((item) => ({
                id: item.id,
                ...item.data(),
            }));

            const listaCompleta = await Promise.all(
                listaBase.map(async (item) => {
                    const profissionalId = item?.profissionalId || item?.id;

                    const baseSegura = {
                        ...item,
                        profissionalId,
                        nome:
                            item?.nome ||
                            item?.nomeCompleto ||
                            item?.nomeFantasia ||
                            item?.nomeNegocio ||
                            'Profissional',
                        especialidade:
                            item?.especialidade ||
                            item?.categoriaNome ||
                            item?.categoria ||
                            'Especialidade não informada',
                        cidade:
                            item?.cidade ||
                            item?.localizacao?.cidade ||
                            'Cidade não informada',
                        fotoPerfil:
                            item?.fotoPerfil ||
                            item?.foto ||
                            item?.avatar ||
                            '',
                        bannerPerfil:
                            item?.bannerPerfil ||
                            item?.banner ||
                            '',
                    };

                    if (!profissionalId) return baseSegura;

                    try {
                        const profissionalRef = doc(db, 'usuarios', profissionalId);
                        const profissionalSnap = await getDoc(profissionalRef);

                        if (!profissionalSnap.exists()) return baseSegura;

                        const dados = profissionalSnap.data();

                        return {
                            ...baseSegura,
                            nome: dados?.nome || dados?.nomeCompleto || dados?.nomeFantasia || dados?.nomeNegocio || baseSegura.nome,
                            especialidade: dados?.especialidade || dados?.categoriaNome || dados?.categoria || baseSegura.especialidade,
                            cidade: dados?.cidade || dados?.localizacao?.cidade || baseSegura.cidade,
                            fotoPerfil: dados?.fotoPerfil || dados?.foto || dados?.avatar || dados?.photoURL || dados?.photoUrl || baseSegura.fotoPerfil,
                            bannerPerfil: dados?.bannerPerfil || dados?.banner || dados?.capaPerfil || dados?.capa || dados?.bannerUrl || dados?.imagemBanner || baseSegura.bannerPerfil,
                        };
                    } catch (error) {
                        return baseSegura;
                    }
                })
            );

            setFavoritos(listaCompleta);
        } catch (error) {
            console.log('Erro ao carregar favoritos:', error);
            Alert.alert('Erro', 'Não foi possível carregar seus favoritos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        carregarFavoritos();
    }, [carregarFavoritos]);

    const abrirPerfil = useCallback((item) => {
        const profissionalId = item?.profissionalId || item?.id;
        if (!profissionalId) return;

        navigation.navigate('PerfilPublicoProfissional', {
            profissionalId,
            perfilInicial: item,
        });
    }, [navigation]);

    const removerFavorito = useCallback(async (item) => {
        const user = auth.currentUser;
        if (!user?.uid) return;

        try {
            setRemovendoId(item.id);
            await deleteDoc(doc(db, 'usuarios', user.uid, 'favoritos', item.id));
            setFavoritos((prev) => prev.filter((fav) => fav.id !== item.id));
        } catch (error) {
            console.log('Erro ao remover favorito:', error);
            Alert.alert('Erro', 'Não foi possível remover dos favoritos.');
        } finally {
            setRemovendoId(null);
        }
    }, []);

    const confirmarRemocao = useCallback((item) => {
        Alert.alert(
            'Remover favorito',
            `Deseja remover ${getNomeProfissional(item)} dos favoritos?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => removerFavorito(item) },
            ]
        );
    }, [removerFavorito]);

    const irParaBusca = useCallback(() => {
        navigation.navigate('BuscaProfissionais');
    }, [navigation]);

    const renderItem = ({ item }) => {
        const avatar = getAvatar(item);
        const banner = getBanner(item);

        return (
            <TouchableOpacity
                style={[styles.card, isLargeScreen && styles.cardLarge]}
                activeOpacity={0.92}
                onPress={() => abrirPerfil(item)}
            >
                <View style={styles.bannerArea}>
                    {banner ? (
                        <Image source={{ uri: banner }} style={styles.bannerImage} />
                    ) : (
                        <View style={styles.bannerFallback}>
                            <Ionicons name="image-outline" size={20} color="#B0B7C3" />
                        </View>
                    )}
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.avatarWrap}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarLetter}>
                                    {getNomeProfissional(item).charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.nome} numberOfLines={1}>{getNomeProfissional(item)}</Text>
                        <Text style={styles.especialidade} numberOfLines={1}>{getEspecialidade(item)}</Text>
                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={14} color={colors.secondary} />
                            <Text style={styles.metaText} numberOfLines={1}>{getCidade(item)}</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.removeBtn} onPress={() => confirmarRemocao(item)}>
                            {removendoId === item.id ? (
                                <ActivityIndicator size="small" color="#E63946" />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={18} color="#E63946" />
                                    <Text style={styles.removeBtnText}>Remover</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando favoritos...</Text>
            </View>
        );
    }

    const MainContent = (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, isLargeScreen && styles.contentLarge]}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
                <View style={styles.headerCircle} />
                <View style={styles.headerCircleTwo} />
                <View style={[styles.headerContent, isLargeScreen && styles.headerContentLarge]}>
                    <Text style={styles.title}>Meus Favoritos</Text>
                    <Text style={styles.subtitle}>Profissionais que você salvou para consultar depois</Text>
                </View>
            </View>

            <View style={[styles.summaryCard, isLargeScreen && styles.summaryCardLarge]}>
                <Text style={styles.summaryNumber}>{favoritos.length}</Text>
                <Text style={styles.summaryText}>profissional(is) salvo(s) na sua lista</Text>
            </View>

            {favoritos.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="heart-outline" size={30} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
                    <Text style={styles.emptySubtitle}>Quando você favoritar profissionais, eles aparecerão aqui.</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={irParaBusca}>
                        <Ionicons name="search-outline" size={18} color="#FFF" />
                        <Text style={styles.emptyButtonText}>Buscar profissionais</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={isLargeScreen ? styles.gridDesktop : null}>
                    {favoritos.map((item) => (
                        <View key={item.id} style={isLargeScreen ? styles.gridItemDesktop : null}>
                            {renderItem({ item })}
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );

    return (
        <View style={styles.screenContainer}>
            {isLargeScreen ? (
                <View style={styles.webLayout}>
                    <Sidebar navigation={navigation} activeRoute="FavoritosCliente" />
                    <View style={styles.webContentArea}>
                        {MainContent}
                    </View>
                </View>
            ) : (
                <SafeAreaView style={styles.container}>
                    {MainContent}
                </SafeAreaView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#F0F3F8',
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
        paddingHorizontal: 40,
        paddingTop: 32,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F3F8',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.secondary,
    },
    header: {
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 18,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    headerLarge: {
        paddingTop: 48,
        paddingBottom: 48,
        borderRadius: 0,
    },
    headerCircle: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -34,
        right: -18,
    },
    headerCircleTwo: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -18,
        left: -10,
    },
    headerContent: {
        zIndex: 2,
    },
    headerContentLarge: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: 'rgba(255,255,255,0.84)',
        textAlign: 'center',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 28,
    },
    scrollContentContainerLarge: {
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: 40,
        paddingTop: 32,
    },
    summaryCard: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },
    summaryCardLarge: {
        marginHorizontal: 0,
        marginBottom: 24,
    },
    summaryNumber: {
        fontSize: 26,
        fontWeight: '800',
        color: colors.primary,
    },
    summaryText: {
        marginTop: 4,
        fontSize: 13,
        color: colors.secondary,
    },
    gridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        justifyContent: 'flex-start',
    },
    gridItemDesktop: {
        width: '25%',
        alignItems: 'center',
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardLarge: {
        marginBottom: 0,
        width: 240,
        minWidth: 240,
    },
    bannerArea: {
        width: '100%',
        height: 100,
        backgroundColor: '#F3F6FA',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    bannerFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#EEF2F7',
    },
    cardContent: {
        padding: 16,
        alignItems: 'center',
    },
    avatarWrap: {
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginTop: -50,
        borderWidth: 4,
        borderColor: '#FFF',
        backgroundColor: '#FFF',
    },
    avatarFallback: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${colors.primary}18`,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -50,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarLetter: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.primary,
    },
    content: {
        alignItems: 'center',
        width: '100%',
        marginBottom: 16,
    },
    nome: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
        textAlign: 'center',
    },
    especialidade: {
        marginTop: 4,
        fontSize: 13,
        color: colors.secondary,
        textAlign: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    metaText: {
        marginLeft: 6,
        fontSize: 12,
        color: colors.secondary,
    },
    actions: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    removeBtnText: {
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '600',
        color: '#E63946',
    },
    emptyState: {
        paddingTop: 40,
        alignItems: 'center',
        paddingHorizontal: 26,
    },
    emptyIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: `${colors.primary}12`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
    },
    emptySubtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: colors.secondary,
        textAlign: 'center',
    },
    emptyButton: {
        marginTop: 18,
        height: 48,
        paddingHorizontal: 18,
        borderRadius: 14,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyButtonText: {
        marginLeft: 8,
        color: '#FFF',
        fontWeight: '800',
        fontSize: 14,
    },
});
