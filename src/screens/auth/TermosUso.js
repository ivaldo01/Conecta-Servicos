import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import colors from '../../constants/colors';

const VERSAO_TERMOS = '1.0.0';

export default function TermosUso({ navigation }) {
    const [aceito, setAceito] = useState(false);
    const [loading, setLoading] = useState(false);

    const aceitarTermos = async () => {
        if (!aceito) {
            Alert.alert('Atenção', 'Você precisa aceitar os termos para continuar.');
            return;
        }

        try {
            setLoading(true);

            const user = auth.currentUser;

            if (!user) {
                Alert.alert('Erro', 'Usuário não encontrado.');
                return;
            }

            await updateDoc(doc(db, 'usuarios', user.uid), {
                aceitouTermos: true,
                versaoTermos: VERSAO_TERMOS,
                aceitouTermosEm: new Date(),
            });

            navigation.replace('Main');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível registrar o aceite dos termos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Termos de Uso</Text>
                <Text style={styles.subtitle}>
                    Última atualização: {VERSAO_TERMOS}
                </Text>

                <Text style={styles.text}>
                    A Conecta Solutions é uma plataforma digital que conecta clientes a profissionais e empresas prestadoras de serviços.
                    Ao utilizar o aplicativo, você concorda com os termos abaixo.
                </Text>

                <Text style={styles.sectionTitle}>1. Intermediação</Text>
                <Text style={styles.text}>
                    A plataforma atua exclusivamente como intermediadora tecnológica entre cliente e profissional,
                    não sendo responsável pela execução dos serviços.
                </Text>

                <Text style={styles.sectionTitle}>2. Pagamentos</Text>
                <Text style={styles.text}>
                    Os pagamentos realizados na plataforma são processados por meio de parceiros financeiros.
                    A Conecta Solutions pode reter temporariamente valores para garantir segurança e integridade das transações.
                </Text>

                <Text style={styles.sectionTitle}>3. Taxa da Plataforma</Text>
                <Text style={styles.text}>
                    Será aplicada uma taxa de 10% sobre cada transação realizada, referente ao uso da plataforma.
                </Text>

                <Text style={styles.sectionTitle}>4. Repasse ao Profissional</Text>
                <Text style={styles.text}>
                    Após confirmação do pagamento, o valor será disponibilizado ao profissional como saldo para saque.
                    O saque pode ser solicitado a qualquer momento.
                </Text>

                <Text style={styles.sectionTitle}>5. Saque Automático</Text>
                <Text style={styles.text}>
                    Caso o profissional não solicite saque em até 30 dias, o valor será automaticamente transferido
                    para sua conta cadastrada.
                </Text>

                <Text style={styles.sectionTitle}>6. Cancelamentos e Estornos</Text>
                <Text style={styles.text}>
                    Cancelamentos e estornos poderão ocorrer conforme regras da plataforma.
                    Em caso de disputa ou chargeback, valores poderão ser bloqueados temporariamente.
                </Text>

                <Text style={styles.sectionTitle}>7. Responsabilidade</Text>
                <Text style={styles.text}>
                    O profissional é responsável pela execução do serviço, qualidade, prazos e obrigações legais.
                </Text>

                <Text style={styles.sectionTitle}>8. Obrigações Fiscais</Text>
                <Text style={styles.text}>
                    O profissional é responsável pela emissão de notas fiscais e pagamento de tributos.
                </Text>

                <Text style={styles.sectionTitle}>9. Segurança</Text>
                <Text style={styles.text}>
                    A plataforma poderá bloquear contas ou transações em caso de suspeita de fraude ou uso indevido.
                </Text>

                <Text style={styles.sectionTitle}>10. Alterações</Text>
                <Text style={styles.text}>
                    A Conecta Solutions poderá atualizar estes termos a qualquer momento.
                </Text>

                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setAceito(!aceito)}
                >
                    <View style={[styles.checkbox, aceito && styles.checkboxActive]} />
                    <Text style={styles.checkboxText}>
                        Eu li e aceito os termos de uso
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, loading && { opacity: 0.6 }]}
                    onPress={aceitarTermos}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Salvando...' : 'Aceitar e continuar'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        color: '#888',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 14,
        marginBottom: 6,
        color: colors.textDark,
    },
    text: {
        fontSize: 14,
        color: '#444',
        lineHeight: 22,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: colors.primary,
        marginRight: 10,
    },
    checkboxActive: {
        backgroundColor: colors.primary,
    },
    checkboxText: {
        fontSize: 14,
        color: '#333',
    },
    button: {
        marginTop: 20,
        backgroundColor: colors.primary,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});