import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { db } from "./firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

const { width } = Dimensions.get('window');

export default function BuscaProfissionais({ navigation }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [region, setRegion] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const parseCoord = (valor) => {
    if (valor === null || valor === undefined || valor === '') return null;

    const numero =
      typeof valor === 'string'
        ? parseFloat(valor.replace(',', '.'))
        : Number(valor);

    return Number.isFinite(numero) ? numero : null;
  };

  const carregarDados = async () => {
    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        setRegion({
          latitude: -23.5505,
          longitude: -46.6333,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        });
      }

      const q = query(collection(db, "usuarios"), where("tipo", "==", "profissional"));
      const snap = await getDocs(q);

      const lista = snap.docs.map((d) => {
        const dados = d.data();

        return {
          id: d.id,
          ...dados,
          latitudeParsed: parseCoord(dados.latitude),
          longitudeParsed: parseCoord(dados.longitude),
        };
      });

      setProfissionais(lista);
    } catch (e) {
      console.log("Erro ao carregar profissionais:", e);
    } finally {
      setLoading(false);
    }
  };

  const profissionaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return profissionais;

    return profissionais.filter((p) => {
      const nome = (p.nome || p.nomeCompleto || '').toLowerCase();
      const especialidade = (p.especialidade || '').toLowerCase();
      const nomeNegocio = (p.nomeNegocio || '').toLowerCase();

      return (
        nome.includes(termo) ||
        especialidade.includes(termo) ||
        nomeNegocio.includes(termo)
      );
    });
  }, [profissionais, busca]);

  const profissionaisComMapa = useMemo(() => {
    return profissionaisFiltrados.filter((p) => {
      return (
        p.latitudeParsed !== null &&
        p.longitudeParsed !== null &&
        p.latitudeParsed !== 0 &&
        p.longitudeParsed !== 0
      );
    });
  }, [profissionaisFiltrados]);

  const abrirPerfil = (pro) => {
    navigation.navigate("PerfilProfissional", { proId: pro.id });
  };

  const renderResultado = ({ item }) => {
    const temLocalizacao =
      item.latitudeParsed !== null &&
      item.longitudeParsed !== null &&
      item.latitudeParsed !== 0 &&
      item.longitudeParsed !== 0;

    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => abrirPerfil(item)}>
        <View style={styles.resultAvatar}>
          <Text style={styles.resultAvatarText}>
            {(item.nome || item.nomeCompleto || item.nomeNegocio || "P").charAt(0)}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.resultName}>
            {item.nome || item.nomeCompleto || item.nomeNegocio || "Profissional"}
          </Text>

          <Text style={styles.resultSub}>
            {item.especialidade || "Especialidade não informada"}
          </Text>

          <Text style={styles.resultCity}>
            {item.localizacao?.cidade || "Cidade não informada"}
          </Text>

          {!temLocalizacao ? (
            <Text style={styles.resultWarning}>Sem localização no mapa</Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.secondary} />

          <TextInput
            style={styles.input}
            placeholder="Buscar por nome ou serviço..."
            placeholderTextColor="#999"
            value={busca}
            onChangeText={setBusca}
          />

          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {region && (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          showsUserLocation
          onPress={() => setSelectedPro(null)}
        >
          {profissionaisComMapa.map((pro) => (
            <Marker
              key={pro.id}
              coordinate={{
                latitude: pro.latitudeParsed,
                longitude: pro.longitudeParsed,
              }}
              onPress={() => setSelectedPro(pro)}
            >
              <View style={styles.customMarker}>
                <Ionicons name="briefcase" size={20} color="#FFF" />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {selectedPro && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.proCard}
          onPress={() => abrirPerfil(selectedPro)}
        >
          <View style={styles.proInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(selectedPro.nome || selectedPro.nomeCompleto || selectedPro.nomeNegocio || "P").charAt(0)}
              </Text>
            </View>

            <View style={styles.details}>
              <Text style={styles.proName}>
                {selectedPro.nome || selectedPro.nomeCompleto || selectedPro.nomeNegocio || "Profissional"}
              </Text>

              <Text style={styles.proSpec}>
                {selectedPro.especialidade || "Especialidade não informada"}
              </Text>

              <View style={styles.ratingBox}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.ratingText}>4.9 (120 avaliações)</Text>
              </View>
            </View>
          </View>

          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>Ver Perfil</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.resultsPanel}>
        <Text style={styles.resultsTitle}>
          Resultados ({profissionaisFiltrados.length})
        </Text>

        {profissionaisFiltrados.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum profissional encontrado.</Text>
        ) : (
          <FlatList
            data={profissionaisFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={renderResultado}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  map: { flex: 1 },

  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  searchContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 20,
  },

  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 20,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.textDark,
  },

  filterBtn: {
    padding: 5,
  },

  customMarker: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 5,
  },

  proCard: {
    position: 'absolute',
    bottom: 220,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    zIndex: 10,
  },

  proInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },

  details: {
    marginLeft: 15,
    flex: 1,
  },

  proName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  proSpec: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 4,
  },

  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ratingText: {
    fontSize: 12,
    color: colors.secondary,
    marginLeft: 5,
  },

  viewBtn: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    height: 45,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginRight: 5,
  },

  resultsPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 210,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    elevation: 12,
  },

  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 12,
  },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resultAvatarText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },

  resultName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  resultSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  resultCity: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  resultWarning: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 3,
  },

  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
  },
});