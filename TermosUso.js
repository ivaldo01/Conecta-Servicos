import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from './colors';

export default function TermosUso({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Termos e Condições Gerais</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.mainTitle}>Termos de Uso e Política de Privacidade</Text>
                <Text style={styles.lastUpdate}>Versão 1.0 - Atualizado em 26 de Fevereiro de 2026</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. OBJETO E NATUREZA DO SERVIÇO</Text>
                    <Text style={styles.text}>
                        O Conecta-Serviços atua exclusivamente como uma plataforma de intermediação, aproximando Prestadores e Consumidores. Não mantemos vínculo empregatício com os profissionais.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. PROTEÇÃO DE DADOS (LGPD)</Text>
                    <Text style={styles.text}>
                        Coletamos Nome, CPF e Geolocalização apenas para viabilizar o agendamento. Seus dados de contato só serão visíveis ao Profissional após a confirmação do serviço.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. DADOS DE MENORES</Text>
                    <Text style={styles.text}>
                        O cadastro de menores de 18 anos exige consentimento explícito do tutor legal, conforme Art. 14 da LGPD, visando apenas a identificação no atendimento.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Li e Concordo com os Termos</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#FFF', elevation: 4 },
    headerTitle: { fontSize: 16, fontWeight: '700', marginLeft: 10, color: '#333' },
    content: { paddingHorizontal: 20 },
    mainTitle: { fontSize: 24, fontWeight: '800', color: colors.primary, marginTop: 25, marginBottom: 8 },
    lastUpdate: { fontSize: 13, color: '#999', marginBottom: 25 },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#444', marginBottom: 10 },
    text: { fontSize: 14, color: '#666', lineHeight: 22 },
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
    button: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});