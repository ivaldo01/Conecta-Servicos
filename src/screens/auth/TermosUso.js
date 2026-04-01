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
                    Bem-vindo à Conecta Solutions. Ao acessar ou utilizar nosso aplicativo e serviços, você concorda em cumprir e estar vinculado aos seguintes Termos de Uso. Por favor, leia-os com atenção.
                </Text>

                <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
                <Text style={styles.text}>
                    Ao criar uma conta ou utilizar a plataforma Conecta Solutions, você declara ter lido, compreendido e aceitado estes Termos. Se você não concorda com qualquer parte destes termos, não deve utilizar nossos serviços.
                </Text>

                <Text style={styles.sectionTitle}>2. Descrição dos Serviços</Text>
                <Text style={styles.text}>
                    A Conecta Solutions é uma plataforma tecnológica que facilita a conexão entre Clientes que buscam serviços e Profissionais ou Empresas que os prestam. A plataforma funciona como um marketplace de agendamento e gestão.
                </Text>

                <Text style={styles.sectionTitle}>3. Cadastro e Segurança da Conta</Text>
                <Text style={styles.text}>
                    Para utilizar a maioria das funcionalidades, você deve criar uma conta. Você é responsável por:
                    {"\n"}• Fornecer informações precisas e completas.
                    {"\n"}• Manter a confidencialidade de suas credenciais de acesso.
                    {"\n"}• Todas as atividades que ocorrem sob sua conta.
                    {"\n"}• Notificar-nos imediatamente sobre qualquer uso não autorizado.
                </Text>

                <Text style={styles.sectionTitle}>4. Relação entre as Partes</Text>
                <Text style={styles.text}>
                    A Conecta Solutions não é uma prestadora de serviços, agência de empregos ou seguradora. Não existe vínculo empregatício, de parceria ou de representação entre a Conecta Solutions e os Profissionais cadastrados. Os Profissionais atuam de forma independente e são os únicos responsáveis pela qualidade e execução dos serviços.
                </Text>

                <Text style={styles.sectionTitle}>5. Pagamentos e Taxas</Text>
                <Text style={styles.text}>
                    5.1. **Taxa de Intermediação**: A plataforma cobra uma taxa de 10% (dez por cento) sobre o valor bruto de cada serviço agendado e pago através do sistema.
                    {"\n"}5.2. **Processamento**: Os pagamentos são processados por parceiros de pagamentos integrados.
                    {"\n"}5.3. **Repasses**: O saldo líquido (valor bruto menos taxas) será disponibilizado na carteira digital do Profissional após a conclusão do serviço.
                    {"\n"}5.4. **Saques**: O Profissional pode solicitar o saque de seu saldo disponível a qualquer momento, observando os prazos de processamento bancário.
                </Text>

                <Text style={styles.sectionTitle}>6. Cancelamentos e Reembolsos</Text>
                <Text style={styles.text}>
                    6.1. **Pelo Cliente**: Cancelamentos podem estar sujeitos a taxas caso ocorram fora do prazo estipulado pelo profissional.
                    {"\n"}6.2. **Pelo Profissional**: O profissional deve manter sua agenda atualizada para evitar cancelamentos. Cancelamentos recorrentes podem levar à suspensão da conta.
                    {"\n"}6.3. **Disputas**: Em caso de problemas na prestação do serviço, as partes devem buscar uma solução amigável. A plataforma pode mediar disputas, mas não garante o resultado.
                </Text>

                <Text style={styles.sectionTitle}>7. Obrigações do Profissional</Text>
                <Text style={styles.text}>
                    O Profissional compromete-se a:
                    {"\n"}• Prestar os serviços com qualidade e ética.
                    {"\n"}• Cumprir os horários agendados.
                    {"\n"}• Manter toda a documentação legal e fiscal necessária para sua atividade.
                    {"\n"}• Ser o único responsável pelo recolhimento de impostos e encargos.
                </Text>

                <Text style={styles.sectionTitle}>8. Propriedade Intelectual</Text>
                <Text style={styles.text}>
                    Todo o conteúdo do aplicativo (logos, software, design) é de propriedade exclusiva da Conecta Solutions ou de seus licenciadores e é protegido por leis de direitos autorais.
                </Text>

                <Text style={styles.sectionTitle}>9. Limitação de Responsabilidade</Text>
                <Text style={styles.text}>
                    A Conecta Solutions não se responsabiliza por:
                    {"\n"}• Danos diretos ou indiretos decorrentes do uso da plataforma.
                    {"\n"}• Conduta de qualquer usuário (Cliente ou Profissional).
                    {"\n"}• Falhas técnicas inerentes à internet ou dispositivos móveis.
                </Text>

                <Text style={styles.sectionTitle}>10. Privacidade</Text>
                <Text style={styles.text}>
                    O uso de seus dados pessoais é regido por nossa Política de Privacidade, que faz parte integrante destes Termos.
                </Text>

                <Text style={styles.sectionTitle}>11. Modificações dos Termos</Text>
                <Text style={styles.text}>
                    Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos os usuários sobre mudanças significativas através do aplicativo ou e-mail.
                </Text>

                <Text style={styles.sectionTitle}>12. Foro</Text>
                <Text style={styles.text}>
                    Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da empresa para dirimir quaisquer dúvidas.
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