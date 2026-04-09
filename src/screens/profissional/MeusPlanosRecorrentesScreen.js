import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../services/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import colors from '../../constants/colors';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function MeusPlanosRecorrentesScreen({ navigation }) {
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [contratosPorPlano, setContratosPorPlano] = useState({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Buscar planos do profissional
    const q = query(
      collection(db, 'planosRecorrentes'),
      where('profissionalId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const planosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlanos(planosData);
      setCarregando(false);

      // Para cada plano, buscar quantos contratos ativos
      planosData.forEach(plano => {
        buscarContratosAtivos(plano.id);
      });
    });

    return () => unsubscribe();
  }, []);

  const buscarContratosAtivos = async (planoId) => {
    const q = query(
      collection(db, 'contratosRecorrentes'),
      where('planoId', '==', planoId),
      where('status', 'in', ['ATIVO', 'PENDENTE_PAGAMENTO'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContratosPorPlano(prev => ({
        ...prev,
        [planoId]: snapshot.docs.length
      }));
    });

    return unsubscribe;
  };

  const toggleStatusPlano = async (planoId, novoStatus) => {
    try {
      const planoRef = doc(db, 'planosRecorrentes', planoId);
      await updateDoc(planoRef, {
        ativo: novoStatus,
        atualizadoEm: serverTimestamp()
      });
      
      Alert.alert(
        'Sucesso',
        `Plano ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar o status do plano');
    }
  };

  const excluirPlano = (plano) => {
    const contratosAtivos = contratosPorPlano[plano.id] || 0;
    
    if (contratosAtivos > 0) {
      Alert.alert(
        'Atenção',
        `Este plano possui ${contratosAtivos} contrato(s) ativo(s). Não é possível excluir. Desative o plano para não receber novas contratações.`
      );
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir o plano "${plano.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'planosRecorrentes', plano.id));
              Alert.alert('Sucesso', 'Plano excluído com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o plano');
            }
          }
        }
      ]
    );
  };

  const formatarHorarios = (horarios) => {
    if (!horarios || horarios.length === 0) return '';
    
    return horarios.map(h => {
      const dia = DIAS_SEMANA[h.diaSemana];
      return `${dia} ${h.hora}`;
    }).join(' • ');
  };

  const renderPlano = ({ item }) => {
    const contratosAtivos = contratosPorPlano[item.id] || 0;
    
    return (
      <View style={[styles.card, !item.ativo && styles.cardInativo]}>
        {/* Header do Card */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{item.nome}</Text>
            {item.descricao ? (
              <Text style={styles.cardDescricao}>{item.descricao}</Text>
            ) : null}
          </View>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText,
              item.ativo ? styles.statusAtivo : styles.statusInativo
            ]}>
              {item.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>

        {/* Informações */}
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Valor: </Text>
              R$ {item.valorMensal?.toFixed(2).replace('.', ',')}/mês
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Sessões: </Text>
              {item.sessoesPorMes}x por mês ({item.duracaoMinutos}min)
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Horários: </Text>
              {formatarHorarios(item.horariosFixos)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Fidelidade: </Text>
              {item.duracaoMinimaMeses} meses • {item.toleranciaRemarcacao} remarcações/mês
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Clientes: </Text>
              {contratosAtivos} contrato(s) ativo(s)
            </Text>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.cardActions}>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Disponível</Text>
            <Switch
              value={item.ativo}
              onValueChange={(value) => toggleStatusPlano(item.id, value)}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor={item.ativo ? colors.white : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => excluirPlano(item)}
          >
            <Ionicons name="trash" size={20} color="#E63946" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Planos Recorrentes</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Botão Criar Novo */}
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => navigation.navigate('CriarPlanoRecorrente')}
      >
        <Ionicons name="add-circle" size={24} color={colors.white} />
        <Text style={styles.createButtonText}>Criar Novo Plano</Text>
      </TouchableOpacity>

      {/* Lista de Planos */}
      <FlatList
        data={planos}
        keyExtractor={item => item.id}
        renderItem={renderPlano}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={() => {}}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhum plano criado</Text>
            <Text style={styles.emptyText}>
              Crie planos recorrentes para oferecer pacotes mensais com horários fixos aos seus clientes
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardInativo: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  cardDescricao: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusAtivo: {
    color: '#2E7D32',
  },
  statusInativo: {
    color: '#757575',
  },
  cardInfo: {
    padding: 16,
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textDark,
    marginLeft: 8,
    flex: 1,
  },
  infoLabel: {
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: colors.textDark,
    marginRight: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
