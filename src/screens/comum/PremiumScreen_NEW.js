import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { PLANS } from '../../constants/plans';
import { useAuth } from '../../hooks/useAuth';
import { useUsuario } from '../../hooks/useUsuario';
import { criarAssinatura } from '../../services/paymentService';
import * as Clipboard from 'expo-clipboard';

export default function PremiumScreen({ navigation }) {
  const { usuario: authUser } = useAuth();
  const { dadosUsuario } = useUsuario(authUser?.uid);
  const [loading, setLoading] = useState(false);
  const [modalPixVisible, setModalPixVisible] = useState(false);
  const [pixData, setPixData] = useState(null);

  // Estados para seleção de pagamento
  const [modalPagamentoVisible, setModalPagamentoVisible] = useState(false);
  const [metodoSelecionado, setMetodoSelecionado] = useState('PIX');
  const [planoSelecionado, setPlanoSelecionado] = useState(null);

  // Dados do Cartão
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiry: '',
    cvv: '',
    cpfCnpj: '',
    cep: '',
    numeroEndereco: ''
  });

  const perfil = useMemo(() => ({
    ...(authUser || {}),
    ...(dadosUsuario || {})
  }), [authUser, dadosUsuario]);

  const ehProfissional = perfil?.perfil === 'profissional' || perfil?.perfil === 'empresa' || perfil?.cnpj;

  // Planos disponíveis
  const planosProfissional = [
    PLANS.PROFESSIONAL.INICIANTE,
    PLANS.PROFESSIONAL.PROFISSIONAL,
    PLANS.PROFESSIONAL.EMPRESA,
    PLANS.PROFESSIONAL.FRANQUIA,
  ];

  const planoAtivoId = perfil?.planoAtivo || 'pro_iniciante';

  const abrirSelecaoPagamento = (plano) => {
    setPlanoSelecionado(plano);
    setModalPagamentoVisible(true);
  };

  const handleAssinar = async () => {
    if (loading || !planoSelecionado) return;

    // Validação básica se for cartão
    if (metodoSelecionado === 'CREDIT_CARD') {
      if (!cardData.holderName || cardData.number.length < 16 || !cardData.expiry || !cardData.cvv) {
        Alert.alert('Atenção', 'Por favor, preencha todos os dados do cartão corretamente.');
        return;
      }
      if (!cardData.cpfCnpj || !cardData.cep) {
        Alert.alert('Atenção', 'CPF/CNPJ e CEP do titular são obrigatórios.');
        return;
      }
    }

    try {
      setLoading(true);

      const dadosAssinatura = {
        planoId: planoSelecionado.id,
        metodoPagamento: metodoSelecionado,
        dadosCartao: metodoSelecionado === 'CREDIT_CARD' ? cardData : null,
        userId: authUser?.uid,
        email: perfil?.email,
        nome: perfil?.nome || perfil?.displayName || 'Usuário'
      };

      const resultado = await criarAssinatura(dadosAssinatura);

      if (resultado?.success) {
        if (metodoSelecionado === 'PIX' && resultado?.pix) {
          setPixData(resultado.pix);
          setModalPagamentoVisible(false);
          setModalPixVisible(true);
        } else {
          Alert.alert(
            'Assinatura Ativada!',
            `Seu plano ${planoSelecionado.name} foi ativado com sucesso!`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        Alert.alert('Erro', resultado?.message || 'Não foi possível processar a assinatura.');
      }
    } catch (error) {
      console.error('Erro ao assinar:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao processar sua assinatura. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copiarPix = async () => {
    if (pixData?.payload) {
      await Clipboard.setStringAsync(pixData.payload);
      Alert.alert('Código copiado!', 'Cole no seu aplicativo de banco para pagar.');
    }
  };

  const renderFeature = (text, disabled = false) => (
    <View key={text} style={styles.featureRow}>
      <Ionicons name={disabled ? "close-circle" : "checkmark-circle"} size={20} color={disabled ? "#BDC3C7" : (colors.primary || "#6C63FF")} />
      <Text style={[styles.featureText, disabled && styles.featureTextDisabled]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary || "#6C63FF"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos de Assinatura</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Planos para Profissionais */}
        {ehProfissional ? (
          <>
            <Text style={styles.sectionTitle}>Escolha seu Plano</Text>
            <Text style={styles.sectionSubtitle}>Selecione o plano ideal para seu negócio</Text>

            {planosProfissional.map((plano) => {
              const isAtivo = planoAtivoId === plano.id;
              const isIniciante = plano.id === 'pro_iniciante';
              const isFranquia = plano.id === 'pro_franquia';
              const isEmpresa = plano.id === 'pro_empresa';

              return (
                <View
                  key={plano.id}
                  style={[
                    styles.planCard,
                    isFranquia && styles.franquiaCard,
                    isEmpresa && styles.empresaCard,
                    !isIniciante && !isEmpresa && !isFranquia && styles.premiumCard,
                    isAtivo && styles.planCardAtivo
                  ]}
                >
                  {/* Badge */}
                  {isAtivo && (
                    <View style={[styles.planBadge, isIniciante ? { backgroundColor: '#95A5A6' } : styles.premiumBadge]}>
                      <Text style={styles.planBadgeText}>PLANO ATUAL</Text>
                    </View>
                  )}
                  {!isAtivo && plano.price > 0 && (
                    <View style={[styles.planBadge, isIniciante ? { backgroundColor: '#95A5A6' } : styles.premiumBadge]}>
                      <Text style={styles.planBadgeText}>
                        {isFranquia ? 'TOPO DAS BUSCAS' : isEmpresa ? 'MAIS POPULAR' : 'RECOMENDADO'}
                      </Text>
                    </View>
                  )}

                  {/* Nome do Plano */}
                  <Text style={[
                    styles.planName,
                    !isIniciante && styles.premiumText
                  ]}>
                    {plano.name}
                  </Text>

                  {/* Preço */}
                  <View style={styles.priceRow}>
                    {plano.price === 0 ? (
                      <>
                        <Text style={[styles.currency, { color: '#666' }]}>R$</Text>
                        <Text style={[styles.price, { color: '#666', fontSize: 36 }]}>0</Text>
                        <Text style={[styles.period, { color: '#666' }]}>/mês</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.currency, !isIniciante && styles.premiumText]}>R$</Text>
                        <Text style={[styles.price, !isIniciante && styles.premiumText]}>
                          {plano.price.toFixed(2).replace('.', ',')}
                        </Text>
                        <Text style={[styles.period, !isIniciante && styles.premiumText]}>/mês</Text>
                      </>
                    )}
                  </View>

                  {/* Taxas em destaque */}
                  <View style={styles.taxasBox}>
                    <View style={styles.taxaItem}>
                      <Ionicons name="cash-outline" size={16} color={isIniciante ? '#E74C3C' : '#27AE60'} />
                      <Text style={[styles.taxaText, { color: isIniciante ? '#E74C3C' : '#27AE60' }]}>
                        Taxa: {(plano.serviceFee * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.taxaItem}>
                      <Ionicons name="wallet-outline" size={16} color={isIniciante ? '#E74C3C' : '#27AE60'} />
                      <Text style={[styles.taxaText, { color: isIniciante ? '#E74C3C' : '#27AE60' }]}>
                        Saque: {plano.withdrawalFee === 0 ? 'GRÁTIS' : `R$ ${plano.withdrawalFee.toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={styles.taxaItem}>
                      <Ionicons name="people-outline" size={16} color={isIniciante ? '#E74C3C' : '#27AE60'} />
                      <Text style={[styles.taxaText, { color: isIniciante ? '#E74C3C' : '#27AE60' }]}>
                        Func: {plano.maxEmployees === 0 ? '0' : plano.maxEmployees === Infinity ? '∞' : plano.maxEmployees}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: isIniciante ? '#EEE' : 'rgba(255,255,255,0.2)' }]} />

                  {/* Features */}
                  {plano.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={isIniciante ? '#95A5A6' : '#F1C40F'}
                      />
                      <Text style={[styles.featureText, !isIniciante && { color: '#FFF' }]}>
                        {f}
                      </Text>
                    </View>
                  ))}

                  {/* Botão */}
                  {isAtivo ? (
                    <View style={[styles.button, styles.buttonDisabled]}>
                      <Text style={styles.buttonText}>Plano Ativo</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.button, isIniciante && { backgroundColor: '#95A5A6' }]}
                      onPress={() => abrirSelecaoPagamento(plano)}
                    >
                      <Text style={[styles.buttonText, isIniciante && { color: '#FFF' }]}>
                        {plano.price === 0 ? 'Usar Gratuito' : 'Assinar Agora'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        ) : (
          // Planos para Clientes
          <>
            <Text style={styles.sectionTitle}>Planos para Clientes</Text>

            {/* Plano FREE */}
            <View style={styles.planCard}>
              {planoAtivoId === 'client_free' && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>PLANO ATUAL</Text>
                </View>
              )}
              <Text style={styles.planName}>{PLANS.CLIENT.FREE.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.currency}>R$</Text>
                <Text style={styles.price}>0</Text>
                <Text style={styles.period}>/mês</Text>
              </View>

              <View style={styles.divider} />

              {PLANS.CLIENT.FREE.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-outline" size={20} color="#BDC3C7" />
                  <Text style={[styles.featureText, styles.featureTextDisabled]}>{f}</Text>
                </View>
              ))}

              {planoAtivoId === 'client_free' ? (
                <View style={[styles.button, styles.buttonDisabled]}>
                  <Text style={styles.buttonText}>Plano Ativo</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                  <Text style={[styles.buttonText, { color: colors.primary }]}>Voltar ao Standard</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Plano PREMIUM */}
            <View style={[styles.planCard, styles.premiumCard]}>
              {planoAtivoId === 'client_premium' && (
                <View style={[styles.planBadge, styles.premiumBadge]}>
                  <Text style={styles.planBadgeText}>PLANO ATUAL</Text>
                </View>
              )}
              {planoAtivoId !== 'client_premium' && (
                <View style={[styles.planBadge, styles.premiumBadge]}>
                  <Text style={styles.planBadgeText}>RECOMENDADO</Text>
                </View>
              )}
              <Text style={[styles.planName, styles.premiumText]}>{PLANS.CLIENT.PREMIUM.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.currency, styles.premiumText]}>R$</Text>
                <Text style={[styles.price, styles.premiumText]}>
                  {PLANS.CLIENT.PREMIUM.price.toFixed(2).replace('.', ',')}
                </Text>
                <Text style={[styles.period, styles.premiumText]}>/mês</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />

              {PLANS.CLIENT.PREMIUM.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#F1C40F" />
                  <Text style={[styles.featureText, { color: '#FFF' }]}>{f}</Text>
                </View>
              ))}

              {planoAtivoId === 'client_premium' ? (
                <View style={[styles.button, styles.buttonDisabled]}>
                  <Text style={styles.buttonText}>Plano Ativo</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => abrirSelecaoPagamento(PLANS.CLIENT.PREMIUM)}
                >
                  <Text style={styles.buttonText}>Assinar VIP</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Footer */}
        <Text style={styles.footerInfo}>
          Assinatura mensal com renovação automática. Cancele quando quiser nas configurações da conta.
        </Text>
      </ScrollView>

      {/* Modal de Pagamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalPagamentoVisible}
        onRequestClose={() => setModalPagamentoVisible(false)}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pagamento</Text>
              <TouchableOpacity onPress={() => setModalPagamentoVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                {planoSelecionado?.name} - R$ {planoSelecionado?.price?.toFixed(2)?.replace('.', ',')}/mês
              </Text>

              {/* Método PIX */}
              <TouchableOpacity
                style={[
                  styles.metodoButton,
                  metodoSelecionado === 'PIX' && styles.metodoButtonSelected
                ]}
                onPress={() => setMetodoSelecionado('PIX')}
              >
                <View style={styles.metodoIcon}>
                  <Ionicons name="qr-code" size={24} color={colors.primary} />
                </View>
                <View style={styles.metodoInfo}>
                  <Text style={styles.metodoTitle}>Pix</Text>
                  <Text style={styles.metodoDescription}>Pagamento instantâneo</Text>
                </View>
                {metodoSelecionado === 'PIX' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>

              {/* Método Cartão */}
              <TouchableOpacity
                style={[
                  styles.metodoButton,
                  metodoSelecionado === 'CREDIT_CARD' && styles.metodoButtonSelected
                ]}
                onPress={() => setMetodoSelecionado('CREDIT_CARD')}
              >
                <View style={styles.metodoIcon}>
                  <Ionicons name="card" size={24} color={colors.primary} />
                </View>
                <View style={styles.metodoInfo}>
                  <Text style={styles.metodoTitle}>Cartão de Crédito</Text>
                  <Text style={styles.metodoDescription}>Parcele em até 12x</Text>
                </View>
                {metodoSelecionado === 'CREDIT_CARD' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>

              {/* Formulário de Cartão */}
              {metodoSelecionado === 'CREDIT_CARD' && (
                <View style={styles.cardForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome no cartão"
                    value={cardData.holderName}
                    onChangeText={(text) => setCardData({ ...cardData, holderName: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Número do cartão"
                    keyboardType="numeric"
                    value={cardData.number}
                    onChangeText={(text) => setCardData({ ...cardData, number: text })}
                  />
                  <View style={styles.cardRow}>
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="Validade (MM/AA)"
                      value={cardData.expiry}
                      onChangeText={(text) => setCardData({ ...cardData, expiry: text })}
                    />
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="CVV"
                      keyboardType="numeric"
                      secureTextEntry
                      value={cardData.cvv}
                      onChangeText={(text) => setCardData({ ...cardData, cvv: text })}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="CPF/CNPJ do titular"
                    keyboardType="numeric"
                    value={cardData.cpfCnpj}
                    onChangeText={(text) => setCardData({ ...cardData, cpfCnpj: text })}
                  />
                  <View style={styles.cardRow}>
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="CEP"
                      keyboardType="numeric"
                      value={cardData.cep}
                      onChangeText={(text) => setCardData({ ...cardData, cep: text })}
                    />
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="Número"
                      value={cardData.numeroEndereco}
                      onChangeText={(text) => setCardData({ ...cardData, numeroEndereco: text })}
                    />
                  </View>
                </View>
              )}

              {/* Botão de Pagamento */}
              <TouchableOpacity
                style={[styles.payButton, loading && styles.payButtonDisabled]}
                onPress={handleAssinar}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.payButtonText}>
                    {metodoSelecionado === 'PIX' ? 'Gerar QR Code Pix' : 'Pagar com Cartão'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Pix QR Code */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalPixVisible}
        onRequestClose={() => setModalPixVisible(false)}
      >
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pagamento Pix</Text>
              <TouchableOpacity onPress={() => setModalPixVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Escaneie o QR Code abaixo ou copie o código Pix para pagar
            </Text>

            <View style={styles.qrWrapper}>
              {pixData?.pixEncodedId && (
                <Image
                  source={{ uri: `data:image/png;base64,${pixData.pixEncodedId}` }}
                  style={styles.qrCodeImage}
                />
              )}
            </View>

            <TouchableOpacity style={styles.copyButton} onPress={copiarPix}>
              <Ionicons name="copy-outline" size={20} color="#FFF" />
              <Text style={styles.copyButtonText}>Copiar Código Pix</Text>
            </TouchableOpacity>

            <Text style={styles.pixAlert}>
              O plano será ativado automaticamente após a confirmação do pagamento.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.primary || "#6C63FF",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 24,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  planCardAtivo: {
    borderColor: '#27AE60',
    borderWidth: 3,
  },
  premiumCard: {
    backgroundColor: colors.primary || "#6C63FF",
    borderColor: colors.primary || "#6C63FF",
  },
  empresaCard: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  franquiaCard: {
    backgroundColor: '#9B59B6',
    borderColor: '#9B59B6',
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#27AE60',
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 8,
  },
  premiumText: {
    color: '#FFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
  },
  price: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2D3436',
    marginHorizontal: 4,
  },
  period: {
    fontSize: 16,
    color: '#636E72',
  },
  taxasBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  taxaItem: {
    alignItems: 'center',
  },
  taxaText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#636E72',
    flex: 1,
  },
  featureTextDisabled: {
    color: '#B2BEC3',
  },
  button: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 2,
    borderColor: colors.primary || "#6C63FF",
  },
  buttonDisabled: {
    backgroundColor: '#EAEAEA',
    borderColor: '#EAEAEA',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary || "#6C63FF",
  },
  footerInfo: {
    fontSize: 12,
    color: '#636E72',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  // Modal styles
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 20,
    textAlign: 'center',
  },
  metodoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EAEAEA',
    marginBottom: 12,
  },
  metodoButtonSelected: {
    borderColor: colors.primary || "#6C63FF",
    backgroundColor: 'rgba(108,99,255,0.05)',
  },
  metodoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(108,99,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metodoInfo: {
    flex: 1,
  },
  metodoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  metodoDescription: {
    fontSize: 13,
    color: '#636E72',
  },
  cardForm: {
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    width: '48%',
  },
  payButton: {
    backgroundColor: colors.primary || "#6C63FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  payButtonDisabled: {
    backgroundColor: '#B2BEC3',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  // Modal Pix
  modalCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalView: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  qrWrapper: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    marginVertical: 20,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary || "#6C63FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  copyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pixAlert: {
    fontSize: 13,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 18,
  },
});
