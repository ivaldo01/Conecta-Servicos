import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc,
    updateDoc,
    increment
} from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import { useUsuario } from '../../hooks/useUsuario';
import { enviarPushSuporte } from '../../utils/notificationUtils';

export default function SuporteScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { dadosUsuario } = useUsuario(auth.currentUser?.uid);
    const [mensagens, setMensagens] = useState([]);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();
    const soundRef = useRef();

    const userId = auth.currentUser?.uid;

    async function tocarSomMensagem() {
        try {
            // Verifica se o módulo Audio e o método createAsync existem antes de tentar usar
            if (!Audio || typeof Audio.Sound?.createAsync !== 'function') {
                console.log('Módulo de áudio não disponível');
                return;
            }

            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }
            // Som de "pop" ou "ding" leve (usando um recurso do sistema ou link)
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' } // Som de notificação curta
            );
            soundRef.current = sound;
            await sound.playAsync();
        } catch (error) {
            console.log('Erro ao tocar som:', error);
        }
    }

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    useEffect(() => {
        if (!userId) return;

        const mensagensRef = collection(db, 'suporte', userId, 'mensagens');
        const q = query(mensagensRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Tocar som se houver uma nova mensagem que não seja do usuário
            if (mensagens.length > 0 && msgs.length > mensagens.length) {
                const ultimaMsg = msgs[msgs.length - 1];
                if (ultimaMsg.senderId !== userId) {
                    tocarSomMensagem();
                }
            }

            setMensagens(msgs);
            setLoading(false);

            // Scroll para o final
            setTimeout(() => {
                if (flatListRef.current && msgs.length > 0) {
                    flatListRef.current.scrollToEnd({ animated: true });
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [userId, mensagens]);

    const enviarMensagem = async () => {
        if (!novaMensagem.trim() || !userId) return;

        const texto = novaMensagem.trim();
        setNovaMensagem('');

        try {
            // Referência do chat principal para atualizar o status (para o admin ver)
            const chatRef = doc(db, 'suporte', userId);

            // Se for a primeira mensagem, cria o documento do chat
            await setDoc(chatRef, {
                userId: userId,
                nomeUsuario: dadosUsuario?.nome || 'Usuário',
                fotoUsuario: dadosUsuario?.foto || null,
                perfilUsuario: dadosUsuario?.perfil || 'cliente',
                ultimaMensagem: texto,
                dataUltimaMensagem: serverTimestamp(),
                naoLidasAdmin: increment(1),
                ativo: true
            }, { merge: true });

            // Adiciona a mensagem na subcoleção
            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                texto: texto,
                senderId: userId,
                createdAt: serverTimestamp()
            });

            // Buscar UIDs de admins para enviar push
            // Por enquanto, enviamos para um admin fixo ou buscamos na coleção (ideal seria via Cloud Function)
            // Como estamos no frontend, vamos disparar o push para o administrador
            // NOTA: Você deve substituir o 'ID_DO_ADMIN' pelo seu UID real ou implementar uma busca
            await enviarPushSuporte({
                toUserId: '7edPEpYjeLNXjsKcqAYLcniJWal1', // VOCÊ PRECISA COLOCAR SEU UID AQUI
                titulo: `Suporte: ${dadosUsuario?.nome || 'Usuário'}`,
                mensagem: texto,
                screen: 'PainelAdminSuporte',
                channelId: 'suporte-admin'
            });

        } catch (error) {
            console.error("Erro ao enviar mensagem de suporte:", error);
            Alert.alert("Erro", "Não foi possível enviar sua mensagem.");
        }
    };

    const renderItem = ({ item }) => {
        const ehEu = item.senderId === userId;

        return (
            <View style={[
                styles.messageContainer,
                ehEu ? styles.myMessage : styles.supportMessage
            ]}>
                {!ehEu && (
                    <View style={styles.supportAvatar}>
                        <Ionicons name="headset" size={16} color="#FFF" />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    ehEu ? styles.myBubble : styles.supportBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        ehEu ? styles.myMessageText : styles.supportMessageText
                    ]}>
                        {item.texto}
                    </Text>
                </View>
            </View>
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Suporte Conecta</Text>
                    <Text style={styles.headerStatus}>Online</Text>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={mensagens}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
                <TextInput
                    style={styles.input}
                    placeholder="Como podemos ajudar?"
                    value={novaMensagem}
                    onChangeText={setNovaMensagem}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendButton, !novaMensagem.trim() && styles.sendButtonDisabled]}
                    onPress={enviarMensagem}
                    disabled={!novaMensagem.trim()}
                >
                    <Ionicons name="send" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E1E8F0',
    },
    backButton: {
        padding: 4,
    },
    headerInfo: {
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    headerStatus: {
        fontSize: 12,
        color: '#16A34A',
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '80%',
    },
    myMessage: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    supportMessage: {
        alignSelf: 'flex-start',
    },
    supportAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 18,
    },
    myBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    supportBubble: {
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E1E8F0',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFF',
    },
    supportMessageText: {
        color: '#1A1A1A',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E1E8F0',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#F0F3F8',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        paddingTop: 8,
        maxHeight: 100,
        fontSize: 15,
        color: '#1A1A1A',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#CCC',
    },
});