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
    Alert,
    Image,
    Linking,
    Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
import { uploadArquivoSuporte } from '../../services/uploadService';

export default function ChatSuporteAdmin({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { userId, nomeUsuario } = route.params;
    const [mensagens, setMensagens] = useState([]);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [loading, setLoading] = useState(true);
    const [processandoSaque, setProcessandoSaque] = useState(false);
    
    // Anexos
    const [uploading, setUploading] = useState(false);
    const [modalAnexoVisivel, setModalAnexoVisivel] = useState(false);

    const flatListRef = useRef();
    const soundRef = useRef();

    async function tocarSomNotificacao() {
        try {
            if (!Audio || typeof Audio.Sound?.createAsync !== 'function') return;
            if (soundRef.current) await soundRef.current.unloadAsync();
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
            if (soundRef.current) soundRef.current.unloadAsync();
        };
    }, []);

    useEffect(() => {
        if (!userId) return;
        updateDoc(doc(db, 'suporte', userId), { naoLidasAdmin: 0 });

        const mensagensRef = collection(db, 'suporte', userId, 'mensagens');
        const q = query(mensagensRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (mensagens.length > 0 && msgs.length > mensagens.length) {
                const ultimaMsg = msgs[msgs.length - 1];
                if (ultimaMsg.senderId !== 'admin') tocarSomNotificacao();
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

    const atualizarChatPrincipal = async (textoPreview) => {
        const chatRef = doc(db, 'suporte', userId);
        await updateDoc(chatRef, {
            ultimaMensagem: textoPreview,
            dataUltimaMensagem: serverTimestamp(),
            naoLidasUsuario: increment(1)
        });
    };

    const enviarMensagem = async () => {
        if (!novaMensagem.trim() || !userId) return;
        const texto = novaMensagem.trim();
        setNovaMensagem('');

        try {
            await atualizarChatPrincipal(texto);
            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                texto: texto,
                senderId: 'admin',
                createdAt: serverTimestamp()
            });

            await enviarPushSuporte({
                toUserId: userId,
                titulo: 'Resposta do Suporte Conecta',
                mensagem: texto,
                screen: 'Suporte',
                channelId: 'suporte-usuario'
            });
        } catch (error) {
            Alert.alert("Erro", "Não foi possível enviar sua resposta.");
        }
    };

    const gerenciarStatusSaque = async (mensagemId, novoStatus, saqueIdExistente = null, valorSaqueExistente = null) => {
        if (processandoSaque) return;

        Alert.alert(
            novoStatus === 'concluido' ? 'Confirmar Saque' : 'Recusar Saque',
            novoStatus === 'concluido' 
                ? 'Você confirma que já realizou a transação e deseja marcar como CONCLUÍDO?'
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

                            if (!saqueId) {
                                const q = query(
                                    collection(db, 'saques'), 
                                    where('userId', '==', userId), 
                                    where('status', '==', 'pendente'),
                                    orderBy('criadoEm', 'desc'),
                                    firestoreLimit(1)
                                );
                                const querySnapshot = await getDocs(q);
                                if (querySnapshot.empty) throw new Error('Nenhuma solicitação pendente encontrada.');
                                const saqueDoc = querySnapshot.docs[0];
                                saqueId = saqueDoc.id;
                                valorSaque = saqueDoc.data().valor || 0;
                            }

                            await updateDoc(doc(db, 'saques', saqueId), {
                                status: novoStatus,
                                atualizadoEm: serverTimestamp(),
                                finalizadoEm: serverTimestamp()
                            });

                            await updateDoc(doc(db, 'suporte', userId, 'mensagens', mensagemId), {
                                statusSaque: novoStatus,
                                processadoEm: serverTimestamp()
                            });

                            if (novoStatus === 'recusado' && valorSaque > 0) {
                                await updateDoc(doc(db, 'saldos', userId), {
                                    valor: increment(valorSaque),
                                    saldoDisponivel: increment(valorSaque),
                                    ultimaAtualizacao: serverTimestamp()
                                });
                            }

                            const msgConfirmacao = novoStatus === 'concluido'
                                ? `✅ Saque de R$ ${Number(valorSaque).toFixed(2)} foi CONCLUÍDO.`
                                : `❌ Sua solicitação de saque de R$ ${Number(valorSaque).toFixed(2)} foi RECUSADA. O valor retornou ao saldo.`;

                            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                                texto: msgConfirmacao,
                                senderId: 'admin',
                                createdAt: serverTimestamp(),
                                isSystem: true
                            });

                            await updateDoc(doc(db, 'suporte', userId), {
                                ultimaMensagem: msgConfirmacao,
                                dataUltimaMensagem: serverTimestamp(),
                                naoLidasUsuario: increment(1),
                                temSaquePendente: false
                            });

                            Alert.alert('Sucesso', `Saque marcado como ${novoStatus.toUpperCase()}!`);
                        } catch (error) {
                            Alert.alert("Erro", error.message || "Erro ao atualizar status.");
                        } finally {
                            setProcessandoSaque(false);
                        }
                    }
                }
            ]
        );
    };

    // Funcões de Anexo
    const anexarFoto = async () => {
        setModalAnexoVisivel(false);
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) return Alert.alert("Aviso", "Acesso à galeria negado.");
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });
            if (!result.canceled && result.assets) {
                const img = result.assets[0];
                processarUploadAnexo(img.uri, 'image/jpeg', `comprovante_${Date.now()}.jpg`, 'imagem');
            }
        } catch (e) { Alert.alert('Erro', 'Não foi possível selecionar.'); }
    };

    const anexarDocumento = async () => {
        setModalAnexoVisivel(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true
            });
            if (result.type === 'success' || !result.canceled) {
                const docFile = result.assets ? result.assets[0] : result;
                if (!docFile) return;
                const isPdf = docFile.mimeType?.includes('pdf') || docFile.name.endsWith('.pdf');
                processarUploadAnexo(
                    docFile.uri, 
                    docFile.mimeType || (isPdf ? 'application/pdf' : 'application/octet-stream'), 
                    docFile.name, 
                    isPdf ? 'documento' : 'imagem'
                );
            }
        } catch (e) { Alert.alert('Erro', 'Falha ao buscar o arquivo.'); }
    };

    const processarUploadAnexo = async (uri, mimeType, fileName, tipoStr) => {
        try {
            setUploading(true);
            const urlSegura = await uploadArquivoSuporte('admin', uri, mimeType, fileName); // usando folder suporte/admin
            const txtMsg = tipoStr === 'imagem' ? '🖼️ Imagem Enviada' : `📄 ${fileName}`;

            await atualizarChatPrincipal(txtMsg);
            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                texto: txtMsg,
                senderId: 'admin',
                createdAt: serverTimestamp(),
                anexoUrl: urlSegura,
                tipoAnexo: tipoStr
            });

            await enviarPushSuporte({
                toUserId: userId,
                titulo: 'Resposta do Suporte Conecta',
                mensagem: txtMsg,
                screen: 'Suporte',
                channelId: 'suporte-usuario'
            });
        } catch (error) {
            Alert.alert("Erro", "Falha de upload.");
        } finally {
            setUploading(false);
        }
    };

    const abrirAnexo = (url) => {
        if (url) Linking.openURL(url).catch(() => Alert.alert('Aviso', 'Erro ao abrir o link.'));
    };

    const renderItem = ({ item }) => {
        const ehAdmin = item.senderId === 'admin';
        const ehSaque = item.tipo === 'saque' || item.isSystem;
        const ehAnexo = !!item.anexoUrl;

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

                    {ehAnexo ? (
                        <TouchableOpacity onPress={() => abrirAnexo(item.anexoUrl)} activeOpacity={0.8} style={styles.anexoWrapper}>
                            {item.tipoAnexo === 'imagem' ? (
                                <Image source={{ uri: item.anexoUrl }} style={styles.imagemAnexo} resizeMode="cover" />
                            ) : (
                                <View style={[styles.documentoAnexo, ehAdmin ? styles.docMeu : styles.docSuporte]}>
                                    <Ionicons name="document-text" size={32} color={ehAdmin ? "#FFF" : colors.primary} />
                                    <Text style={[styles.docNome, ehAdmin ? styles.myMessageText : styles.userMessageText]} numberOfLines={2}>
                                        {item.texto.replace('📄 ', '')}
                                    </Text>
                                    <View style={styles.btnTocarBaixar}>
                                        <Text style={[styles.txtTocarBaixar, ehAdmin ? styles.txtTocarBaixarEu : styles.txtTocarBaixarSup]}>Abrir Arquivo</Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <Text style={[
                            styles.messageText,
                            ehAdmin ? styles.myMessageText : (ehSaque ? styles.saqueMessageText : styles.userMessageText)
                        ]}>
                            {item.texto}
                        </Text>
                    )}

                    {item.tipo === 'saque' && !item.statusSaque && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.approveButton]}
                                onPress={() => gerenciarStatusSaque(item.id, 'concluido', item.saqueId, item.valorSaque)}
                                disabled={processandoSaque}
                            >
                                {processandoSaque ? <ActivityIndicator size="small" color="#FFF" /> : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                                        <Text style={styles.actionButtonText}>Aprovar</Text>
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

                    {item.statusSaque && (
                        <View style={[styles.statusBadge, { backgroundColor: item.statusSaque === 'concluido' ? '#4CAF50' : '#F44336' }]}>
                            <Text style={styles.statusBadgeText}>
                                {item.statusSaque === 'concluido' ? 'SAQUE CONCLUÍDO' : 'RECUSADO'}
                            </Text>
                        </View>
                    )}
                    
                    <Text style={[styles.messageTime, ehAdmin ? styles.myMessageTime : styles.userMessageTime, ehSaque && {color: '#999'}]}>
                        {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Atendendo: {nomeUsuario}</Text>
                    <Text style={styles.headerStatus}>Módulo Admin</Text>
                </View>
            </View>

            <View style={styles.chatArea}>
                <FlatList
                    ref={flatListRef}
                    data={mensagens}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            </View>

            {uploading && (
                <View style={styles.uploadingBar}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.uploadingText}>Enviando arquivo...</Text>
                </View>
            )}

            <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
                <TouchableOpacity style={styles.attachButton} onPress={() => setModalAnexoVisivel(true)}>
                    <Ionicons name="add-circle" size={28} color={colors.secondary} />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Sua resposta administrativa..."
                    placeholderTextColor="#A0ABC0"
                    value={novaMensagem}
                    onChangeText={setNovaMensagem}
                    multiline
                />
                
                <TouchableOpacity
                    style={[styles.sendButton, (!novaMensagem.trim() && !uploading) ? styles.sendButtonDisabled : {}]}
                    onPress={enviarMensagem}
                    disabled={!novaMensagem.trim() || uploading}
                >
                    <Ionicons name="send" size={18} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Modal de Anexos */}
            <Modal visible={modalAnexoVisivel} transparent animationType="fade" onRequestClose={() => setModalAnexoVisivel(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalAnexoVisivel(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Anexar Comprovante / PDF</Text>
                        <View style={styles.modalOptions}>
                            <TouchableOpacity style={styles.modalOptionBtn} onPress={anexarFoto}>
                                <View style={[styles.modalIconBg, { backgroundColor: '#E1F5FE' }]}>
                                    <Ionicons name="image" size={24} color="#0288D1" />
                                </View>
                                <Text style={styles.modalOptionText}>Foto</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.modalOptionBtn} onPress={anexarDocumento}>
                                <View style={[styles.modalIconBg, { backgroundColor: '#FCE4EC' }]}>
                                    <Ionicons name="document-text" size={24} color="#C2185B" />
                                </View>
                                <Text style={styles.modalOptionText}>Doc/PDF</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setModalAnexoVisivel(false)}>
                            <Text style={styles.modalCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.primary,
    },
    backButton: {
        padding: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        marginRight: 15
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    headerStatus: {
        fontSize: 13,
        color: '#FFF',
        opacity: 0.8,
        marginTop: 2
    },
    chatArea: {
        flex: 1,
        backgroundColor: '#E5DDD5',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden'
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end',
        maxWidth: '85%',
    },
    myMessage: {
        alignSelf: 'flex-end',
    },
    userMessage: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 18,
        elevation: 1,
    },
    myBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
        marginLeft: 40
    },
    userBubble: {
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 4,
        marginRight: 40
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    myMessageText: {
        color: '#FFF',
    },
    userMessageText: {
        color: '#1A202C',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 6,
        alignSelf: 'flex-end',
        fontWeight: '500'
    },
    myMessageTime: { color: 'rgba(255,255,255,0.7)' },
    userMessageTime: { color: '#A0ABC0' },
    
    // Anexos
    anexoWrapper: { marginBottom: 4 },
    imagemAnexo: {
        width: 200, height: 200,
        borderRadius: 12,
        backgroundColor: '#E2E8F0'
    },
    documentoAnexo: {
        width: 220, padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    docMeu: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    docSuporte: {
        backgroundColor: '#F7FAFC',
        borderColor: '#E2E8F0',
    },
    docNome: {
        marginTop: 8, fontSize: 14,
        textAlign: 'center', fontWeight: '600'
    },
    btnTocarBaixar: {
        marginTop: 8, paddingVertical: 4,
        paddingHorizontal: 12, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    txtTocarBaixar: { fontSize: 11, fontWeight: 'bold' },
    txtTocarBaixarEu: { color: '#FFF' },
    txtTocarBaixarSup: { color: colors.primary },

    // Saques
    systemMessageContainer: {
        maxWidth: '90%',
        alignSelf: 'center',
        marginVertical: 8
    },
    saqueBubble: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800', 
    },
    saqueMessageText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 12,
        justifyContent: 'space-between',
    },
    actionButton: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 10,
        borderRadius: 8, flex: 0.48,
        justifyContent: 'center',
    },
    approveButton: { backgroundColor: '#4CAF50' },
    rejectButton: { backgroundColor: '#F44336' },
    actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    statusBadge: {
        marginTop: 10, paddingVertical: 4, paddingHorizontal: 8,
        borderRadius: 4, alignSelf: 'flex-start',
    },
    statusBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

    // Inputs e Modais
    uploadingBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F3F4F6', paddingVertical: 8,
        paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0'
    },
    uploadingText: { marginLeft: 8, color: colors.primary, fontSize: 13, fontWeight: '600' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 12,
        backgroundColor: '#FFF',
    },
    attachButton: { padding: 8, justifyContent: 'center', alignItems: 'center' },
    input: {
        flex: 1, backgroundColor: '#F3F4F6',
        borderRadius: 24, paddingHorizontal: 16,
        paddingVertical: 10, paddingTop: 12,
        fontSize: 15, maxHeight: 120,
        color: '#1A202C', marginHorizontal: 8
    },
    sendButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary, justifyContent: 'center',
        alignItems: 'center', marginBottom: 2
    },
    sendButtonDisabled: { backgroundColor: '#CBD5E1' },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFF', borderTopLeftRadius: 24,
        borderTopRightRadius: 24, padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A202C', marginBottom: 20, textAlign: 'center' },
    modalOptions: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 24 },
    modalOptionBtn: { alignItems: 'center' },
    modalIconBg: {
        width: 64, height: 64, borderRadius: 32,
        justifyContent: 'center', alignItems: 'center', marginBottom: 8
    },
    modalOptionText: { fontSize: 14, fontWeight: '600', color: '#4A5568' },
    modalCancel: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', alignItems: 'center' },
    modalCancelText: { fontSize: 16, fontWeight: '600', color: colors.danger }
});