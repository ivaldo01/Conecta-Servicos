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

const VERSAO_TERMOS = '5.0.0';

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
                        2.1. <Text style={styles.bold}>Requisitos Básicos</Text>: Para utilizar a plataforma, o usuário deve ter pelo menos 18 anos de idade ou ser emancipado legalmente. O cadastro requer informações verídicas incluindo nome, CPF/CNPJ válido, e-mail e telefone verificados.{"\n"}{"\n"}
                        2.2. <Text style={styles.bold}>Cadastro de Dependentes (Menores)</Text>: Clientes podem cadastrar no aplicativo perfis secundários para dependentes menores de idade. O titular da conta assume responsabilidade civil, legal e financeira total sobre agendamentos, serviços prestados e uso de dados dos dependentes. O consentimento do responsável é explicitamente exigido e presumido a cada agendamento.{"\n"}{"\n"}
                        2.3. <Text style={styles.bold}>Verificação de Identidade</Text>: A Conecta Solutions pode solicitar documentação adicional para verificação, especialmente para profissionais. Contas com informações falsas serão suspensas ou removidas sem aviso prévio.{"\n"}{"\n"}
                        2.4. Cada usuário pode possuir apenas uma conta principal, exceto colaboradores vinculados a uma conta de gestão corporativa.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>3. Funcionalidades da Plataforma</Text>
                    <Text style={styles.text}>
                        3.1. <Text style={styles.bold}>Agendamentos e Check-in</Text>: Sistema completo de agendamento com horários configuráveis, check-in digital para formalizar atendimento, e lembretes automáticos.{"\n"}{"\n"}
                        3.2. <Text style={styles.bold}>Comunicações</Text>: Chat integrado e links para WhatsApp. A Conecta Solutions não tem acesso nem se responsabiliza por conversas e acordos fora da plataforma.{"\n"}{"\n"}
                        3.3. <Text style={styles.bold}>Pagamentos</Text>: Processamento via Asaas com criptografia, suportando pagamentos avulsos e recorrentes (assinaturas). Carteira digital com saldo e saques.{"\n"}{"\n"}
                        3.4. <Text style={styles.bold}>Avaliações</Text>: Sistema de avaliações pós-atendimento (1-5 estrelas) e portfólio fotográfico para profissionais.{"\n"}{"\n"}
                        3.5. <Text style={styles.bold}>Inteligência Artificial</Text>: Utilizamos IA para recomendação de profissionais, detecção de fraudes, otimização de horários e análise de conteúdo. Decisões automatizadas significativas passam por revisão humana.{"\n"}
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

                        4.3. <Text style={styles.bold}>Conecta Solutions VIP (Clientes Premium)</Text>:{"\n"}
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

                    <Text style={styles.sectionTitle}>8. Segurança da Conta</Text>
                    <Text style={styles.text}>
                        8.1. <Text style={styles.bold}>Credenciais</Text>: Você é responsável por manter a confidencialidade de sua senha. Não compartilhe credenciais com terceiros. Notifique imediatamente sobre uso não autorizado.{"\n"}{"\n"}
                        8.2. <Text style={styles.bold}>Autenticação</Text>: A plataforma pode implementar 2FA (autenticação de dois fatores). Use senhas fortes (mínimo 6 caracteres no cadastro, recomendado 8+ com símbolos).{"\n"}{"\n"}
                        8.3. <Text style={styles.bold}>Monitoramento</Text>: Monitoramos atividades suspeitas e podemos bloquear acesso temporariamente em casos de tentativas de invasão. Contas inativas por 12 meses podem ser desativadas.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>9. Privacidade e Proteção de Dados (LGPD)</Text>
                    <Text style={styles.text}>
                        9.1. <Text style={styles.bold}>Tratamento de Dados</Text>: Coletamos dados necessários para funcionamento: cadastro, transações financeiras, histórico de agendamentos. Dados são criptografados em trânsito e repouso.{"\n"}{"\n"}
                        9.2. <Text style={styles.bold}>Compartilhamento</Text>: Compartilhamos apenas com parceiros essenciais (gateway de pagamento). Não vendemos dados a terceiros.{"\n"}{"\n"}
                        9.3. <Text style={styles.bold}>Seus Direitos</Text>: Você pode acessar, corrigir e excluir seus dados através do Perfil. Dados fiscais são retidos por 5 anos conforme lei.{"\n"}{"\n"}
                        9.4. <Text style={styles.bold}>Cookies</Text>: Utilizamos cookies para manter sessão, preferências, análise de uso e segurança. Ao usar a plataforma, você aceita o uso de cookies essenciais.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>10. Disponibilidade do Serviço</Text>
                    <Text style={styles.text}>
                        10.1. <Text style={styles.bold}>Uptime</Text>: Nos esforçamos para manter 99.9% de disponibilidade. Manutenções programadas serão comunicadas com antecedência.{"\n"}{"\n"}
                        10.2. <Text style={styles.bold}>Limitações</Text>: Não garantimos serviço ininterrupto ou livre de erros. Eventos de força maior estão fora do nosso controle.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>11. Propriedade Intelectual</Text>
                    <Text style={styles.text}>
                        11.1. Toda inovação, software, layouts, marca e elementos da Conecta Solutions estão protegidos por copyright.{"\n"}{"\n"}
                        11.2. Ao postar fotos ou conteúdo, você concede licença não exclusiva para uso promocional da plataforma.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>12. Limitação de Responsabilidade</Text>
                    <Text style={styles.text}>
                        12.1. A Conecta Solutions é provedor de software. A execução física dos serviços agendados é responsabilidade exclusiva do profissional.{"\n"}{"\n"}
                        12.2. Não nos responsabilizamos por danos diretos, indiretos ou perda de lucros decorrentes do uso da plataforma.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>13. Rescisão e Encerramento</Text>
                    <Text style={styles.text}>
                        13.1. Você pode encerrar sua conta a qualquer momento. Dados fiscais são retidos por 5 anos.{"\n"}{"\n"}
                        13.2. Podemos suspender contas por violação dos termos, fraude, ou ordem judicial. Casos graves podem resultar em banimento imediato.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>14. Modificações dos Termos</Text>
                    <Text style={styles.text}>
                        14.1. Alterações serão publicadas e notificadas por e-mail/push. Alterações significativas terão aviso prévio de 15 dias.{"\n"}{"\n"}
                        14.2. O uso continuado após alterações constitui aceitação.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>15. Disposições Legais</Text>
                    <Text style={styles.text}>
                        15.1. <Text style={styles.bold}>Foro</Text>: Questões judiciais serão processadas no foro de São Paulo/SP, salvo competência do domicílio do consumidor.{"\n"}{"\n"}
                        15.2. <Text style={styles.bold}>Contato</Text>: conectasolutionstec@gmail.com | dpo@conectasolutions.com.br{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>16. Termo de Consentimento</Text>
                    <Text style={styles.text}>
                        Ao aceitar, confirmo:{"\n"}
                        • Li e aceito os Termos de Uso e Política de Privacidade{"\n"}
                        • Autorizo o tratamento dos meus dados conforme descrito{"\n"}
                        • Aceito receber notificações sobre agendamentos e serviços{"\n"}
                        • Declaro responsabilidade por dependentes menores cadastrados{"\n"}
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
                        Eu li e aceito os termos da Conecta Solutions
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