import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    where
} from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import { useUsuario } from '../../hooks/useUsuario';

export default function PainelAdminSuporte({ navigation }) {
    const { dadosUsuario } = useUsuario(auth.currentUser?.uid);
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    // Lista de administradores autorizados (UIDs)
    // No futuro isso pode ser um campo no Firestore 'isAdmin: true'
    const ADMIN_UIDS = ['ADMIN_UID_AQUI', auth.currentUser?.uid]; // Adicionei o UID atual para teste

    useEffect(() => {
        // Se quiser restringir, descomente abaixo
        // if (!ADMIN_UIDS.includes(auth.currentUser?.uid)) {
        //     Alert.alert("Acesso Negado", "Você não tem permissão para acessar esta área.");
        //     navigation.goBack();
        //     return;
        // }

        const q = query(
            collection(db, 'suporte'),
            orderBy('dataUltimaMensagem', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChats(chatsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const abrirChat = (chat) => {
        // Resetar contador de não lidas ao abrir (opcional)
        // updateDoc(doc(db, 'suporte', chat.id), { naoLidasAdmin: 0 });

        navigation.navigate('ChatSuporteAdmin', {
            userId: chat.id,
            nomeUsuario: chat.nomeUsuario
        });
    };

    const renderChat = ({ item }) => {
        const data = item.dataUltimaMensagem?.toDate();
        const dataFormatada = data ? data.toLocaleDateString() + ' ' + data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        return (
            <TouchableOpacity
                style={styles.chatCard}
                onPress={() => abrirChat(item)}
            >
                <View style={styles.avatarContainer}>
                    {item.fotoUsuario ? (
                        <Image source={{ uri: item.fotoUsuario }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: item.perfilUsuario === 'profissional' ? '#E1F5FE' : '#F3E5F5' }]}>
                            <Ionicons
                                name={item.perfilUsuario === 'profissional' ? "briefcase" : "person"}
                                size={24}
                                color={item.perfilUsuario === 'profissional' ? "#0288D1" : "#7B1FA2"}
                            />
                        </View>
                    )}
                    {item.naoLidasAdmin > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.naoLidasAdmin}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.userName}>{item.nomeUsuario}</Text>
                        <Text style={styles.timeText}>{dataFormatada}</Text>
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.ultimaMensagem}
                    </Text>
                    <Text style={styles.userRole}>
                        {item.perfilUsuario === 'profissional' ? 'Profissional' : 'Cliente'}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Painel de Suporte</Text>
            </View>

            <FlatList
                data={chats}
                keyExtractor={item => item.id}
                renderItem={renderChat}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>Nenhuma solicitação de suporte aberta.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E1E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: 12,
    },
    listContent: {
        padding: 16,
    },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderBottomColor: '#E1E8F0',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderBottomColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    chatInfo: {
        flex: 1,
        marginLeft: 12,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    timeText: {
        fontSize: 12,
        color: '#666',
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
});