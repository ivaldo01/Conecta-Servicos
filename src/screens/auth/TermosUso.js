import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import colors from "../../constants/colors";

export default function TermosUso({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Termos de Uso e Privacidade</Text>
                <Text style={styles.lastUpdate}>Última atualização: Março de 2026</Text>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={true}>
                <View style={styles.content}>

                    <Text style={styles.sectionTitle}>1. ACEITAÇÃO DOS TERMOS</Text>
                    <Text style={styles.text}>
                        Ao acessar ou utilizar esta plataforma de agendamento, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
                    </Text>

                    <Text style={styles.sectionTitle}>2. DESCRIÇÃO DO SERVIÇO</Text>
                    <Text style={styles.text}>
                        Nossa plataforma atua como uma ferramenta de intermediação e gestão de horários entre Profissionais/Empresas e seus Clientes. Não somos responsáveis pela execução técnica dos serviços prestados pelos profissionais cadastrados, sendo estes de inteira responsabilidade do prestador.
                    </Text>

                    <Text style={styles.sectionTitle}>3. CADASTRO E RESPONSABILIDADE</Text>
                    <Text style={styles.text}>
                        3.1. O usuário é responsável pela veracidade dos dados informados (CPF, CNPJ, Telefone, E-mail).{"\n"}
                        3.2. A conta é pessoal e intransferível. O uso de senhas de acesso é de responsabilidade exclusiva do usuário.{"\n"}
                        3.3. Menores de 18 anos devem utilizar a plataforma sob supervisão de um responsável legal.
                    </Text>

                    <Text style={styles.sectionTitle}>4. AGENDAMENTOS E CANCELAMENTOS</Text>
                    <Text style={styles.text}>
                        4.1. O agendamento só será considerado confirmado após a validação pelo sistema ou pelo profissional.{"\n"}
                        4.2. Políticas de cancelamento e reembolso de taxas (se houver) são definidas individualmente por cada Profissional/Empresa cadastrada, devendo ser consultadas previamente pelo Cliente.
                    </Text>

                    <Text style={styles.sectionTitle}>5. PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)</Text>
                    <Text style={styles.text}>
                        Em conformidade com a Lei Geral de Proteção de Dados (LGPD), informamos que:{"\n"}
                        - Coletamos dados de localização para facilitar a busca de serviços próximos.{"\n"}
                        - Dados de contato são compartilhados entre Cliente e Profissional apenas para fins de execução do agendamento.{"\n"}
                        - Não vendemos seus dados a terceiros.
                    </Text>

                    <Text style={styles.sectionTitle}>6. CONDUTA DO USUÁRIO</Text>
                    <Text style={styles.text}>
                        É estritamente proibido:{"\n"}
                        - Utilizar a plataforma para fins ilícitos.{"\n"}
                        - Publicar conteúdos ofensivos ou falsos nas avaliações de serviços.{"\n"}
                        - Tentar burlar os sistemas de segurança da plataforma.
                    </Text>

                    <Text style={styles.sectionTitle}>7. LIMITAÇÃO DE RESPONSABILIDADE</Text>
                    <Text style={styles.text}>
                        A plataforma não se responsabiliza por:{"\n"}
                        - Danos decorrentes de falhas técnicas no dispositivo do usuário.{"\n"}
                        - Descumprimento de horários por parte de Clientes ou Profissionais.{"\n"}
                        - Pagamentos realizados fora do fluxo oficial da plataforma.
                    </Text>

                    <Text style={styles.sectionTitle}>8. ALTERAÇÕES NOS TERMOS</Text>
                    <Text style={styles.text}>
                        Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão notificadas através do aplicativo.
                    </Text>

                    <Text style={[styles.text, { marginBottom: 30, fontWeight: 'bold', textAlign: 'center' }]}>
                        Ao clicar em "Aceito", você declara ter lido e compreendido todas as cláusulas acima.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.btnVoltar}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.btnText}>ENTENDI E VOLTAR</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: { padding: 20, backgroundColor: '#F8F9FA', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    lastUpdate: { fontSize: 12, color: '#999', marginTop: 5 },
    scroll: { flex: 1 },
    content: { padding: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.primary || '#000', marginTop: 25, marginBottom: 10, textTransform: 'uppercase' },
    text: { fontSize: 14, color: '#666', lineHeight: 22, textAlign: 'justify' },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
    btnVoltar: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold' }
});