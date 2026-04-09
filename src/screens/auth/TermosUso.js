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

const VERSAO_TERMOS = '3.0.0';

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
                        2.1. Para utilizar a plataforma, o usuário deve ter pelo menos 18 anos de idade ou ser emancipado legalmente. Menores de idade apenas podem utilizar a plataforma através de responsável legal.{"\n"}
                        2.2. O cadastro requer informações verídicas e atualizadas, incluindo nome completo, CPF/CNPJ válido, e-mail funcional e telefone de contato.{"\n"}
                        2.3. Cada usuário pode possuir apenas uma conta, exceto em casos de contas colaborador vinculadas a uma conta principal de empresa.{"\n"}
                        2.4. A Conecta Solutions reserva-se o direito de suspender ou remover contas com informações falsas, duplicadas ou suspeitas de fraude.{"\n"}
                        2.5. O usuário é responsável por manter seus dados cadastrais atualizados, especialmente informações de contato e documentação.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>3. Funcionalidades da Plataforma</Text>
                    <Text style={styles.text}>
                        3.1. <Text style={styles.bold}>Agendamentos</Text>: A plataforma permite agendamento de serviços entre clientes e profissionais, com gestão de horários, lembretes e confirmações automáticas.{"\n"}
                        3.2. <Text style={styles.bold}>Sistema de Busca</Text>: Clientes podem localizar profissionais por categoria, localização geográfica, avaliações e disponibilidade.{"\n"}
                        3.3. <Text style={styles.bold}>Chat Integrado</Text>: Comunicação direta entre clientes e profissionais através de chat na plataforma, com histórico preservado por 12 meses.{"\n"}
                        3.4. <Text style={styles.bold}>Pagamentos</Text>: Processamento de pagamentos via gateway seguro (Asaas), suportando PIX, cartão de crédito e outras modalidades.{"\n"}
                        3.5. <Text style={styles.bold}>Avaliações</Text>: Sistema de avaliação e comentários após a prestação do serviço, visível publicamente no perfil do profissional.{"\n"}
                        3.6. <Text style={styles.bold}>Galeria de Trabalhos</Text>: Profissionais podem exibir portfólio fotográfico de serviços realizados.{"\n"}
                        3.7. <Text style={styles.bold}>Notificações Push</Text>: Envio de notificações sobre agendamentos, pagamentos, mensagens e promoções.{"\n"}
                        3.8. <Text style={styles.bold}>Favoritos</Text>: Clientes podem salvar perfis de profissionais preferidos para acesso rápido.{"\n"}
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
                        5.1. <Text style={styles.bold}>Processamento</Text>: Todos os pagamentos são processados via Gateway de Pagamento Asaas, garantindo segurança nível bancário e criptografia SSL/TLS.{"\n"}
                        5.2. <Text style={styles.bold}>Valores e Taxas</Text>: O valor creditado na carteira do Profissional já contempla o desconto das taxas operacionais vigentes de acordo com seu plano ativo.{"\n"}
                        5.3. <Text style={styles.bold}>Auditoria</Text>: A Conecta Solutions reserva-se o direito de auditar solicitações de saque para prevenção de fraudes e lavagem de dinheiro (PLD).{"\n"}
                        5.4. <Text style={styles.bold}>Repasse ao Profissional</Text>: O saldo fica disponível na carteira digital do profissional após a confirmação do serviço, podendo ser transferido para conta bancária cadastrada.{"\n"}
                        5.5. <Text style={styles.bold}>Estorno e Reembolso</Text>: Cancelamentos seguem a política de cada profissional, com prazo mínimo de 24 horas antes do agendamento para reembolso integral.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>6. Responsabilidades dos Usuários</Text>
                    <Text style={styles.text}>
                        6.1. <Text style={styles.bold}>Conduta</Text>: Os usuários comprometem-se a utilizar a plataforma de forma ética, respeitando as agendas e compromissos firmados. No-shows (não comparecimento) repetidos podem resultar em suspensão da conta.{"\n"}
                        6.2. <Text style={styles.bold}>Qualidade do Serviço</Text>: Profissionais são responsáveis pela qualidade dos serviços prestados, mantendo padrões de higiene, segurança e profissionalismo adequados à sua categoria.{"\n"}
                        6.3. <Text style={styles.bold}>Precificação</Text>: Profissionais devem manter preços atualizados e transparentes na plataforma, respeitando os valores exibidos no momento do agendamento.{"\n"}
                        6.4. <Text style={styles.bold}>Manuseio Financeiro</Text>: A manipulação de dados financeiros, tentativas de burlar taxas de intermediação ou fraude resultará em banimento imediato e responsabilização legal.{"\n"}
                        6.5. <Text style={styles.bold}>Conteúdo</Text>: Usuários são responsáveis por todo conteúdo publicado (fotos, descrições, avaliações), obrigando-se a não publicar material ofensivo, discriminatório, falso ou que viole direitos autorais.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>7. Privacidade e Proteção de Dados (LGPD)</Text>
                    <Text style={styles.text}>
                        7.1. <Text style={styles.bold}>Coleta de Dados</Text>: Coletamos dados pessoais necessários para o funcionamento da plataforma, incluindo nome, CPF/CNPJ, contato, localização e informações de pagamento.{"\n"}
                        7.2. <Text style={styles.bold}>Finalidade</Text>: Os dados são utilizados para: (a) viabilizar agendamentos; (b) processar pagamentos; (c) enviar notificações; (d) prevenir fraudes; (e) cumprir obrigações legais.{"\n"}
                        7.3. <Text style={styles.bold}>Compartilhamento</Text>: Dados são compartilhados apenas entre as partes envolvidas no agendamento (cliente e profissional) e prestadores de serviço essenciais (gateway de pagamento).{"\n"}
                        7.4. <Text style={styles.bold}>Direitos do Titular</Text>: O usuário pode solicitar acesso, correção, exclusão ou portabilidade de seus dados através do suporte.{"\n"}
                        7.5. <Text style={styles.bold}>Retenção</Text>: Mantemos dados por até 5 anos após o encerramento da conta para cumprimento de obrigações legais e fiscais.{"\n"}
                        7.6. <Text style={styles.bold}>Cookies e Tecnologias</Text>: Utilizamos cookies e tecnologias similares para melhorar a experiência e segurança da plataforma.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>8. Propriedade Intelectual</Text>
                    <Text style={styles.text}>
                        8.1. Todos os direitos de propriedade intelectual relacionados à plataforma (software, design, marcas, logos) pertencem exclusivamente à Conecta Solutions.{"\n"}
                        8.2. O usuário concede à Conecta Solutions licença não exclusiva, gratuita e mundial para usar conteúdo publicado na plataforma exclusivamente para fins de operação e marketing da plataforma.{"\n"}
                        8.3. Conteúdo de avaliações e fotos de portfólio permanecem de propriedade do usuário, mas podem ser exibidos mesmo após encerramento da conta por período razoável.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>9. Limitação de Responsabilidade</Text>
                    <Text style={styles.text}>
                        9.1. A Conecta Solutions atua como intermediadora tecnológica, não sendo responsável pela qualidade dos serviços prestados pelos profissionais, que é de exclusiva responsabilidade destes.{"\n"}
                        9.2. Não nos responsabilizamos por danos indiretos, lucros cessantes ou danos emergentes resultantes do uso ou impossibilidade de uso da plataforma.{"\n"}
                        9.3. Nosso limite de responsabilidade está restrito ao valor pago pelo usuário à plataforma nos últimos 12 meses.{"\n"}
                        9.4. Casos de falha crítica do sistema serão tratados com restabelecimento do serviço em prazo razoável, sem direito a indenização por perda de oportunidade comercial.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>10. Rescisão e Suspensão</Text>
                    <Text style={styles.text}>
                        10.1. O usuário pode encerrar sua conta a qualquer momento através das configurações ou solicitando ao suporte.{"\n"}
                        10.2. A Conecta Solutions pode suspender ou encerrar contas por: (a) violação destes termos; (b) comportamento fraudulento; (c) ordem judicial; (d) inatividade prolongada (12+ meses).{"\n"}
                        10.3. Em caso de rescisão por violação, saldos pendentes podem ser retidos para cobertura de prejuízos ou processados conforme determinação judicial.{"\n"}
                        10.4. Disputas entre usuários devem ser inicialmente resolvidas entre as partes; a plataforma pode mediar mas não se responsabiliza por resolução.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>11. Modificações e Atualizações</Text>
                    <Text style={styles.text}>
                        11.1. Estes termos podem ser atualizados periodicamente para refletir novas funcionalidades ou alterações legislativas.{"\n"}
                        11.2. Alterações materiais serão comunicadas por e-mail e notificação no app com antecedência mínima de 30 dias.{"\n"}
                        11.3. O uso continuado da plataforma após alterações constitui aceitação tácita dos novos termos.{"\n"}
                        11.4. Versões anteriores dos termos ficam arquivadas e disponíveis mediante solicitação.{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>12. Disposições Finais</Text>
                    <Text style={styles.text}>
                        12.1. <Text style={styles.bold}>Foro</Text>: Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões legais, com renúncia a qualquer outro, por mais privilegiado que seja.{"\n"}
                        12.2. <Text style={styles.bold}>Lei Aplicável</Text>: Estes termos são regidos pelas leis da República Federativa do Brasil.{"\n"}
                        12.3. <Text style={styles.bold}>Independência de Cláusulas</Text>: Caso qualquer disposição destes termos seja considerada inválida, as demais permanecem em pleno vigor.{"\n"}
                        12.4. <Text style={styles.bold}>Cessão</Text>: O usuário não pode ceder seus direitos ou obrigações sem consentimento prévio por escrito da Conecta Solutions.{"\n"}
                        12.5. <Text style={styles.bold}>Contato</Text>: Para dúvidas sobre estes termos, entre em contato pelo suporte no app ou e-mail: conectasolutionstec@gmail.com{"\n"}
                    </Text>

                    <Text style={styles.sectionTitle}>13. Consentimentos Específicos</Text>
                    <Text style={styles.text}>
                        Ao aceitar estes termos, você consente expressamente com:{"\n"}
                        • Recebimento de notificações push sobre agendamentos, pagamentos e comunicações da plataforma.{"\n"}
                        • Compartilhamento de seus dados de contato com profissionais/clientes para viabilização dos serviços.{"\n"}
                        • Processamento de dados pessoais conforme descrito na Política de Privacidade integrante destes termos.{"\n"}
                        • Publicação de avaliações realizadas por você (sem identificação completa quando aplicável).{"\n"}
                        • Uso de imagem de perfil e portfólio para marketing da plataforma.{"\n"}
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