import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Modal,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { collection, getDocs, doc, deleteDoc, writeBatch, serverTimestamp, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "../../services/firebaseConfig";
import { initializeApp, getApps } from "firebase/app";
import { MultiSelect } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import { getMaxFuncionarios, podeCadastrarFuncionario, getPlanoProfissional } from "../../constants/plans";

export default function GerenciarColaboradores({ navigation }) {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    const [servicosSelecionados, setServicosSelecionados] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [modalServicosVisible, setModalServicosVisible] = useState(false);
    const [colaboradorEditando, setColaboradorEditando] = useState(null);
    const [servicosEdicao, setServicosEdicao] = useState([]);
    const [salvandoServicos, setSalvandoServicos] = useState(false);
    const [planoUsuario, setPlanoUsuario] = useState(null);
    const [carregandoPlano, setCarregandoPlano] = useState(true);

    const emailRef = useRef(null);
    const senhaRef = useRef(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const getResumoServicos = (ids = []) => {
        if (!Array.isArray(ids) || ids.length === 0) return 'Nenhum serviço liberado';

        const nomes = ids
            .map((id) => servicosDisponiveis.find((servico) => servico.value === id)?.label)
            .filter(Boolean);

        return nomes.length > 0 ? nomes.join(', ') : `${ids.length} serviço(s) liberado(s)`;
    };

    const carregarDados = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        setCarregandoPlano(true);
        try {
            // Carregar plano do usuário
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            const planoId = userDoc.data()?.planoAtivo || 'pro_iniciante';
            const plano = getPlanoProfissional(planoId);
            setPlanoUsuario(plano);

            const snapServ = await getDocs(collection(db, "usuarios", user.uid, "servicos"));
            const listaServicos = snapServ.docs.map(d => ({
                label: d.data().nome,
                value: d.id
            }));
            setServicosDisponiveis(listaServicos);

            const snapEquipe = await getDocs(collection(db, "usuarios", user.uid, "colaboradores"));
            setEquipe(snapEquipe.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao carregar dados da equipe.");
        } finally {
            setLoading(false);
            setCarregandoPlano(false);
        }
    };

    const getLimiteFuncionarios = () => {
        if (!planoUsuario) return 0;
        return planoUsuario.maxEmployees || 0;
    };

    const podeAdicionarFuncionario = () => {
        if (!planoUsuario) return false;
        return podeCadastrarFuncionario(planoUsuario.id, equipe.length);
    };

    const getInfoLimite = () => {
        const max = getLimiteFuncionarios();
        if (max === Infinity) return { texto: 'Ilimitado', atingiuLimite: false };
        const atingiuLimite = equipe.length >= max;
        return {
            texto: `${equipe.length} de ${max} funcionários`,
            atingiuLimite
        };
    };

    const abrirEditorServicos = (colaborador) => {
        Keyboard.dismiss();
        setColaboradorEditando(colaborador);
        setServicosEdicao(Array.isArray(colaborador?.servicosHabilitados) ? colaborador.servicosHabilitados : []);
        setModalServicosVisible(true);
    };

    const salvarServicosColaborador = async () => {
        const user = auth.currentUser;

        if (!user || !colaboradorEditando?.id) {
            Alert.alert("Erro", "Não foi possível identificar o colaborador.");
            return;
        }

        setSalvandoServicos(true);

        try {
            const batch = writeBatch(db);
            const payload = {
                servicosHabilitados: Array.isArray(servicosEdicao) ? servicosEdicao : [],
                updatedAt: serverTimestamp(),
            };

            batch.set(doc(db, "usuarios", user.uid, "colaboradores", colaboradorEditando.id), payload, { merge: true });
            batch.set(doc(db, "usuarios", colaboradorEditando.id), payload, { merge: true });
            await batch.commit();

            setEquipe((prev) => prev.map((item) => (
                item.id === colaboradorEditando.id
                    ? { ...item, servicosHabilitados: payload.servicosHabilitados }
                    : item
            )));

            setModalServicosVisible(false);
            setColaboradorEditando(null);
            setServicosEdicao([]);
            Alert.alert("Sucesso", "Serviços do colaborador atualizados com sucesso.");
        } catch (e) {
            console.error("Erro ao atualizar serviços do colaborador:", e);
            Alert.alert("Erro", "Não foi possível atualizar os serviços deste colaborador.");
        } finally {
            setSalvandoServicos(false);
        }
    };

    const salvarColaborador = async () => {
        Keyboard.dismiss();

        // Verificar se pode adicionar mais colaboradores
        if (!podeAdicionarFuncionario()) {
            const limite = getLimiteFuncionarios();
            const info = getInfoLimite();
            Alert.alert(
                "Limite atingido",
                `Seu plano ${planoUsuario?.name || 'Iniciante'} permite até ${limite === 0 ? '0' : limite === Infinity ? 'ilimitados' : limite} funcionários.\n\n` +
                `Você já tem ${equipe.length} funcionário(s).\n\n` +
                (limite === 0
                    ? "Faça upgrade para um plano pago para adicionar funcionários."
                    : "Faça upgrade para o plano Franquia para ter funcionários ilimitados."
                ),
                [
                    { text: "OK", style: "cancel" },
                    { text: "Ver Planos", onPress: () => navigation.navigate("PremiumScreen") }
                ]
            );
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!nome.trim() || !email.trim() || !senha.trim() || servicosSelecionados.length === 0) {
            Alert.alert("Atenção", "Por favor, preencha todos os campos.");
            return;
        }

        if (!emailRegex.test(email.trim())) {
            Alert.alert("E-mail Inválido", "Por favor, insira um e-mail válido para o colaborador.");
            return;
        }

        if (senha.length < 6) {
            Alert.alert("Atenção", "A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        setSalvando(true);

        // Criamos um app secundário para isolar o Auth e não deslogar o gestor
        const secondaryAppName = `SecondaryApp_${Date.now()}`;
        const secondaryApp = initializeApp(app.options, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        const userDono = auth.currentUser;

        try {
            // 1. Criar o usuário no Auth (isolado)
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                email.trim().toLowerCase(),
                senha
            );

            const novoColabId = userCredential.user.uid;

            // 2. Gravar no Firestore (usando o Auth principal do gestor)
            const batch = writeBatch(db);

            // Perfil principal do colaborador
            const usuarioRef = doc(db, "usuarios", novoColabId);
            batch.set(usuarioRef, {
                uid: novoColabId,
                nome: nome.trim(),
                nomeCompleto: nome.trim(),
                email: email.trim().toLowerCase(),
                tipo: "profissional",
                perfil: "colaborador",
                clinicaId: userDono.uid,
                servicosHabilitados: servicosSelecionados,
                ativo: true,
                createdAt: serverTimestamp(),
            });

            // Referência na equipe da empresa
            const subcolabRef = doc(db, "usuarios", userDono.uid, "colaboradores", novoColabId);
            batch.set(subcolabRef, {
                id: novoColabId,
                nome: nome.trim(),
                email: email.trim().toLowerCase(),
                servicosHabilitados: servicosSelecionados,
                ativo: true,
                dataCriacao: serverTimestamp(),
            });

            // Saldo inicial
            const saldoRef = doc(db, "saldos", novoColabId);
            batch.set(saldoRef, {
                usuarioId: novoColabId,
                saldo: 0,
                saldoBloqueado: 0,
                ultimaAtualizacao: serverTimestamp(),
            });

            await batch.commit();

            // 3. Limpar a sessão temporária
            await secondaryAuth.signOut();

            Alert.alert("Sucesso!", "Colaborador criado com sucesso.");

            setNome('');
            setEmail('');
            setSenha('');
            setServicosSelecionados([]);

            await carregarDados();
        } catch (e) {
            console.error("Erro ao criar colaborador:", e);
            let msg = "Erro ao criar colaborador.";
            if (e.code === 'auth/email-already-in-use') msg = "Este e-mail já está em uso.";
            if (e.code === 'auth/weak-password') msg = "A senha deve ter no mínimo 6 caracteres.";

            Alert.alert("Erro", msg);
        } finally {
            setSalvando(false);
        }
    };

    const excluirColaborador = async (id, nome) => {
        const user = auth.currentUser;
        if (!user) return;

        Alert.alert(
            "Remover Colaborador",
            `Deseja realmente remover ${nome} da sua equipe?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Remover",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "usuarios", user.uid, "colaboradores", id));
                            Alert.alert("Sucesso", "Colaborador removido da sua lista.");
                            await carregarDados();
                        } catch (e) {
                            console.error(e);
                            Alert.alert("Erro", "Não foi possível remover o colaborador.");
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.headerTitle}>Minha Equipe</Text>
                    
                    {getLimiteFuncionarios() === 0 ? (
                        <View style={styles.premiumLockCard}>
                            <View style={styles.lockIconCircle}>
                                <Ionicons name="lock-closed" size={40} color={colors.primary} />
                            </View>
                            <Text style={styles.lockTitle}>Funcionalidade Premium</Text>
                            <Text style={styles.lockSubtitle}>
                                O gerenciamento de equipe e subcontas está disponível apenas nos planos Conecta VIP (Profissional, Empresa e Franquia).
                            </Text>
                            <TouchableOpacity 
                                style={styles.upgradeBtn}
                                onPress={() => navigation.navigate("PremiumScreen")}
                            >
                                <Text style={styles.upgradeBtnText}>CONHECER PLANOS VIP</Text>
                                <Ionicons name="star" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {/* Card mostrando limite de funcionários do plano */}
                            {!carregandoPlano && planoUsuario && (
                        <View style={{
                            backgroundColor: getInfoLimite().atingiuLimite ? '#FFEBEE' : '#E3F2FD',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons
                                    name={getInfoLimite().atingiuLimite ? "warning" : "information-circle"}
                                    size={20}
                                    color={getInfoLimite().atingiuLimite ? '#D32F2F' : '#1976D2'}
                                />
                                <Text style={{
                                    marginLeft: 8,
                                    fontSize: 14,
                                    color: getInfoLimite().atingiuLimite ? '#D32F2F' : '#1976D2',
                                    fontWeight: '600',
                                }}>
                                    {getInfoLimite().texto}
                                </Text>
                            </View>
                            <Text style={{
                                fontSize: 12,
                                color: getInfoLimite().atingiuLimite ? '#D32F2F' : '#1976D2',
                            }}>
                                {planoUsuario.name}
                            </Text>
                        </View>
                    )}

                    <View style={styles.helperCard}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                        <Text style={styles.helperText}>
                            Cada colaborador funciona como uma subconta: você define os serviços liberados e a agenda de atendimento de cada um.
                        </Text>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.formSubtitle}>Cadastrar Novo Colaborador</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Nome Completo do Profissional"
                            placeholderTextColor="#999"
                            value={nome}
                            onChangeText={setNome}
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                        />

                        <TextInput
                            ref={emailRef}
                            style={styles.input}
                            placeholder="E-mail (login do colaborador)"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                            onSubmitEditing={() => senhaRef.current?.focus()}
                        />

                        <TextInput
                            ref={senhaRef}
                            style={styles.input}
                            placeholder="Senha de acesso (mín. 6 dígitos)"
                            placeholderTextColor="#999"
                            value={senha}
                            onChangeText={setSenha}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={salvarColaborador}
                        />

                        <Text style={styles.label}>Liberar estes serviços para a subconta:</Text>
                        <MultiSelect
                            style={styles.dropdown}
                            placeholder="Selecione os serviços..."
                            placeholderStyle={styles.dropdownPlaceholder}
                            data={servicosDisponiveis}
                            labelField="label"
                            valueField="value"
                            value={servicosSelecionados}
                            onChange={item => setServicosSelecionados(item)}
                            selectedStyle={styles.selectedChip}
                        />

                        <TouchableOpacity
                            style={[styles.mainButton, salvando && styles.mainButtonDisabled]}
                            onPress={salvarColaborador}
                            disabled={salvando}
                            activeOpacity={0.88}
                        >
                            {salvando ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>CADASTRAR E GERAR LOGIN</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Colaboradores cadastrados</Text>

                    {equipe.length === 0 ? (
                        <Text style={styles.emptyText}>Nenhum profissional cadastrado.</Text>
                    ) : (
                        equipe.map((item) => (
                            <View key={item.id} style={styles.colabCard}>
                                <View style={styles.colabInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.colabName}>{item.nome}</Text>
                                        {planoUsuario?.verifiedBadge && (
                                            <View style={{
                                                marginLeft: 8,
                                                backgroundColor: '#FFD700',
                                                borderRadius: 10,
                                                padding: 2,
                                            }}>
                                                <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.colabEmail}>{item.email}</Text>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {item.servicosHabilitados?.length || 0} serviço(s) liberado(s)
                                        </Text>
                                    </View>
                                    <Text style={styles.serviceSummaryText}>{getResumoServicos(item.servicosHabilitados)}</Text>
                                </View>

                                <View style={styles.actionsColumn}>
                                    <TouchableOpacity
                                        style={styles.serviceButton}
                                        onPress={() => abrirEditorServicos(item)}
                                    >
                                        <Ionicons name="cut-outline" size={18} color="#7C3AED" />
                                        <Text style={styles.serviceButtonText}>Serviços</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.agendaButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            navigation.navigate("ConfigurarAgenda", {
                                                colaboradorId: item.id,
                                                colaboradorNome: item.nome
                                            });
                                        }}
                                    >
                                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                                        <Text style={styles.agendaButtonText}>Agenda</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => excluirColaborador(item.id, item.nome)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#F44336" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                    </>
                    )}
                </ScrollView>
            </TouchableWithoutFeedback>

            <Modal
                visible={modalServicosVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalServicosVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                <Text style={styles.modalTitle}>Editar serviços liberados</Text>
                                <Text style={styles.modalSubtitle}>
                                    {colaboradorEditando?.nome || 'Colaborador'} • subconta da equipe
                                </Text>
                            </View>

                            <TouchableOpacity onPress={() => setModalServicosVisible(false)}>
                                <Ionicons name="close-outline" size={24} color={colors.textDark} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Selecione os serviços permitidos para este colaborador:</Text>
                        <MultiSelect
                            style={styles.dropdown}
                            placeholder="Selecione os serviços..."
                            placeholderStyle={styles.dropdownPlaceholder}
                            data={servicosDisponiveis}
                            labelField="label"
                            valueField="value"
                            value={servicosEdicao}
                            onChange={(item) => setServicosEdicao(item)}
                            selectedStyle={styles.selectedChip}
                        />

                        <TouchableOpacity
                            style={[styles.mainButton, salvandoServicos && styles.mainButtonDisabled]}
                            onPress={salvarServicosColaborador}
                            disabled={salvandoServicos}
                            activeOpacity={0.88}
                        >
                            {salvandoServicos ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>SALVAR SERVIÇOS DO COLABORADOR</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    container: {
        flex: 1,
        backgroundColor: colors.background || '#F5F5F5'
    },

    content: {
        paddingBottom: 40,
    },

    loadingCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        margin: 20,
        marginTop: 50,
        color: colors.textDark
    },

    helperCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#EEF4FF',
        marginHorizontal: 20,
        marginBottom: 4,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E3FF',
    },

    helperText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: '#425466',
    },

    formCard: {
        backgroundColor: '#FFF',
        margin: 20,
        padding: 20,
        borderRadius: 15,
        elevation: 4
    },

    formSubtitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        color: colors.primary
    },

    input: {
        borderBottomWidth: 1,
        borderColor: '#EEE',
        marginBottom: 20,
        padding: 10,
        fontSize: 16,
        color: '#333'
    },

    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10
    },

    dropdown: {
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#FAFAFA'
    },

    dropdownPlaceholder: {
        color: '#999',
        fontSize: 14
    },

    selectedChip: {
        borderRadius: 12,
        backgroundColor: '#EEE'
    },

    mainButton: {
        backgroundColor: colors.primary || '#000',
        padding: 18,
        borderRadius: 12,
        marginTop: 25,
        alignItems: 'center'
    },

    mainButtonDisabled: {
        backgroundColor: '#CCC'
    },

    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
        marginBottom: 10,
        color: colors.textDark
    },

    colabCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        gap: 12,
    },

    colabInfo: {
        flex: 1
    },

    colabName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },

    colabEmail: {
        fontSize: 13,
        color: '#888',
        marginVertical: 2
    },

    badge: {
        backgroundColor: '#F0F0F0',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4
    },

    badgeText: {
        fontSize: 11,
        color: '#666'
    },

    serviceSummaryText: {
        marginTop: 8,
        fontSize: 12,
        lineHeight: 18,
        color: '#5F6C7B',
    },

    actionsColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFEBEE',
        alignItems: 'center',
        justifyContent: 'center',
    },

    serviceButton: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F4EEFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#7C3AED',
        minWidth: 78,
    },

    serviceButtonText: {
        fontSize: 11,
        color: '#7C3AED',
        fontWeight: 'bold',
        marginTop: 2,
    },

    agendaButton: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F0F7FF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        minWidth: 78,
    },

    agendaButtonText: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: 'bold',
        marginTop: 2
    },

    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        padding: 20,
    },

    modalCard: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 18,
    },

    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    modalSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
    },

    // ── PREMIUM LOCK ──
    premiumLockCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        marginTop: 40,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },

    lockIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    lockTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 10,
        textAlign: 'center',
    },

    lockSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },

    upgradeBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        gap: 8,
    },

    upgradeBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
