import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import * as Location from 'expo-location';
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import CustomButton from '../../components/CustomButton';
import { prepararDadosCategoriaParaProfissional } from '../../utils/categoriaUtils';

export default function ConfigurarPerfil() {
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [buscandoCoordenadas, setBuscandoCoordenadas] = useState(false);
    const [buscandoLocalAtual, setBuscandoLocalAtual] = useState(false);

    const [nome, setNome] = useState('');
    const [bio, setBio] = useState('');
    const [telefone, setTelefone] = useState('');
    const [fotoPerfil, setFotoPerfil] = useState(null);

    const [especialidade, setEspecialidade] = useState('');
    const [endereco, setEndereco] = useState('');
    const [cidade, setCidade] = useState('');
    const [estado, setEstado] = useState('');
    const [cep, setCep] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    const telefoneRef = useRef(null);
    const especialidadeRef = useRef(null);
    const bioRef = useRef(null);
    const enderecoRef = useRef(null);
    const cidadeRef = useRef(null);
    const estadoRef = useRef(null);
    const cepRef = useRef(null);
    const latitudeRef = useRef(null);
    const longitudeRef = useRef(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const docRef = doc(db, "usuarios", user.uid);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const dados = snap.data();

                setNome(dados.nome || dados.nomeCompleto || dados.nomeNegocio || '');
                setBio(dados.bio || '');
                setTelefone(dados.telefone || dados.whatsapp || '');
                setFotoPerfil(dados.fotoPerfil || null);
                setEspecialidade(dados.especialidade || '');
                setEndereco(dados.endereco || '');
                setCidade(dados.localizacao?.cidade || '');
                setEstado(dados.localizacao?.estado || '');
                setCep(dados.localizacao?.cep || '');

                setLatitude(
                    dados.latitude !== null && dados.latitude !== undefined
                        ? String(dados.latitude)
                        : ''
                );

                setLongitude(
                    dados.longitude !== null && dados.longitude !== undefined
                        ? String(dados.longitude)
                        : ''
                );
            }
        } catch (error) {
            console.log("Erro ao carregar dados do perfil:", error);
            Alert.alert("Erro", "Falha ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    const selecionarImagem = async () => {
        Alert.alert(
            "Recurso Nativo",
            "A troca de foto requer um Development Build com Image Picker configurado. Os outros campos funcionam normalmente."
        );
    };

    const buscarCoordenadasPeloEndereco = async () => {
        Keyboard.dismiss();

        if (!endereco.trim() || !cidade.trim() || !estado.trim()) {
            Alert.alert(
                "Endereço incompleto",
                "Preencha endereço, cidade e estado antes de buscar as coordenadas."
            );
            return;
        }

        setBuscandoCoordenadas(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    "Permissão negada",
                    "Permita o acesso à localização para usar a busca automática de coordenadas."
                );
                return;
            }

            const enderecoCompleto = `${endereco}, ${cidade}, ${estado}, Brasil`;
            const resultado = await Location.geocodeAsync(enderecoCompleto);

            if (!resultado || resultado.length === 0) {
                Alert.alert(
                    "Não encontrado",
                    "Não foi possível localizar esse endereço. Tente preencher de forma mais completa."
                );
                return;
            }

            const lat = resultado[0].latitude;
            const lng = resultado[0].longitude;

            setLatitude(String(lat));
            setLongitude(String(lng));

            Alert.alert("Sucesso", "Coordenadas localizadas com sucesso.");
        } catch (error) {
            console.log("Erro ao geocodificar endereço:", error);
            Alert.alert("Erro", "Não foi possível buscar as coordenadas.");
        } finally {
            setBuscandoCoordenadas(false);
        }
    };

    const usarLocalizacaoAtual = async () => {
        Keyboard.dismiss();
        setBuscandoLocalAtual(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    "Permissão negada",
                    "Permita o acesso à localização para usar sua posição atual."
                );
                return;
            }

            const posicao = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const lat = posicao.coords.latitude;
            const lng = posicao.coords.longitude;

            setLatitude(String(lat));
            setLongitude(String(lng));

            Alert.alert("Sucesso", "Localização atual capturada com sucesso.");
        } catch (error) {
            console.log("Erro ao obter localização atual:", error);
            Alert.alert("Erro", "Não foi possível obter sua localização atual.");
        } finally {
            setBuscandoLocalAtual(false);
        }
    };

    const parseCoordenada = (valor) => {
        if (!valor || !String(valor).trim()) return null;

        const normalizado = String(valor).replace(',', '.').trim();
        const numero = parseFloat(normalizado);

        return Number.isFinite(numero) ? numero : null;
    };

    const salvarPerfil = async () => {
        Keyboard.dismiss();

        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Erro", "Usuário não autenticado.");
            return;
        }

        if (!nome.trim()) {
            Alert.alert("Atenção", "Informe o nome do estabelecimento ou profissional.");
            return;
        }

        if (!especialidade.trim()) {
            Alert.alert("Atenção", "Informe sua especialidade.");
            return;
        }

        setSalvando(true);

        try {
            const latNum = parseCoordenada(latitude);
            const lngNum = parseCoordenada(longitude);

            const dadosCategoria = await prepararDadosCategoriaParaProfissional(especialidade);

            await updateDoc(doc(db, "usuarios", user.uid), {
                nome: nome.trim(),
                bio: bio.trim(),
                telefone: telefone.trim(),
                whatsapp: telefone.trim(),

                ...dadosCategoria,

                endereco: endereco.trim(),
                latitude: latNum,
                longitude: lngNum,
                localizacao: {
                    pais: 'Brasil',
                    estado: estado.trim(),
                    cidade: cidade.trim(),
                    cep: cep.trim(),
                },
            });

            Alert.alert("Sucesso", "Dados atualizados com sucesso!");
        } catch (error) {
            console.log("Erro ao salvar perfil:", error);
            Alert.alert(
                "Erro",
                error?.message || "Falha ao salvar."
            );
        } finally {
            setSalvando(false);
        }
    };

    if (loading) {
        return (
            <ActivityIndicator
                style={{ flex: 1 }}
                size="large"
                color={colors.primary}
            />
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
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Meu Perfil</Text>
                        <Text style={styles.subtitle}>Como os clientes verão você no app</Text>
                    </View>

                    <View style={styles.photoSection}>
                        <TouchableOpacity onPress={selecionarImagem} style={styles.avatarContainer}>
                            {fotoPerfil ? (
                                <Image source={{ uri: fotoPerfil }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Ionicons name="camera" size={40} color="#CCC" />
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Ionicons name="pencil" size={16} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.photoTip}>Foto (indisponível neste fluxo)</Text>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Nome do Estabelecimento / Profissional</Text>
                        <TextInput
                            style={styles.input}
                            value={nome}
                            onChangeText={setNome}
                            placeholder="Ex: Barbearia do Ivaldo"
                            returnKeyType="next"
                            onSubmitEditing={() => telefoneRef.current?.focus()}
                        />

                        <Text style={styles.label}>Telefone</Text>
                        <TextInput
                            ref={telefoneRef}
                            style={styles.input}
                            value={telefone}
                            onChangeText={setTelefone}
                            placeholder="(00) 00000-0000"
                            keyboardType="phone-pad"
                            returnKeyType="next"
                            onSubmitEditing={() => especialidadeRef.current?.focus()}
                        />

                        <Text style={styles.label}>Especialidade</Text>
                        <TextInput
                            ref={especialidadeRef}
                            style={styles.input}
                            value={especialidade}
                            onChangeText={setEspecialidade}
                            placeholder="Ex: Barbeiro, Manicure, Fisioterapeuta"
                            returnKeyType="next"
                            onSubmitEditing={() => bioRef.current?.focus()}
                        />

                        <Text style={styles.label}>Bio / Especialidades</Text>
                        <TextInput
                            ref={bioRef}
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Descrição para os clientes..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            returnKeyType="next"
                            onSubmitEditing={() => enderecoRef.current?.focus()}
                        />

                        <Text style={styles.sectionDivider}>Localização</Text>

                        <Text style={styles.label}>Endereço</Text>
                        <TextInput
                            ref={enderecoRef}
                            style={styles.input}
                            value={endereco}
                            onChangeText={setEndereco}
                            placeholder="Rua, número e bairro"
                            returnKeyType="next"
                            onSubmitEditing={() => cidadeRef.current?.focus()}
                        />

                        <Text style={styles.label}>Cidade</Text>
                        <TextInput
                            ref={cidadeRef}
                            style={styles.input}
                            value={cidade}
                            onChangeText={setCidade}
                            placeholder="Sua cidade"
                            returnKeyType="next"
                            onSubmitEditing={() => estadoRef.current?.focus()}
                        />

                        <Text style={styles.label}>Estado</Text>
                        <TextInput
                            ref={estadoRef}
                            style={styles.input}
                            value={estado}
                            onChangeText={setEstado}
                            placeholder="UF"
                            maxLength={2}
                            autoCapitalize="characters"
                            returnKeyType="next"
                            onSubmitEditing={() => cepRef.current?.focus()}
                        />

                        <Text style={styles.label}>CEP</Text>
                        <TextInput
                            ref={cepRef}
                            style={styles.input}
                            value={cep}
                            onChangeText={setCep}
                            placeholder="00000-000"
                            keyboardType="numeric"
                            returnKeyType="next"
                            onSubmitEditing={() => latitudeRef.current?.focus()}
                        />

                        <TouchableOpacity
                            style={[styles.geoButton, buscandoCoordenadas && { opacity: 0.7 }]}
                            onPress={buscarCoordenadasPeloEndereco}
                            disabled={buscandoCoordenadas}
                        >
                            {buscandoCoordenadas ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.geoButtonText}>BUSCAR COORDENADAS PELO ENDEREÇO</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.geoButtonSecondary, buscandoLocalAtual && { opacity: 0.7 }]}
                            onPress={usarLocalizacaoAtual}
                            disabled={buscandoLocalAtual}
                        >
                            {buscandoLocalAtual ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                <Text style={styles.geoButtonSecondaryText}>USAR MINHA LOCALIZAÇÃO ATUAL</Text>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Latitude</Text>
                        <TextInput
                            ref={latitudeRef}
                            style={styles.input}
                            value={latitude}
                            onChangeText={setLatitude}
                            placeholder="-23.5505"
                            keyboardType="numeric"
                            returnKeyType="next"
                            onSubmitEditing={() => longitudeRef.current?.focus()}
                        />

                        <Text style={styles.label}>Longitude</Text>
                        <TextInput
                            ref={longitudeRef}
                            style={styles.input}
                            value={longitude}
                            onChangeText={setLongitude}
                            placeholder="-46.6333"
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={salvarPerfil}
                        />

                        <CustomButton
                            title={salvando ? "Salvando..." : "Salvar Alterações"}
                            onPress={salvarPerfil}
                            color={colors.primary}
                            disabled={salvando}
                        />
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 25, paddingTop: 60, backgroundColor: '#FFF' },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
    subtitle: { fontSize: 14, color: colors.secondary, marginTop: 4 },
    photoSection: { alignItems: 'center', marginVertical: 30 },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#FFF'
    },
    avatarPlaceholder: {
        backgroundColor: '#E9ECEF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    editBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF'
    },
    photoTip: { fontSize: 12, color: colors.secondary, marginTop: 10 },
    form: { paddingHorizontal: 25, paddingBottom: 40 },
    sectionDivider: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 14,
        marginTop: 10
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 8,
        marginLeft: 4
    },
    input: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        color: '#333'
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    geoButton: {
        backgroundColor: colors.success || '#28a745',
        padding: 15,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12
    },
    geoButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    geoButtonSecondary: {
        backgroundColor: '#F0F7FF',
        padding: 15,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.primary
    },
    geoButtonSecondaryText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 14
    },
});