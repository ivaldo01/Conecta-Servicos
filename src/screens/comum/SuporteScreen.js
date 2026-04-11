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
    setDoc,
    increment
} from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import { useUsuario } from '../../hooks/useUsuario';
import { enviarPushSuporte } from '../../utils/notificationUtils';
import { uploadArquivoSuporte } from '../../services/uploadService';

export default function SuporteScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { dadosUsuario } = useUsuario(auth.currentUser?.uid);
    const [mensagens, setMensagens] = useState([]);
    const [novaMensagem, setNovaMensagem] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [modalAnexoVisivel, setModalAnexoVisivel] = useState(false);
    
    const flatListRef = useRef();
    const soundRef = useRef();
    const userId = auth.currentUser?.uid;

    async function tocarSomMensagem() {
        try {
            if (!Audio || typeof Audio.Sound?.createAsync !== 'function') return;
            if (soundRef.current) await soundRef.current.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' }
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

        const mensagensRef = collection(db, 'suporte', userId, 'mensagens');
        const q = query(mensagensRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (mensagens.length > 0 && msgs.length > mensagens.length) {
                const ultimaMsg = msgs[msgs.length - 1];
                if (ultimaMsg.senderId !== userId) tocarSomMensagem();
            }

            setMensagens(msgs);
            setLoading(false);

            setTimeout(() => {
                if (flatListRef.current && msgs.length > 0) {
                    flatListRef.current.scrollToEnd({ animated: true });
                }
            }, 100);
        }, (error) => {
            console.warn("Erro no snapshot de mensagens: ", error);
        });

        return () => unsubscribe();
    }, [userId, mensagens]);

    const atualizarChatPrincipal = async (textoPreview) => {
        const chatRef = doc(db, 'suporte', userId);
        await setDoc(chatRef, {
            userId: userId,
            nomeUsuario: dadosUsuario?.nome || 'Usuário',
            fotoUsuario: dadosUsuario?.foto || null,
            perfilUsuario: dadosUsuario?.perfil || 'cliente',
            ultimaMensagem: textoPreview,
            dataUltimaMensagem: serverTimestamp(),
            naoLidasAdmin: increment(1),
            ativo: true
        }, { merge: true });
    };

    const enviarMensagem = async () => {
        if (!novaMensagem.trim() || !userId) return;
        const texto = novaMensagem.trim();
        setNovaMensagem('');

        try {
            await atualizarChatPrincipal(texto);
            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                texto: texto,
                senderId: userId,
                createdAt: serverTimestamp()
            });

            await enviarPushSuporte({
                toUserId: '7edPEpYjeLNXjsKcqAYLcniJWal1',
                titulo: `Suporte: ${dadosUsuario?.nome || 'Usuário'}`,
                mensagem: texto,
                screen: 'PainelAdminSuporte',
                channelId: 'suporte-admin'
            });
        } catch (error) {
            Alert.alert("Erro", "Não foi possível enviar sua mensagem.");
        }
    };

    const anexarFoto = async () => {
        setModalAnexoVisivel(false);
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Aviso", "É necessário permissão de galeria para enviar fotos.");
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });

            if (!result.canceled && result.assets) {
                const img = result.assets[0];
                processarUploadAnexo(img.uri, 'image/jpeg', `imagem_${Date.now()}.jpg`, 'imagem');
            }
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        }
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
        } catch (e) {
            Alert.alert('Erro', 'Falha ao buscar o documento.');
        }
    };

    const processarUploadAnexo = async (uri, mimeType, fileName, tipoStr) => {
        try {
            setUploading(true);
            const urlSegura = await uploadArquivoSuporte(userId, uri, mimeType, fileName);
            const txtMsg = tipoStr === 'imagem' ? '🖼️ Imagem Enviada' : `📄 ${fileName}`;

            await atualizarChatPrincipal(txtMsg);
            await addDoc(collection(db, 'suporte', userId, 'mensagens'), {
                texto: txtMsg,
                senderId: userId,
                createdAt: serverTimestamp(),
                anexoUrl: urlSegura,
                tipoAnexo: tipoStr
            });

            await enviarPushSuporte({
                toUserId: '7edPEpYjeLNXjsKcqAYLcniJWal1',
                titulo: `Suporte: ${dadosUsuario?.nome || 'Usuário'}`,
                mensagem: txtMsg,
                screen: 'PainelAdminSuporte',
                channelId: 'suporte-admin'
            });
        } catch (error) {
            Alert.alert("Erro", "O envio do arquivo falhou. Tente novamente.");
        } finally {
            setUploading(false);
        }
    };

    const abrirAnexo = (url) => {
        if (url) Linking.openURL(url).catch(() => Alert.alert('Aviso', 'Não foi possível abrir o link.'));
    };

    const renderItem = ({ item }) => {
        const ehEu = item.senderId === userId;
        const ehAnexo = !!item.anexoUrl;

        return (
            <View style={[styles.messageContainer, ehEu ? styles.myMessage : styles.supportMessage]}>
                {!ehEu && (
                    <View style={styles.supportAvatar}>
                        <Ionicons name="headset" size={16} color="#FFF" />
                    </View>
                )}
                
                <View style={[styles.messageBubble, ehEu ? styles.myBubble : styles.supportBubble]}>
                    {ehAnexo ? (
                        <TouchableOpacity 
                            onPress={() => abrirAnexo(item.anexoUrl)}
                            activeOpacity={0.8}
                            style={styles.anexoWrapper}
                        >
                            {item.tipoAnexo === 'imagem' ? (
                                <Image source={{ uri: item.anexoUrl }} style={styles.imagemAnexo} resizeMode="cover" />
                            ) : (
                                <View style={[styles.documentoAnexo, ehEu ? styles.docMeu : styles.docSuporte]}>
                                    <Ionicons name="document-text" size={32} color={ehEu ? "#FFF" : colors.primary} />
                                    <Text style={[styles.docNome, ehEu ? styles.myMessageText : styles.supportMessageText]} numberOfLines={2}>
                                        {item.texto.replace('📄 ', '')}
                                    </Text>
                                    <View style={styles.btnTocarBaixar}>
                                        <Text style={[styles.txtTocarBaixar, ehEu ? styles.txtTocarBaixarEu : styles.txtTocarBaixarSup]}>Tocar para abrir</Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.messageText, ehEu ? styles.myMessageText : styles.supportMessageText]}>
                            {item.texto}
                        </Text>
                    )}
                    
                    <Text style={[styles.messageTime, ehEu ? styles.myMessageTime : styles.supportMessageTime]}>
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
                    <Text style={styles.headerTitle}>Central de Suporte</Text>
                    <Text style={styles.headerStatus}>Nossa equipe está online</Text>
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
                    <Text style={styles.uploadingText}>Enviando anexo...</Text>
                </View>
            )}

            <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
                <TouchableOpacity style={styles.attachButton} onPress={() => setModalAnexoVisivel(true)}>
                    <Ionicons name="add-circle" size={28} color={colors.secondary} />
                </TouchableOpacity>
                
                <TextInput
                    style={styles.input}
                    placeholder="Escreva sua mensagem..."
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
                        <Text style={styles.modalTitle}>O que deseja enviar?</Text>
                        
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
                                <Text style={styles.modalOptionText}>PDF / Doc</Text>
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
        elevation: 0,
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
        color: 'rgba(255,255,255,0.8)',
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
        flexDirection: 'row-reverse',
    },
    supportMessage: {
        alignSelf: 'flex-start',
    },
    supportAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 4
    },
    messageBubble: {
        padding: 12,
        borderRadius: 18,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    myBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
        marginLeft: 40
    },
    supportBubble: {
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
    supportMessageText: {
        color: '#1A202C',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 6,
        alignSelf: 'flex-end',
        fontWeight: '500'
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    supportMessageTime: {
        color: '#A0ABC0',
    },
    anexoWrapper: {
        marginBottom: 4,
    },
    imagemAnexo: {
        width: 200,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#E2E8F0'
    },
    documentoAnexo: {
        width: 220,
        padding: 12,
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
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '600'
    },
    btnTocarBaixar: {
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    txtTocarBaixar: {
        fontSize: 11,
        fontWeight: 'bold'
    },
    txtTocarBaixarEu: { color: '#FFF' },
    txtTocarBaixarSup: { color: colors.primary },
    uploadingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0'
    },
    uploadingText: {
        marginLeft: 8,
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#FFF',
    },
    attachButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: 12,
        fontSize: 15,
        maxHeight: 120,
        color: '#1A202C',
        marginHorizontal: 8
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2
    },
    sendButtonDisabled: {
        backgroundColor: '#CBD5E1',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A202C',
        marginBottom: 20,
        textAlign: 'center'
    },
    modalOptions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 24
    },
    modalOptionBtn: {
        alignItems: 'center'
    },
    modalIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    modalOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A5568'
    },
    modalCancel: {
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        alignItems: 'center'
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.danger,
    }
});