import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TextInput, Alert, TouchableOpacity, Dimensions } from 'react-native';
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
  const [selectedPro, setSelectedPro] = useState(null); // Para o card inferior

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
          latitudeDelta: 0.05, longitudeDelta: 0.05,
        });
      }
      const q = query(collection(db, "usuarios"), where("tipo", "==", "profissional"));
      const snap = await getDocs(q);
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally { setLoading(false); }
  };

  const filtrados = profissionais.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.especialidade?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* BARRA DE BUSCA FLUTUANTE */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.secondary} />
          <TextInput
            style={styles.input}
            placeholder="Buscar por nome ou serviço..."
            value={busca}
            onChangeText={setBusca}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation
        onPress={() => setSelectedPro(null)} // Fecha o card se clicar no mapa
      >
        {filtrados.map((pro) => (
          <Marker
            key={pro.id}
            coordinate={{ latitude: Number(pro.latitude), longitude: Number(pro.longitude) }}
            onPress={() => setSelectedPro(pro)}
          >
            <View style={styles.customMarker}>
              <Ionicons name="briefcase" size={20} color="#FFF" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* CARD INFERIOR DO PROFISSIONAL (Estilo das imagens) */}
      {selectedPro && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.proCard}
          onPress={() => navigation.navigate("PerfilProfissional", { proId: selectedPro.id })}
        >
          <View style={styles.proInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{selectedPro.nome?.charAt(0)}</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.proName}>{selectedPro.nome}</Text>
              <Text style={styles.proSpec}>{selectedPro.especialidade}</Text>
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
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },

  // Estilo da Busca
  searchContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10
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
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: colors.textDark },
  filterBtn: { padding: 5 },

  // Marcador customizado
  customMarker: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 5
  },

  // Card do Profissional (Flutuante na parte de baixo)
  proCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  proInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  details: { marginLeft: 15, flex: 1 },
  proName: { fontSize: 18, fontWeight: 'bold', color: colors.textDark },
  proSpec: { fontSize: 14, color: colors.secondary, marginBottom: 4 },
  ratingBox: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, color: colors.secondary, marginLeft: 5 },

  viewBtn: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    height: 45,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  viewBtnText: { color: '#FFF', fontWeight: 'bold', marginRight: 5 }
});