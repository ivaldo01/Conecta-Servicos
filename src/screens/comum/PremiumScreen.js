import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  Animated,
  Modal,
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

  // Animação do Banner de 50%
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [scaleAnim]);

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

  const planosVisiveis = ehProfissional ? planosProfissional : [PLANS.CLIENT.FREE, PLANS.CLIENT.PREMIUM];
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
      console.log('[PremiumScreen] Iniciando assinatura para plano:', planoSelecionado.name, 'via', metodoSelecionado);

      let payload = {
        userId: authUser.uid,
        planoId: planoSelecionado.id,
        valor: planoSelecionado.price > 0 ? (planoSelecionado.price * 0.5) : 0,
        nomePlano: planoSelecionado.name,
        billingType: metodoSelecionado
      };

      if (metodoSelecionado === 'CREDIT_CARD') {
        const [month, year] = cardData.expiry.split('/');
        payload.creditCard = {
          holderName: cardData.holderName,
          number: cardData.number.replace(/\s/g, ''),
          expiryMonth: month,
          expiryYear: '20' + year,
          ccv: cardData.cvv
        };
        payload.creditCardHolderInfo = {
          name: cardData.holderName,
          email: perfil.email || authUser.email,
          cpfCnpj: cardData.cpfCnpj.replace(/\D/g, ''),
          postalCode: cardData.cep.replace(/\D/g, ''),
          addressNumber: cardData.numeroEndereco || 'SN',
          mobilePhone: (perfil.telefone || perfil.whatsapp || '').replace(/\D/g, '')
        };
      }

      const response = await criarAssinatura(payload);

      if (response.success) {
        setModalPagamentoVisible(false);
        if (metodoSelecionado === 'PIX') {
          setPixData(response);
          setModalPixVisible(true);
        } else {
          Alert.alert(
            'Assinatura Ativada!',
            'Seu plano Premium foi ativado com sucesso via cartão de crédito.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }

    } catch (error) {
      console.error('[PremiumScreen] Erro ao assinar:', error.message);

      // Tratamento específico para erro de cliente removido
      if (error.message?.includes('cliente removido') || error.message?.includes('removido')) {
        Alert.alert(
          'Problema na Conta',
          'Detectamos um problema com seu cadastro de pagamento. Por favor, entre em contato com o suporte para resolvermos isso rapidamente.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Falar com Suporte', onPress: () => navigation.navigate('Suporte') }
          ]
        );
      } else {
        Alert.alert('Erro', error.message || 'Não foi possível processar a assinatura. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copiarPix = async () => {
    if (pixData?.pixPayload) {
      await Clipboard.setStringAsync(pixData.pixPayload);
      Alert.alert('Sucesso', 'Código Pix copiado com sucesso!');
    }
  };

  const renderFeature = (feature, isPremium = true) => (
    <View key={feature} style={styles.featureRow}>
      <Ionicons
        name={isPremium ? "checkmark-circle" : "checkmark-outline"}
        size={20}
        color={isPremium ? (ehProfissional ? "#2ECC71" : colors.primary) : "#BDC3C7"}
      />
      <Text style={[styles.featureText, !isPremium && styles.featureTextDisabled]}>
        {feature}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {ehProfissional ? 'Planos para Profissionais' : 'Benefícios Conecta VIP'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Seção topo */}
        <View style={styles.topSection}>
          <Ionicons name={ehProfissional ? "rocket" : "diamond"} size={48} color="#F1C40F" />
          <Text style={styles.mainTitle}>
            {ehProfissional ? 'Evolua para o nível Enterprise' : 'Seja um Cliente VIP'}
          </Text>
          <Text style={styles.mainSubtitle}>
            {ehProfissional
              ? 'Escolha o plano ideal para escalar seu negócio com taxas reduzidas e suporte prioritário.'
              : 'Aproveite cashback, descontos exclusivos e uma experiência sem anúncios.'}
          </Text>

          {/* Banner Animado 50% OFF */}
          <Animated.View style={[styles.promoBanner, { transform: [{ scale: scaleAnim }] }]}>
             <Ionicons name="gift" size={24} color="#FFF" style={{ marginRight: 8 }} />
             <View>
               <Text style={styles.promoBannerTitle}>SUPER LANÇAMENTO 🎉</Text>
               <Text style={styles.promoBannerText}>50% de Desconto na assinatura inteira!</Text>
             </View>
          </Animated.View>
        </View>

        {/* Renderiza todos os planos disponíveis */}
        {ehProfissional ? (
          // Planos para Profissionais
          planosProfissional.map((plano, index) => {
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
                  !isIniciante && !isEmpresa && !isFranquia && styles.premiumCard
                ]}
              >
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

                <Text style={[styles.planName, !isIniciante && (isFranquia || isEmpresa || styles.premiumText)]}>
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
                    <View style={{ flexDirection: 'column' }}>
                      <Text style={[styles.originalPriceText, !isIniciante && { color: 'rgba(255,255,255,0.7)' }]}>
                        De R$ {plano.price.toFixed(2).replace('.', ',')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.currency, !isIniciante && styles.premiumText]}>R$</Text>
                        <Text style={[styles.price, !isIniciante && styles.premiumText]}>
                          {(plano.price * 0.5).toFixed(2).replace('.', ',')}
                        </Text>
                        <Text style={[styles.period, !isIniciante && styles.premiumText]}>/mês</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Taxas destacadas */}
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

                {/* Botão de ação */}
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
          })
        ) : (
          // Planos para Clientes
          <>
            {/* Plano FREE Cliente */}
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

            {/* Plano PREMIUM Cliente */}
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
                <View style={{ flexDirection: 'column' }}>
                  <Text style={[styles.originalPriceText, { color: 'rgba(255,255,255,0.7)' }]}>
                    De R$ {PLANS.CLIENT.PREMIUM.price.toFixed(2).replace('.', ',')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={[styles.currency, styles.premiumText]}>R$</Text>
                    <Text style={[styles.price, styles.premiumText]}>
                      {(PLANS.CLIENT.PREMIUM.price * 0.5).toFixed(2).replace('.', ',')}
                    </Text>
                    <Text style={[styles.period, styles.premiumText]}>/mês</Text>
                  </View>
                </View>
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
                <TouchableOpacity style={styles.button} onPress={() => abrirSelecaoPagamento(PLANS.CLIENT.PREMIUM)}>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <Text style={styles.footerInfo}>
          Assinatura mensal com renovação automática. Cancele quando quiser nas configurações da conta.
          Aplicam-se os Termos de Uso Enterprise v2.0.
        </Text>
      </ScrollView>

      {/* Modal Pix */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalPixVisible}
        onRequestClose={() => setModalPixVisible(false)}
      >
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assinatura Premium</Text>
              <TouchableOpacity onPress={() => setModalPixVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Escaneie o QR Code abaixo ou copie o código Pix para ativar seu plano.
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
              O plano será ativado automaticamente assim que o pagamento for confirmado.
            </Text>
          </View>
        </View>
      </Modal >

      {/* Modal Pagamento */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalPagamentoVisible}
        onRequestClose={() => setModalPagamentoVisible(false)}
      >
        <View style={styles.modalCentered}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forma de Pagamento</Text>
              <TouchableOpacity onPress={() => setModalPagamentoVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.methodTabs}>
              <TouchableOpacity
                style={[styles.methodTab, metodoSelecionado === 'PIX' && styles.methodTabActive]}
                onPress={() => setMetodoSelecionado('PIX')}
              >
                <Ionicons name="qr-code" size={24} color={metodoSelecionado === 'PIX' ? colors.primary : '#666'} />
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodTitle, metodoSelecionado === 'PIX' && styles.methodTitleActive]}>
                    Pix
                  </Text>
                  <Text style={styles.methodDesc}>Pagamento instantâneo</Text>
                </View>
                {metodoSelecionado === 'PIX' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodTab, metodoSelecionado === 'CREDIT_CARD' && styles.methodTabActive]}
                onPress={() => setMetodoSelecionado('CREDIT_CARD')}
              >
                <Ionicons name="card" size={24} color={metodoSelecionado === 'CREDIT_CARD' ? colors.primary : '#666'} />
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodTitle, metodoSelecionado === 'CREDIT_CARD' && styles.methodTitleActive]}>
                    Cartão de Crédito
                  </Text>
                  <Text style={styles.methodDesc}>Parcele em até 12x</Text>
                </View>
                {metodoSelecionado === 'CREDIT_CARD' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
            </View>

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
                  value={cardData.cpfCnpj}
                  onChangeText={(text) => setCardData({ ...cardData, cpfCnpj: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="CEP"
                  value={cardData.cep}
                  onChangeText={(text) => setCardData({ ...cardData, cep: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Número do endereço"
                  value={cardData.numeroEndereco}
                  onChangeText={(text) => setCardData({ ...cardData, numeroEndereco: text })}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
              onPress={handleAssinar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.confirmButtonText}>
                    {metodoSelecionado === 'PIX' ? 'Gerar Pix' : 'Confirmar Assinatura'}
                  </Text>
                  <Text style={styles.confirmButtonValue}>
                    {planoSelecionado?.price > 0 
                       ? `R$ ${(planoSelecionado.price * 0.5).toFixed(2).replace('.', ',')}/mês` 
                       : 'Grátis'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal >
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    marginTop: 8,
  },
  promoBannerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  promoBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  premiumCard: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#F1C40F',
    shadowColor: '#F1C40F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  planBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  premiumBadge: {
    backgroundColor: '#F1C40F',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  premiumText: {
    color: '#FFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
    minHeight: 50,
  },
  originalPriceText: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: '#95A5A6',
    marginBottom: -4,
  },
  currency: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 4,
  },
  period: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  featureTextDisabled: {
    color: '#999',
  },
  button: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#E9ECEF',
    borderColor: '#DEE2E6',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#495057',
  },
  premiumButton: {
    backgroundColor: '#F1C40F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#F1C40F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  footerInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  modalCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    paddingBottom: 40,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrWrapper: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  copyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  copyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pixAlert: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  methodTabs: {
    marginBottom: 20,
  },
  methodTab: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  methodTabActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,122,255,0.08)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  methodTitleActive: {
    color: colors.primary,
  },
  methodDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cardForm: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  confirmButtonValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '600',
  },

  empresaCard: {
    backgroundColor: '#3498DB',
  },
  franquiaCard: {
    backgroundColor: '#9B59B6',
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
});
