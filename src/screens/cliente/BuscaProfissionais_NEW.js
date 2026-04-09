// Versão simplificada apenas para testar se compila
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useNavigation } from '@react-navigation/native';
import colors from '../../constants/colors';
import { getPrioridadeBusca, getPlanoProfissional } from '../../constants/plans';

export default function BuscaProfissionais() {
  const navigation = useNavigation();
  const [busca, setBusca] = useState('');
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPro, setSelectedPro] = useState(null);
  const [favoritosMap, setFavoritosMap] = useState({});

  // Função ordenar profissionais com prioridade de plano
  const ordenarProfissionais = useCallback((lista) => {
    return [...lista].sort((a, b) => {
      // 1. Prioridade de busca baseada no plano
      const prioridadeA = getPrioridadeBusca(a?.planoAtivo);
      const prioridadeB = getPrioridadeBusca(b?.planoAtivo);
      if (prioridadeB !== prioridadeA) {
        return prioridadeB - prioridadeA;
      }
      // 2. Favoritos
      if (Number(b.favorito) !== Number(a.favorito)) {
        return Number(b.favorito) - Number(a.favorito);
      }
      // 3. Distância
      const distanciaA = Number(a.distanciaMetros ?? Infinity);
      const distanciaB = Number(b.distanciaMetros ?? Infinity);
      if (distanciaA !== distanciaB) {
        return distanciaA - distanciaB;
      }
      // 4. Rating
      const ratingA = Number(a.rating ?? 0);
      const ratingB = Number(b.rating ?? 0);
      if (ratingB !== ratingA) return ratingB - ratingA;
      // 5. Número de avaliações
      return (b.numAvaliacoes ?? 0) - (a.numAvaliacoes ?? 0);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text>Busca de Profissionais - Versão Simplificada</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
