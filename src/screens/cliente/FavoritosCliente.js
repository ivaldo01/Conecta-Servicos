import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Image,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
    collection,
    onSnapshot,
    doc,
    deleteDoc,
    getDoc,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

function getInitial(nome = '') {
    return String(nome).trim().charAt(0).toUpperCase() || 'P';
}

function parseNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

export default function FavoritosCliente({ navigation }) {
    const [favoritos, setFavoritos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    useEffect(() => {
        const user = auth.currentUser;

        if (!user) {
            setLoading(false);
            return;
        }

        const favoritosRef = collection(db, "usuarios", user.uid, "favoritos");

        const unsubscribe = onSnapshot(
            favoritosRef,
            async (snapshot) => {
                try {
                    const listaBase = snapshot.docs.map((d) => ({
                        id: d.id,
                        ...d.data(),
                    }));

                    const listaEnriquecida = await Promise.all(
                        listaBase.map(async (item) => {
                            try {
                                const profissionalId = item.profissionalId || item.id;
                                const profissionalRef = doc(db, "usuarios", profissionalId);
                                const profissionalSnap = await getDoc(profissionalRef);

                                if (!profissionalSnap.exists()) {
                                    return item;
                                }

                                const profissional = profissionalSnap.data();

                                return {
                                    ...item,
                                    profissionalId,
                                    nome:
                                        profissional?.nomeNegocio ||
                                        profissional?.nome ||
                                        profissional?.nomeCompleto ||
                                        item.nome ||
                                        "Profissional",
                                    especialidade:
                                        profissional?.especialidade ||
                                        profissional?.categoriaNome ||
                                        item.especialidade ||
                                        "Especialidade não informada",
                                    cidade:
                                        profissional?.localizacao?.cidade ||
                                        profissional?.cidade ||
                                        item.cidade ||
                                        "Cidade não informada",
                                    estado:
                                        profissional?.localizacao?.estado ||
                                        profissional?.estado ||
                                        "",
                                    bio: profissional?.bio || "",
                                    fotoPerfil: profissional?.fotoPerfil || "",
                                    avaliacaoMedia: parseNumber(profissional?.avaliacaoMedia, 0),
                                    totalAvaliacoes: parseNumber(profissional?.totalAvaliacoes, 0),
                                    verificado: !!profissional?.verificado,
                                };
                            } catch (error) {
                                console.log('Erro ao enriquecer favorito:', error);
                                return item;
                            }
                        })
                    );

                    const ordenada = listaEnriquecida.sort((a, b) => {
                        const dataA = a.createdAt?.seconds || 0;
                        const dataB = b.createdAt?.seconds || 0;
                        return dataB - dataA;
                    });

                    setFavoritos(ordenada);
                } catch (error) {
                    console.log("Erro ao processar favoritos:", error);
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.log("Erro ao carregar favoritos:", error);
                setLoading(false);
            }
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const favoritosFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();

        if (!termo) return favoritos;

        return favoritos.filter((item) => {
            const nome = String(item.nome || '').toLowerCase();
            const especialidade = String(item.especialidade || '').toLowerCase();
            const cidade = String(item.cidade || '').toLowerCase();

            return (
                nome.includes(termo) ||
                especialidade.includes(termo) ||
                cidade.includes(termo)
            );
        });
    }, [favoritos, busca]);

    const removerFavorito = (item) => {
        Keyboard.dismiss();

        const user = auth.currentUser;

        if (!user) {
            Alert.alert("Erro", "Usuário não autenticado.");
            return;
        }

        Alert.alert(
            "Remover dos favoritos",
            `Deseja remover ${item.nome || "este profissional"} dos favoritos?`,
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, remover",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "usuarios", user.uid, "favoritos", item.id));
                            Alert.alert("Pronto", "Profissional removido dos favoritos.");
                        } catch (error) {
                            console.log("Erro ao remover favorito:", error);
                            Alert.alert("Erro", "Não foi possível remover dos favoritos.");
                        }
                    },
                },
            ]
        );
    };

    const abrirPerfil = (item) => {
        Keyboard.dismiss();

        navigation.navigate("PerfilProfissional", {
            proId: item.profissionalId || item.id,
        });
    };

    const renderItem = ({ item }) => {
        const avaliacao = parseNumber(item.avaliacaoMedia, 0);
        const totalAvaliacoes = parseNumber(item.totalAvaliacoes, 0);
        const localizacao = [item.cidade, item.estado].filter(Boolean).join(' - ');

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.92}
                onPress={() => abrirPerfil(item)}
            >
                <View style={styles.avatar}>
                    {item?.fotoPerfil ? (
                        <Image source={{ uri: item.fotoPerfil }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {getInitial(item.nome || "P")}
                        </Text>
                    )}
                </View>

                <View style={styles.infoArea}>
                    <View style={styles.nomeRow}>
                        <Text style={styles.nome} numberOfLines={1}>
                            {item.nome || "Profissional"}
                        </Text>

                        {item.verificado && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={13} color="#23A55A" />
                                <Text style={styles.verifiedText}>Verificado</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.especialidade} numberOfLines={1}>
                        {item.especialidade || "Especialidade não informada"}
                    </Text>

                    {!!item.bio && (
                        <Text style={styles.bio} numberOfLines={2}>
                            {item.bio}
                        </Text>
                    )}

                    <View style={styles.pillsRow}>
                        <View style={styles.infoPill}>
                            <Ionicons name="star" size={14} color="#F4B400" />
                            <Text style={styles.infoPillText}>
                                {avaliacao.toFixed(1)} ({totalAvaliacoes})
                            </Text>
                        </View>

                        <View style={styles.infoPill}>
                            <Ionicons name="location-outline" size={14} color={colors.secondary} />
                            <Text style={styles.infoPillText} numberOfLines={1}>
                                {localizacao || "Cidade não informada"}
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.heartButton}
                    onPress={() => removerFavorito(item)}
                >
                    <Ionicons name="trash-outline" size={20} color="#E63946" />
                </TouchableOpacity>
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profissionais Favoritos</Text>
                <Text style={styles.subtitle}>
                    {favoritosFiltrados.length} profissional(is) salvo(s)
                </Text>
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color="#9AA0A6" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar nos favoritos"
                    placeholderTextColor="#9AA0A6"
                    value={busca}
                    onChangeText={setBusca}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={Keyboard.dismiss}
                />
                {busca.length > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            Keyboard.dismiss();
                            setBusca('');
                        }}
                    >
                        <Ionicons name="close-circle-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={favoritosFiltrados}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="heart-outline" size={42} color="#BBB" />
                        <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
                        <Text style={styles.emptyText}>
                            Os profissionais que você favoritar aparecerão aqui.
                        </Text>

                        <TouchableOpacity
                            style={styles.exploreButton}
                            activeOpacity={0.9}
                            onPress={() => {
                                Keyboard.dismiss();
                                navigation.navigate('BuscaProfissionais');
                            }}
                        >
                            <Ionicons name="search-outline" size={18} color="#FFF" />
                            <Text style={styles.exploreButtonText}>Explorar profissionais</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#F8F9FA',
    },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        marginTop: 10,
        color: colors.secondary,
        fontSize: 14,
    },

    header: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        backgroundColor: '#FFF',
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textDark,
    },

    subtitle: {
        fontSize: 14,
        color: colors.secondary,
        marginTop: 4,
    },

    searchBox: {
        marginHorizontal: 16,
        marginTop: 14,
        marginBottom: 4,
        backgroundColor: '#FFF',
        borderRadius: 16,
        paddingHorizontal: 14,
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },

    searchInput: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        fontSize: 15,
        color: colors.textDark,
    },

    listContent: {
        padding: 16,
        paddingBottom: 30,
        flexGrow: 1,
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },

    avatar: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: colors.inputFill,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },

    avatarImage: {
        width: '100%',
        height: '100%',
    },

    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },

    infoArea: {
        flex: 1,
        marginLeft: 14,
        marginRight: 10,
    },

    nomeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 4,
    },

    nome: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
        paddingRight: 8,
    },

    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF9F1',
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },

    verifiedText: {
        marginLeft: 4,
        fontSize: 11,
        fontWeight: '700',
        color: '#23A55A',
    },

    especialidade: {
        fontSize: 13,
        color: colors.secondary,
        marginTop: 2,
    },

    bio: {
        fontSize: 12,
        color: '#666',
        marginTop: 6,
        lineHeight: 17,
    },

    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
    },

    infoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginRight: 8,
        marginBottom: 8,
    },

    infoPillText: {
        marginLeft: 5,
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '600',
        maxWidth: 120,
    },

    heartButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        paddingHorizontal: 30,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textDark,
        marginTop: 12,
    },

    emptyText: {
        fontSize: 14,
        color: colors.secondary,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },

    exploreButton: {
        marginTop: 18,
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },

    exploreButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
    },
});
