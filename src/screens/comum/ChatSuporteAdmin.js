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
    increment,
    where,
    getDocs,
    limit as firestoreLimit
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
    const [processandoSaque, setProcessandoSaque] = useState(false);
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

    const gerenciarStatusSaque = async (mensagemId, novoStatus, saqueIdExistente = null, valorSaqueExistente = null) => {
        if (processandoSaque) return;

        Alert.alert(
            novoStatus === 'concluido' ? 'Confirmar Saque' : 'Recusar Saque',
            novoStatus === 'concluido' 
                ? 'Você confirma que já realizou a transferência Pix e deseja marcar como CONCLUÍDO?'
                : 'Deseja recusar esta solicitação de saque?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            setProcessandoSaque(true);

                            let saqueId = saqueIdExistente;
                            let valorSaque = valorSaqueExistente;

                            // Se não tivermos o ID direto (mensagens antigas), fazemos a query que exige índice
                            if (!saqueId) {
                                console.log('Buscando saque via query (fallback)...');
                                const saquesRef = collection(db, 'saques');
                                const q = query(
                                    saquesRef, 
                                    where('userId', '==', userId), 
                                    where('status', '==', 'pendente'),
                                    orderBy('criadoEm', 'desc'),
                                    firestoreLimit(1)
                                );
                                
                                const querySnapshot = await getDocs(q);
                                
                                if (querySnapshot.empty) {
                                    throw new Error('Nenhuma solicitação de saque pendente encontrada.');
                                }

                                const saqueDoc = querySnapshot.docs[0];
                                saqueId = saqueDoc.id;
                                valorSaque = saqueDoc.data().valor || 0;
                            }

                            // 2. Atualizar o status do saque na coleção 'saques'
                            await updateDoc(doc(db, 'saques', saqueId), {
                                status: novoStatus,
                                atualizadoEm: serverTimestamp(),
                                finalizadoEm: serverTimestamp()
                            });

                            // 3. Atualizar a mensagem no chat de suporte para desativar os botões
                            await updateDoc(doc(db, 'suporte', userId, 'mensagens', mensagemId), {
                                statusSaque: novoStatus,
                                processadoEm: serverTimestamp()
                            });

                            // 4. Se for RECUSADO, devolver o saldo ao profissional
                            if (novoStatus === 'recusado' && valorSaque > 0) {
                                const saldoRef = doc(db, 'saldos', userId);
                                await updateDoc(saldoRef, {
                                    valor: increment(valorSaque),
                                    saldoDisponivel: increment(valorSaque),
                                    ultimaAtualizacao: serverTimestamp()
                                });
                            }

                            // 5. Enviar mensagem de confirmação no chat
                            const msgConfirmacao = novoStatus === 'concluido'
                                ? `✅ Saque de R$ ${Number(valorSaque).toFixed(2)} foi CONCLUÍDO. O comprovante já está disponível no seu financeiro.`
                                : `❌ Sua solicitação de saque de R$ ${Number(valorSaque).toFixed(2)} foi RECUSADA. O valor foi devolvido ao seu saldo disponível.`;

                            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                                texto: msgConfirmacao,
                                senderId: 'admin',
                                createdAt: serverTimestamp(),
                                isSystem: true
                            });

                            // 6. Atualizar o chat principal
                            await updateDoc(doc(db, 'suporte', userId), {
                                ultimaMensagem: msgConfirmacao,
                                dataUltimaMensagem: serverTimestamp(),
                                naoLidasUsuario: increment(1),
                                temSaquePendente: false
                            });

                            Alert.alert('Sucesso', `Saque marcado como ${novoStatus.toUpperCase()} com sucesso!`);

                        } catch (error) {
                            console.error("Erro ao gerenciar saque:", error);
                            Alert.alert("Erro", error.message || "Não foi possível atualizar o status do saque.");
                        } finally {
                            setProcessandoSaque(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => {
        const ehAdmin = item.senderId === 'admin';
        const ehSaque = item.tipo === 'saque' || item.isSystem;

        return (
            <View style={[
                styles.messageContainer,
                ehAdmin ? styles.myMessage : styles.userMessage,
                ehSaque && styles.systemMessageContainer
            ]}>
                <View style={[
                    styles.messageBubble,
                    ehAdmin ? styles.myBubble : (ehSaque ? styles.saqueBubble : styles.userBubble)
                ]}>
                    <Text style={[
                        styles.messageText,
                        ehAdmin ? styles.myMessageText : (ehSaque ? styles.saqueMessageText : styles.userMessageText)
                    ]}>
                        {item.texto}
                    </Text>

                    {/* Botões de Ação para Saques Pendentes */}
                    {item.tipo === 'saque' && !item.statusSaque && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.approveButton]}
                                onPress={() => gerenciarStatusSaque(item.id, 'concluido', item.saqueId, item.valorSaque)}
                                disabled={processandoSaque}
                            >
                                {processandoSaque ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                                        <Text style={styles.actionButtonText}>Aprovar Saque</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={() => gerenciarStatusSaque(item.id, 'recusado', item.saqueId, item.valorSaque)}
                                disabled={processandoSaque}
                            >
                                <Ionicons name="close-circle" size={16} color="#FFF" />
                                <Text style={styles.actionButtonText}>Recusar</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Badge de Status se já processado */}
                    {item.statusSaque && (
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.statusSaque === 'concluido' ? '#4CAF50' : '#F44336' }
                        ]}>
                            <Text style={styles.statusBadgeText}>
                                {item.statusSaque === 'concluido' ? 'SAQUE CONCLUÍDO' : 'SAQUE RECUSADO'}
                            </Text>
                        </View>
                    )}
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
    systemMessageContainer: {
        maxWidth: '90%',
        alignSelf: 'center',
    },
    saqueBubble: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E1E8F0',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800', // Alerta para saque
    },
    saqueMessageText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 12,
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        flex: 0.48,
        justifyContent: 'center',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    statusBadge: {
        marginTop: 10,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    statusBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
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