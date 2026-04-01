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

                    if (!profissionalId) {
                        return baseSegura;
                    }

                    try {
                        const profissionalRef = doc(db, 'usuarios', profissionalId);
                        const profissionalSnap = await getDoc(profissionalRef);

                        if (!profissionalSnap.exists()) {
                            return baseSegura;
                        }

                        const dados = profissionalSnap.data();

                        return {
                            ...baseSegura,
                            nome:
                                dados?.nome ||
                                dados?.nomeCompleto ||
                                dados?.nomeFantasia ||
                                dados?.nomeNegocio ||
                                baseSegura.nome,
                            nomeCompleto:
                                dados?.nomeCompleto ||
                                baseSegura?.nomeCompleto ||
                                '',
                            nomeFantasia:
                                dados?.nomeFantasia ||
                                baseSegura?.nomeFantasia ||
                                '',
                            nomeNegocio:
                                dados?.nomeNegocio ||
                                baseSegura?.nomeNegocio ||
                                '',
                            especialidade:
                                dados?.especialidade ||
                                dados?.categoriaNome ||
                                dados?.categoria ||
                                baseSegura.especialidade,
                            categoriaNome:
                                dados?.categoriaNome ||
                                baseSegura?.categoriaNome ||
                                '',
                            cidade:
                                dados?.cidade ||
                                dados?.localizacao?.cidade ||
                                baseSegura.cidade,
                            localizacao:
                                dados?.localizacao ||
                                baseSegura?.localizacao ||
                                null,
                            fotoPerfil:
                                dados?.fotoPerfil ||
                                dados?.foto ||
                                dados?.avatar ||
                                dados?.photoURL ||
                                dados?.photoUrl ||
                                baseSegura.fotoPerfil,
                            bannerPerfil:
                                dados?.bannerPerfil ||
                                dados?.banner ||
                                dados?.capaPerfil ||
                                dados?.capa ||
                                dados?.bannerUrl ||
                                dados?.imagemBanner ||
                                baseSegura.bannerPerfil,
                        };
                    } catch (error) {
                        if (error?.code === 'permission-denied') {
                            console.log(
                                `Sem permissão para ler perfil completo do favorito ${profissionalId}. Usando dados salvos do favorito.`
                            );
                        } else {
                            console.log('Erro ao carregar dados do profissional favorito:', error);
                        }

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

    const abrirPerfil = useCallback(
        (item) => {
            const profissionalId = item?.profissionalId || item?.id;

            if (!profissionalId) {
                Alert.alert('Erro', 'Profissional não encontrado.');
                return;
            }

            navigation.navigate('PerfilPublicoProfissional', {
                profissionalId,
                proId: profissionalId,
                clinicaId: profissionalId,
                perfilInicial: item,
            });
        },
        [navigation]
    );

    const removerFavorito = useCallback(async (item) => {
        const user = auth.currentUser;

        if (!user?.uid) {
            Alert.alert('Erro', 'Usuário não encontrado.');
            return;
        }

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

    const confirmarRemocao = useCallback(
        (item) => {
            Alert.alert(
                'Remover favorito',
                `Deseja remover ${getNomeProfissional(item)} dos favoritos?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Remover',
                        style: 'destructive',
                        onPress: () => removerFavorito(item),
                    },
                ]
            );
        },
        [removerFavorito]
    );

    const irParaBusca = useCallback(() => {
        navigation.navigate('Main', {
            screen: 'ClienteTabs',
            params: {
                screen: 'BuscaProfissionaisTab',
            },
        });
    }, [navigation]);

    const renderItem = ({ item }) => {
        const avatar = getAvatar(item);
        const banner = getBanner(item);

        return (
            <TouchableOpacity
                style={styles.card}
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
                        <Text style={styles.nome} numberOfLines={1}>
                            {getNomeProfissional(item)}
                        </Text>

                        <Text style={styles.especialidade} numberOfLines={1}>
                            {getEspecialidade(item)}
                        </Text>

                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={14} color={colors.secondary} />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {getCidade(item)}
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <Ionicons name="heart" size={14} color="#E63946" />
                            <Text style={styles.metaText}>Favoritado por você</Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.viewBtn}
                            onPress={() => abrirPerfil(item)}
                        >
                            <Ionicons name="eye-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => confirmarRemocao(item)}
                            disabled={removendoId === item.id}
                        >
                            {removendoId === item.id ? (
                                <ActivityIndicator size="small" color="#E63946" />
                            ) : (
                                <Ionicons name="trash-outline" size={18} color="#E63946" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando favoritos...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Meus Favoritos</Text>
                <Text style={styles.subtitle}>
                    Profissionais que você salvou para consultar depois
                </Text>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{favoritos.length}</Text>
                <Text style={styles.summaryText}>profissional(is) salvo(s) na sua lista</Text>
            </View>

            {favoritos.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="heart-outline" size={30} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
                    <Text style={styles.emptySubtitle}>
                        Quando você favoritar profissionais, eles aparecerão aqui.
                    </Text>

                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={irParaBusca}
                    >
                        <Ionicons name="search-outline" size={18} color="#FFF" />
                        <Text style={styles.emptyButtonText}>Buscar profissionais</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={favoritos}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F3F8',
    },

    centered: {
        flex: 1,
        backgroundColor: '#F0F3F8',
        justifyContent: 'center',
        alignItems: 'center',
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
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
    },

    subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: 'rgba(255,255,255,0.84)',
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
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
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

    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 28,
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E8EDF5',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },

    bannerArea: {
        width: '100%',
        height: 84,
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },

    avatarWrap: {
        marginRight: 12,
    },

    avatar: {
        width: 62,
        height: 62,
        borderRadius: 31,
        marginTop: -18,
        borderWidth: 3,
        borderColor: '#FFF',
        backgroundColor: '#FFF',
    },

    avatarFallback: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: `${colors.primary}18`,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -18,
        borderWidth: 3,
        borderColor: '#FFF',
    },

    avatarLetter: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
    },

    content: {
        flex: 1,
        paddingRight: 10,
    },

    nome: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
    },

    especialidade: {
        marginTop: 3,
        fontSize: 13,
        color: colors.secondary,
    },

    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },

    metaText: {
        marginLeft: 6,
        fontSize: 12,
        color: colors.secondary,
        flex: 1,
    },

    actions: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    viewBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: `${colors.primary}12`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },

    removeBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FDEBEC',
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
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
        textAlign: 'center',
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