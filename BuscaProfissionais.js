import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TextInput, Alert } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { db } from "./firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function BuscaProfissionais({ navigation }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [region, setRegion] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Localização", "Precisamos da sua permissão para mostrar os profissionais próximos.");
      }
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      const q = query(collection(db, "usuarios"), where("tipo", "==", "profissional"));
      const querySnapshot = await getDocs(q);
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setProfissionais(lista);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIconeEspecialidade = (esp) => {
    const e = esp?.toLowerCase() || "";
    if (e.includes("corte") || e.includes("barba")) return "cut";
    if (e.includes("unha") || e.includes("manicure")) return "hand-right";
    return "business";
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.input}
          placeholder="O que você procura?"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation
      >
        {profissionais.map((pro) => (
          <Marker
            key={pro.id}
            coordinate={{
              latitude: Number(pro.location?.latitude || 0),
              longitude: Number(pro.location?.longitude || 0),
            }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.markerContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name={getIconeEspecialidade(pro.especialidade)} size={24} color="white" />
              </View>
              <View style={styles.triangle} />
            </View>

            <Callout onPress={() => navigation.navigate("PerfilProfissional", { id: pro.id })}>
              <View style={styles.callout}>
                <Text style={{ fontWeight: "bold" }}>{pro.nome}</Text>
                <Text style={{ fontSize: 12 }}>{pro.especialidade}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchBox: {
    position: "absolute", top: 50, left: 20, right: 20,
    backgroundColor: "#fff", borderRadius: 25, paddingHorizontal: 15,
    height: 50, flexDirection: "row", alignItems: "center", elevation: 10, zIndex: 10
  },
  input: { flex: 1, marginLeft: 10 },
  markerContainer: {
    alignItems: "center",
    width: 80,
    height: 90,
    justifyContent: 'center',
  },
  iconCircle: {
    backgroundColor: colors.primary,
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 3, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', elevation: 5
  },
  triangle: {
    width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 15,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#FFF', marginTop: -2
  },
  callout: { width: 140, padding: 5, alignItems: 'center' }
});