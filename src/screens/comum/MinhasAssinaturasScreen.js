import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebaseConfig';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import colors from '../../constants/colors';
import { getPlanoProfissional, getPlanoCliente } from '../../constants/plans';

export default function MinhasAssinaturasScreen({ navigation }) {
  const [assinaturas, setAssinaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // Buscar dados do usuário
    const fetchUserData = async () => {
      const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }
    };
    fetchUserData();

    // 🔄 Listener em tempo real para assinaturas do usuário
    const q = query(
      collection(db, 'assinaturas'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAssinaturas(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('[MinhasAssinaturas] Erro:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // O onSnapshot atualizará automaticamente
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatarData = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatarValor = (valor) => {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'ATIVA':
        return '#10B981'; // Verde
      case 'PENDING':
      case 'PENDENTE':
        return '#F59E0B'; // Amarelo
      case 'CANCELLED':
      case 'CANCELADA':
      case 'EXPIRED':
        return '#EF4444'; // Vermelho
      default:
        return '#94A3B8'; // Cinza
    }
  };

  const getStatusText = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'ATIVA':
        return 'Ativa';
      case 'PENDING':
      case 'PENDENTE':
        return 'Pendente';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'Cancelada';
      case 'EXPIRED':
        return 'Expirada';
      default:
        return status || 'Desconhecido';
    }
  };

  const getPlanoInfo = (planoId) => {
    const profissional = getPlanoProfissional(planoId);
    const cliente = getPlanoCliente(planoId);
    return profissional || cliente || { name: planoId, color: '#64748B' };
  };

  const renderAssinatura = (item) => {
    const plano = getPlanoInfo(item.planoId);
    const statusColor = getStatusColor(item.status);

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.planoBadge, { backgroundColor: plano.color + '20' }]}>
            <Ionicons name="crown" size={16} color={plano.color || '#10B981'} />
            <Text style={[styles.planoNome, { color: plano.color || '#10B981' }]}>
              {plano.name || item.planoId}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={18} color="#64748B" />
            <Text style={styles.infoLabel}>Valor mensal:</Text>
            <Text style={styles.infoValue}>{formatarValor(item.valor)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color="#64748B" />
            <Text style={styles.infoLabel}>Pagamento:</Text>
            <Text style={styles.infoValue}>
              {item.billingType === 'PIX' ? 'PIX' : 'Cartão de Crédito'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#64748B" />
            <Text style={styles.infoLabel}>Assinatura em:</Text>
            <Text style={styles.infoValue}>{formatarData(item.createdAt)}</Text>
          </View>

          {item.proximaVencimento && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>Próximo vencimento:</Text>
              <Text style={styles.infoValue}>
                {formatarData(item.proximaVencimento)}
              </Text>
            </View>
          )}

          {item.asaasSubscriptionId && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color="#64748B" />
              <Text style={styles.infoLabel}>ID Asaas:</Text>
              <Text style={[styles.infoValue, styles.codeText]}>
                {item.asaasSubscriptionId.substring(0, 12)}...
              </Text>
            </View>
          )}
        </View>

        {item.status?.toUpperCase() === 'PENDING' && (
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.pendingButton}
              onPress={() =>
                Alert.alert(
                  'Pagamento Pendente',
                  'Seu pagamento ainda está sendo processado. Caso tenha gerado um PIX, finalize o pagamento para ativar seu plano.'
                )
              }
            >
              <Ionicons name="alert-circle" size={18} color="#F59E0B" />
              <Text style={styles.pendingButtonText}>Aguardando pagamento</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando assinaturas...</Text>
      </View>
    );
  }

  const assinaturaAtiva = assinaturas.find(
    (a) => a.status?.toUpperCase() === 'ACTIVE'
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Assinaturas</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Resumo do Plano Ativo */}
        {assinaturaAtiva ? (
          <View style={styles.resumoCard}>
            <View style={styles.resumoHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.resumoTitle}>Plano Ativo</Text>
            </View>
            <Text style={styles.resumoPlano}>
              {getPlanoInfo(assinaturaAtiva.planoId).name || assinaturaAtiva.planoId}
            </Text>
            <Text style={styles.resumoValor}>
              {formatarValor(assinaturaAtiva.valor)}/mês
            </Text>
          </View>
        ) : (
          <View style={[styles.resumoCard, styles.resumoInativo]}>
            <Ionicons name="information-circle" size={24} color="#94A3B8" />
            <Text style={styles.resumoInativoText}>
              Você não possui uma assinatura ativa no momento.
            </Text>
            <TouchableOpacity
              style={styles.assinarButton}
              onPress={() => navigation.navigate('Premium')}
            >
              <Text style={styles.assinarButtonText}>Ver Planos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de Assinaturas */}
        <Text style={styles.sectionTitle}>Histórico</Text>

        {assinaturas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhuma assinatura encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Suas assinaturas e pagamentos aparecerão aqui
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {assinaturas.map(renderAssinatura)}
          </View>
        )}

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F1A',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#151925',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  resumoCard: {
    backgroundColor: '#151925',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resumoInativo: {
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  resumoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resumoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  resumoPlano: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resumoValor: {
    fontSize: 16,
    color: '#94A3B8',
  },
  resumoInativoText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  assinarButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  assinarButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  lista: {
    gap: 16,
  },
  card: {
    backgroundColor: '#151925',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  planoNome: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardBody: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#94A3B8',
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  pendingButtonText: {
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    height: 40,
  },
});
