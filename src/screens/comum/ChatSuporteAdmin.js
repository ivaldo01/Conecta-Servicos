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
    updateDoc,
    increment
} from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import { enviarPushSuporte } from '../../utils/notificationUtils';

export default function ChatSuporteAdmin({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { userId, nomeUsuario } = route.params;
    const [mensagens, setMensagens] = useState([]);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();
    const soundRef = useRef();

    async function tocarSomNotificacao() {
        try {
            // Verifica se o módulo Audio e o método createAsync existem antes de tentar usar
            if (!Audio || typeof Audio.Sound?.createAsync !== 'function') {
                console.log('Módulo de áudio não disponível');
                return;
            }

            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }
            // Som de alerta um pouco mais chamativo para o admin
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3' }
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

        // Resetar contador de não lidas ao entrar no chat
        updateDoc(doc(db, 'suporte', userId), { naoLidasAdmin: 0 });

        const mensagensRef = collection(db, 'suporte', userId, 'mensagens');
        const q = query(mensagensRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Tocar som se houver uma nova mensagem que não seja do admin
            if (mensagens.length > 0 && msgs.length > mensagens.length) {
                const ultimaMsg = msgs[msgs.length - 1];
                if (ultimaMsg.senderId !== 'admin') {
                    tocarSomNotificacao();
                }
            }

            setMensagens(msgs);
            setLoading(false);

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
            // Atualizar o chat principal para mostrar que o admin respondeu
            const chatRef = doc(db, 'suporte', userId);
            await updateDoc(chatRef, {
                ultimaMensagem: texto,
                dataUltimaMensagem: serverTimestamp(),
                naoLidasUsuario: increment(1) // O usuário terá uma nova mensagem não lida
            });

            // Adiciona a mensagem na subcoleção (com ID 'admin')
            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                texto: texto,
                senderId: 'admin',
                createdAt: serverTimestamp()
            });

            // Enviar PUSH para o usuário (cliente ou profissional)
            await enviarPushSuporte({
                toUserId: userId,
                titulo: 'Resposta do Suporte Conecta',
                mensagem: texto,
                screen: 'Suporte',
                channelId: 'suporte-usuario'
            });

        } catch (error) {
            console.error("Erro ao enviar resposta do admin:", error);
            Alert.alert("Erro", "Não foi possível enviar sua resposta.");
        }
    };

    const renderItem = ({ item }) => {
        const ehAdmin = item.senderId === 'admin';

        return (
            <View style={[
                styles.messageContainer,
                ehAdmin ? styles.myMessage : styles.userMessage
            ]}>
                <View style={[
                    styles.messageBubble,
                    ehAdmin ? styles.myBubble : styles.userBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        ehAdmin ? styles.myMessageText : styles.userMessageText
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
                    <Text style={styles.headerTitle}>{nomeUsuario}</Text>
                    <Text style={styles.headerStatus}>Respondendo como Suporte</Text>
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
                    placeholder="Digite sua resposta..."
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
        color: '#666',
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
    userMessage: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 18,
    },
    myBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    userBubble: {
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderBottomColor: '#E1E8F0',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#FFF',
    },
    userMessageText: {
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