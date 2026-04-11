import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import colors from '../../constants/colors';

const VERSAO_TERMOS = '4.0.0';

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

            // Se houver usuário logado (ex: atualização de termos), salva no Firebase
            if (user) {
                try {
                    await updateDoc(doc(db, 'usuarios', user.uid), {
                        aceitouTermos: true,
                        versaoTermos: VERSAO_TERMOS,
                        aceitouTermosEm: new Date(),
                        planoAtivo: 'free'
                    });
                } catch (e) {
                    console.log('Aviso: Usuário logado mas documento ainda não existe ou erro ao atualizar.');
                }
            }

            // Retorna para a tela anterior (Cadastro de Cliente, Profissional, etc)
            // passando o parâmetro de que os termos foram aceitos
            navigation.navigate({
                name: navigation.getState().routes[navigation.getState().index - 1].name,
                params: { termosAceitos: true },
                merge: true,
            });

        } catch (error) {
            // Em caso de erro, ainda permitimos voltar para não travar o fluxo do usuário
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
            <View style={styles.card}>
                <Text style={styles.title}>Termos de Uso e Condições</Text>
                <Text style={styles.subtitle}>
                    Versão {VERSAO_TERMOS} - Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </Text>

                <View style={styles.textContainer}>
                    <Text style={styles.text}>
                        Bem-vindo à <Text style={styles.brandText}>Conecta Solutions</Text>. Estes Termos de Uso e Licença regem o acesso e a utilização da plataforma por Clientes, Profissionais e Empresas. Ao utilizar nossos serviços, você concorda integralmente com os termos aqui estabelecidos. Leia atentamente antes de prosseguir.
                    </Text>

                    <Text style={styles.sectionTitle}>1. Definições e Abrangência</Text>
                    <Text style={styles.text}>
                        1.1. <Text style={styles.bold}>Plataforma</Text>: Aplicativo móvel Conecta Solutions, disponível para iOS e Android, que conecta clientes a profissionais de diversos serviços.{"\n"}
                        1.2. <Text style={styles.bold}>Usuário</Text>: Qualquer pessoa física ou jurídica que se cadastra na plataforma, seja como Cliente ou Profissional.{"\n"}
                        1.3. <Text style={styles.bold}>Cliente</Text>: Usuário que busca contratar serviços através da plataforma.{"\n"}
                        1.4. <Text style={styles.bold}>Profissional</Text>: Usuário que oferece serviços através da plataforma, podendo ser pessoa física (autônomo) ou pessoa jurídica (empresa).{"\n"}
                        1.5. <Text style={styles.bold}>Serviço</Text>: Atividade profissional oferecida e contratada através da plataforma.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>2. Cadastro e Elegibilidade</Text>
                    <Text style={styles.text}>
                        2.1. Para utilizar a plataforma, o usuário deve ter pelo menos 18 anos de idade ou ser emancipado legalmente.{"\n"}
                        2.2. <Text style={styles.bold}>Cadastro de Dependentes (Menores)</Text>: Clientes podem cadastrar no aplicativo perfis secundários para seus dependentes menores de idade. O titular da conta assume responsabilidade civil, legal e financeira total sobre agendamentos, serviços prestados e uso de dados dos dependentes. O consentimento do responsável é explicitamente exigido e presumido a cada agendamento associado a um menor sob sua tutela.{"\n"}
                        2.3. O cadastro requer informações verídicas e atualizadas, incluindo nome, CPF/CNPJ válido, e-mail e telefone verificados.{"\n"}
                        2.4. Cada usuário pode possuir apenas uma conta, exceto em casos de contas colaborador vinculadas a uma conta principal de gestão corporativa.{"\n"}
                        2.5. A Conecta Solutions reserva-se o direito de suspender ou remover contas com informações falsas ou duplicadas.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>3. Funcionalidades da Plataforma</Text>
                    <Text style={styles.text}>
                        3.1. <Text style={styles.bold}>Agendamentos e Check-in</Text>: O sistema gerencia horários e compromissos. Profissionais podem usar recursos interativos de check-in para formalizar o início do atendimento com os clientes.{"\n"}
                        3.2. <Text style={styles.bold}>Comunicações</Text>: A comunicação pode ocorrer via chat integrado ou links automatizados para o WhatsApp. A Conecta Solutions não tem acesso nem se responsabiliza por conversas, mídias e acordos firmados através de aplicativos externos ou mensageiros de terceiros.{"\n"}
                        3.3. <Text style={styles.bold}>Pagamentos e Recorrências</Text>: A plataforma suporta processamento contínuo de transações avulsas e contratos de assinaturas/planos mensais entre o profissional e o cliente, facilitado por ferramentas integradas como Asaas.{"\n"}
                        3.4. <Text style={styles.bold}>Qualidade e Portfólio</Text>: Sistema de avaliações pós-atendimento e galeria para profissionais exporem seus portfólios fotográficos de trabalhos.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>4. Planos de Assinatura e Monetização</Text>
                    <Text style={styles.text}>
                        4.1. <Text style={styles.bold}>Plano Essencial (Gratuito)</Text>: Destinado a profissionais em início de operação.{"\n"}
                        • Taxa de Intermediação: 10% sobre o valor bruto de cada serviço realizado através da plataforma.{"\n"}
                        • Taxa de Saque: R$ 2,00 por solicitação manual de retirada de saldo.{"\n"}
                        • Publicidade: Exibição de anúncios de terceiros durante a navegação.{"\n"}
                        • Recursos limitados de visibilidade no sistema de busca.{"\n"}{"\n"}

                        4.2. <Text style={styles.bold}>Plano Conecta Pro (Premium)</Text>: Modalidade por assinatura mensal para alta performance.{"\n"}
                        • Taxa de Intermediação Reduzida: 5% sobre o valor bruto de cada serviço.{"\n"}
                        • Isenção de Taxa de Saque: Retiradas ilimitadas sem custos adicionais.{"\n"}
                        • Experiência Ad-Free: Navegação sem interrupções publicitárias.{"\n"}
                        • Selo de Verificação Pro: Distintivo de confiança máxima nos resultados de busca.{"\n"}
                        • Destaque no sistema de busca e recomendações prioritárias.{"\n"}
                        • Acesso a relatórios financeiros avançados.{"\n"}{"\n"}

                        4.3. <Text style={styles.bold}>Conecta VIP (Clientes Premium)</Text>:{"\n"}
                        • Navegação sem anúncios.{"\n"}
                        • Acesso antecipado a profissionais de alta performance.{"\n"}
                        • Cashback em agendamentos selecionados.{"\n"}
                        • Suporte prioritário.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>5. Gestão Financeira e Pagamentos</Text>
                    <Text style={styles.text}>
                        5.1. <Text style={styles.bold}>Processamento</Text>: Todos os pagamentos interativos, avulsos ou recorrentes, são processados através do parceiro gateway Asaas, garantindo criptografia ponto a ponto.{"\n"}
                        5.2. <Text style={styles.bold}>Valores e Taxas</Text>: Os recursos creditados na conta do Profissional refletem os valores pós-dedução das taxas de intermediação vigentes para seu plano de uso.{"\n"}
                        5.3. <Text style={styles.bold}>Auditoria e Compliance</Text>: A Conecta Solutions aplica políticas severas contra lavagem de dinheiro e mantém direito de reter ou analisar saques suspeitos.{"\n"}
                        5.4. <Text style={styles.bold}>Reembolsos (Avulsos)</Text>: Os estornos ocorrem de acordo com a política flexível de cada profissional, contanto que o cancelamento seja feito com pelo menos 24 horas antes do marco fixado para o check-in do serviço.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>6. Contratos e Planos Recorrentes</Text>
                    <Text style={styles.text}>
                        6.1. <Text style={styles.bold}>Regência dos Planos</Text>: Profissionais podem oferecer "Planos de Serviço Contínuo" englobando pacotes de atendimento via assinatura no aplicativo. A relação estabelecida nesse contrato de prestação recorrente é estrita e primária do Profissional provedor e de seu Cliente.{"\n"}
                        6.2. <Text style={styles.bold}>Retenção e Pausa</Text>: Os contratos ativos pelo cliente podem possuir mecanismos de pausa (congelamento de faturas) permitidos pela plataforma, ficando a aceitação e limite de periodicidade sob gerência das lógicas automatizadas do prestador.{"\n"}
                        6.3. <Text style={styles.bold}>Cancelamento de Contrato</Text>: O cancelamento de assinturas entre cliente e profissional pode aplicar multas proporcionais se definido na oferta. A Conecta Solutions não obriga nem confisca faturas extras, meramente executa a cobrança estipulada via intermediadores.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>7. Responsabilidades e Conduta</Text>
                    <Text style={styles.text}>
                        7.1. <Text style={styles.bold}>Cláusulas de Atendimento</Text>: Desistências surpresas, no-shows (abandonos de sessão), e não cumprimentos seguidos implicarão na redução imediata do índice de confiabilidade e potencial banimento.{"\n"}
                        7.2. <Text style={styles.bold}>Garantia Operacional</Text>: Profissionais assumem todos os riscos e responsabilidades atrelados à execução correta, técnica e limpa do escopo que divulgarem em seus perfis ou planos de serviço.{"\n"}
                        7.3. <Text style={styles.bold}>Bypass de Plataforma</Text>: É estritamente proibido o uso da infraestrutura (chats/visibilidade) para angariar serviços que fujam da tributação e faturamento originais operando fora da agenda do sistema com intenção de fraude às taxas.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>8. Privacidade e Proteção de Dados (LGPD)</Text>
                    <Text style={styles.text}>
                        8.1. <Text style={styles.bold}>Tratamento de Dados</Text>: Nossa estrutura coleta dados sensíveis exigidos regulatoriamente em transações financeiras, localização e autenticação civil de dependentes.{"\n"}
                        8.2. <Text style={styles.bold}>Isolamento</Text>: Garantimos que nenhuma listagem ou informação fiscal seja vazada para domínios de terceiros exceto pela intermediação necessária na rede bancária homologada.{"\n"}
                        8.3. <Text style={styles.bold}>Exclusão de Conta</Text>: O usuário tem total controle sobre seus rastros de dados, possuindo ferramenta automatizada no "Perfil" para exclusão absoluta, restando apenas os logs mantidos inibidos sob proteção da lei (guarda fiscal de 5 anos).{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>9. Propriedade Intelectual</Text>
                    <Text style={styles.text}>
                        9.1. Toda inovação, arquitetura de software, layouts, dinâmicas de assinatura e elementos de marca da Conecta Solutions estão sob custódia de copyright irrevogável.{"\n"}
                        9.2. A postagem de portfólios no App gera uma licença permissiva e global mas não exclusiva à Plataforma, permitindo uso dos ativos e evidências publicadas (fotos) em anúncios da empresa para promover o ecossistema.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>10. Limitação de Responsabilidade</Text>
                    <Text style={styles.text}>
                        10.1. A Conecta Solutions é um provedor de software e tecnologia de pagamentos convergentes. A má execução manual (física ou intelectual) de um serviço prestado está 100% amparada nos contratos particulares entre o CNPJ/CPF do Profissional e o Cliente lesado.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>11. Rescisão e Encerramento</Text>
                    <Text style={styles.text}>
                        11.1. A rescisão (banimento) pode não apresentar aviso prévio se for configurado esquema de estelionato, lavagem de capital, injúria racial, crime sob o estatuto da criança ou quebra sistêmica do uso limpo do software.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>12. Modificações dos Termos</Text>
                    <Text style={styles.text}>
                        12.1. Alterações neste Termo de Licença, sobretudo causadas pela implantação contínua de novos braços mecânicos (contratos modulares, features Asaas e gestão de Colaboradores) serão publicadas digitalmente e valerão automaticamente após uso orgânico da nova versão do sistema.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>13. Disposições Legais e Foro</Text>
                    <Text style={styles.text}>
                        13.1. Questões irreconciliáveis amparadas pelas leis brasileiras seguirão exclusivamente regidas no foro comarcano correspondente de São Paulo/SP.{"\n"}
                        13.2. Para mais contestações: conectasolutionstec@gmail.com{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>14. Termo de Consentimento Explícito</Text>
                    <Text style={styles.text}>
                        Apertando em "Aceitar Contrato", ratifico:{"\n"}
                        • Permitir gestão de faturas, cartões atrelados a planos de assinaturas e disparo de dados para plataformas WhatsApp/Asaas quando requisenciado.{"\n"}
                        • Declarar responsabilidade verídica sobre menores de idade acoplados a conta na qualidade de dependentes agendados.{"\n"}
                        • Submissão automática aos enquadramentos legais da lei geral de dados.{"\n"}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setAceito(!aceito)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, aceito && styles.checkboxActive]}>
                        {aceito && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </View>
                    <Text style={styles.checkboxText}>
                        Eu li e aceito os termos da Coneta Solutions
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, (!aceito || loading) && styles.buttonDisabled]}
                    onPress={aceitarTermos}
                    disabled={!aceito || loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Processando...' : 'Aceitar Contrato e Continuar'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderContent()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F2F5',
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 600,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1,
        borderColor: '#dddfe2',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: '#888',
        marginBottom: 24,
        textAlign: 'center',
    },
    textContainer: {
        width: '100%',
    },
    brandText: {
        fontWeight: 'bold',
        color: colors.primary,
    },
    bold: {
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginTop: 20,
        marginBottom: 8,
        color: colors.textDark,
    },
    text: {
        fontSize: 15,
        color: '#444',
        lineHeight: 24,
        textAlign: 'justify',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 30,
        backgroundColor: '#F8FAFD',
        padding: 16,
        borderRadius: 12,
        width: '100%',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 6,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: colors.primary,
    },
    checkboxText: {
        fontSize: 15,
        color: colors.textDark,
        fontWeight: '600',
        flex: 1,
    },
    button: {
        marginTop: 24,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        elevation: 2,
    },
    buttonDisabled: {
        backgroundColor: '#CCC',
        elevation: 0,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    backButton: {
        marginTop: 16,
        padding: 8,
    },
    backButtonText: {
        color: colors.secondary,
        fontSize: 14,
        fontWeight: '600',
    }
});