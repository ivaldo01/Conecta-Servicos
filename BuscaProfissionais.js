import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TextInput, Alert, TouchableOpacity } from 'react-native';
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
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput style={styles.input} placeholder="Buscar..." value={busca} onChangeText={setBusca} />
      </View>
      <MapView style={styles.map} provider={PROVIDER_GOOGLE} region={region} showsUserLocation>
        {filtrados.map((pro) => (
          <Marker key={pro.id} coordinate={{ latitude: Number(pro.latitude), longitude: Number(pro.longitude) }} pinColor={colors.primary}>
            <Callout onPress={() => navigation.navigate("PerfilProfissional", { proId: pro.id })}>
              <View style={styles.callout}>
                <Text style={{ fontWeight: 'bold' }}>{pro.nome}</Text>
                <Text style={{ fontSize: 12 }}>{pro.especialidade}</Text>
                <Text style={{ color: colors.primary, fontSize: 11, marginTop: 5 }}>Ver Perfil ➔</Text>
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
  searchBox: { position: "absolute", top: 50, left: 20, right: 20, backgroundColor: "#fff", borderRadius: 25, paddingHorizontal: 15, height: 50, flexDirection: "row", alignItems: "center", elevation: 10, zIndex: 10 },
  input: { flex: 1, marginLeft: 10 },
  callout: { width: 150, padding: 5, alignItems: 'center' }
});