import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import {
    collection,
    onSnapshot,
    doc,
    deleteDoc,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function FavoritosCliente({ navigation }) {
    const [favoritos, setFavoritos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;

        if (!user) {
            setLoading(false);
            return;
        }

        const favoritosRef = collection(db, "usuarios", user.uid, "favoritos");

        const unsubscribe = onSnapshot(
            favoritosRef,
            (snapshot) => {
                const lista = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));

                const ordenada = lista.sort((a, b) => {
                    const dataA = a.createdAt?.seconds || 0;
                    const dataB = b.createdAt?.seconds || 0;
                    return dataB - dataA;
                });

                setFavoritos(ordenada);
                setLoading(false);
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

    const removerFavorito = (item) => {
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
        navigation.navigate("PerfilProfissional", {
            proId: item.profissionalId || item.id,
        });
    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => abrirPerfil(item)}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(item.nome || "P").charAt(0)}
                    </Text>
                </View>

                <View style={styles.infoArea}>
                    <Text style={styles.nome}>{item.nome || "Profissional"}</Text>
                    <Text style={styles.especialidade}>
                        {item.especialidade || "Especialidade não informada"}
                    </Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.secondary} />
                        <Text style={styles.cidade}>{item.cidade || "Cidade não informada"}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.heartButton}
                    onPress={() => removerFavorito(item)}
                >
                    <Ionicons name="heart" size={22} color="#E63946" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profissionais Favoritos</Text>
                <Text style={styles.subtitle}>
                    {favoritos.length} profissional(is) salvo(s)
                </Text>
            </View>

            <FlatList
                data={favoritos}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="heart-outline" size={40} color="#BBB" />
                        <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
                        <Text style={styles.emptyText}>
                            Os profissionais que você favoritar aparecerão aqui.
                        </Text>
                    </View>
                }
            />
        </View>
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

    header: {
        padding: 25,
        paddingTop: 60,
        backgroundColor: '#FFF',
    },

    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    subtitle: {
        fontSize: 14,
        color: colors.secondary,
        marginTop: 4,
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },

    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.inputFill,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.primary,
    },

    infoArea: {
        flex: 1,
        marginLeft: 14,
    },

    nome: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    especialidade: {
        fontSize: 13,
        color: colors.secondary,
        marginTop: 2,
    },

    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },

    cidade: {
        marginLeft: 4,
        fontSize: 12,
        color: colors.secondary,
    },

    heartButton: {
        padding: 8,
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
});