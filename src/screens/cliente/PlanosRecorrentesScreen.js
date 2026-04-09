import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../services/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import colors from '../../constants/colors';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function PlanosRecorrentesScreen({ route, navigation }) {
  const { profissionalId, profissionalNome } = route.params || {};

  const [planos, setPlanos] = useState([]);
  const [profissional, setProfissional] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [contratando, setContratando] = useState(false);

  // Estados para seleção de múltiplos dias e horários
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [horariosPorDia, setHorariosPorDia] = useState({});
  const [horariosOcupados, setHorariosOcupados] = useState([]);
  const [diaAtual, setDiaAtual] = useState(null);
  const [etapaModal, setEtapaModal] = useState('resumo');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);

      const profDoc = await getDoc(doc(db, 'usuarios', profissionalId));
      if (profDoc.exists()) {
        setProfissional(profDoc.data());
      }

      const q = query(
        collection(db, 'planosRecorrentes'),
        where('profissionalId', '==', profissionalId),
        where('ativo', '==', true)
      );

      const snapshot = await getDocs(q);
      const planosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPlanos(planosData);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os planos disponíveis');
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalContratacao = async (plano) => {
    setPlanoSelecionado(plano);
    setDiasSelecionados([]);
    setHorariosPorDia({});
    setHorariosOcupados([]);
    setDiaAtual(null);
    setEtapaModal('resumo');
    setModalVisible(true);

    // Carregar horários ocupados para este plano
    await carregarHorariosOcupados(plano.id);
  };

  const carregarHorariosOcupados = async (planoId) => {
    try {
      const q = query(
        collection(db, 'contratosRecorrentes'),
        where('planoId', '==', planoId),
        where('status', 'in', ['ativo', 'pendente'])
      );
      const snapshot = await getDocs(q);
      const ocupados = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.horariosFixos) {
          data.horariosFixos.forEach(h => {
            ocupados.push({
              diaSemana: h.diaSemana,
              hora: h.hora,
              contratoId: doc.id
            });
          });
        }
      });
      setHorariosOcupados(ocupados);
    } catch (error) {
      console.log('Erro ao carregar horários ocupados:', error);
    }
  };

  const toggleDiaSelecionado = (dia) => {
    if (diasSelecionados.includes(dia)) {
      const novosDias = diasSelecionados.filter(d => d !== dia);
      setDiasSelecionados(novosDias);
      // Remover horários do dia desmarcado
      const novosHorarios = { ...horariosPorDia };
      delete novosHorarios[dia];
      setHorariosPorDia(novosHorarios);
    } else {
      setDiasSelecionados([...diasSelecionados, dia]);
    }
  };

  const selecionarHorario = (dia, hora) => {
    const chave = `${dia}-${hora}`;
    const horariosAtuais = horariosPorDia[dia] || [];

    if (horariosAtuais.includes(hora)) {
      // Desmarcar
      setHorariosPorDia({
        ...horariosPorDia,
        [dia]: horariosAtuais.filter(h => h !== hora)
      });
    } else {
      // Marcar
      setHorariosPorDia({
        ...horariosPorDia,
        [dia]: [...horariosAtuais, hora]
      });
    }
  };

  const isHorarioOcupado = (dia, hora) => {
    return horariosOcupados.some(h => h.diaSemana === dia && h.hora === hora);
  };

  const gerarHorariosDoPlano = (plano) => {
    if (!plano?.diasDisponiveis || !plano?.horarioInicio || !plano?.horarioFim) {
      return [];
    }
    const horaInicio = parseInt(plano.horarioInicio.split(':')[0]);
    const horaFim = parseInt(plano.horarioFim.split(':')[0]);
    const horarios = [];

    for (let h = horaInicio; h < horaFim; h++) {
      horarios.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return horarios;
  };

  const gerarHorariosDisponiveis = (plano) => {
    if (!plano?.diasDisponiveis || !plano?.horarioInicio || !plano?.horarioFim) {
      if (plano?.horariosFixos?.length > 0) {
        return plano.horariosFixos;
      }
      return [];
    }

    const horarios = [];
    const horaInicio = parseInt(plano.horarioInicio.split(':')[0]);
    const horaFim = parseInt(plano.horarioFim.split(':')[0]);
    const duracao = plano.duracaoMinutos || 60;

    plano.diasDisponiveis.forEach(dia => {
      for (let h = horaInicio; h < horaFim; h++) {
        const hora = h.toString().padStart(2, '0') + ':00';
        horarios.push({
          diaSemana: dia,
          hora: hora,
          duracaoMinutos: duracao
        });
      }
    });

    return horarios.sort((a, b) => {
      if (a.diaSemana !== b.diaSemana) return a.diaSemana - b.diaSemana;
      return a.hora.localeCompare(b.hora);
    });
  };

  const calcularProximasDatas = (horariosFixos, quantidadeSemanas = 4) => {
    const hoje = new Date();
    const datas = [];

    for (let semana = 0; semana < quantidadeSemanas; semana++) {
      horariosFixos.forEach(horario => {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() + ((horario.diaSemana - hoje.getDay() + 7) % 7) + (semana * 7));
        data.setHours(parseInt(horario.hora.split(':')[0]), parseInt(horario.hora.split(':')[1]), 0, 0);

        if (data > hoje) {
          datas.push({
            data: data,
            diaSemana: horario.diaSemana,
            hora: horario.hora
          });
        }
      });
    }

    return datas.sort((a, b) => a.data - b.data);
  };

  const calcularProximoVencimento = () => {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    return proximoMes;
  };

  const contratarPlano = async (formaPagamento) => {
    if (!planoSelecionado || !auth.currentUser) return;

    setContratando(true);

    try {
      const plano = planoSelecionado;

      // Montar horários fixos a partir dos dias e horários selecionados
      const horariosFixosCliente = [];
      diasSelecionados.forEach(dia => {
        const horariosDoDia = horariosPorDia[dia] || [];
        horariosDoDia.forEach(hora => {
          horariosFixosCliente.push({
            diaSemana: dia,
            hora: hora,
            proximaData: null
          });
        });
      });

      if (horariosFixosCliente.length === 0) {
        Alert.alert('Atenção', 'Selecione pelo menos um dia e horário para o atendimento!');
        setContratando(false);
        return;
      }

      const contratoData = {
        planoId: plano.id,
        profissionalId: profissionalId,
        clienteId: auth.currentUser.uid,
        status: formaPagamento === 'PIX' ? 'pendente' : 'ativo',
        valorMensal: plano.valorMensal,
        sessoesPorMes: plano.sessoesPorMes,
        sessoesRealizadas: 0,
        sessoesRestantesMesAtual: plano.sessoesPorMes,
        remarcacoesUsadasMes: 0,
        horariosFixos: horariosFixosCliente,
        dataInicio: serverTimestamp(),
        dataCriacao: serverTimestamp(),
        ultimoPagamento: formaPagamento === 'CARTAO' ? serverTimestamp() : null,
        proximoVencimento: calcularProximoVencimento(),
        formaPagamento: formaPagamento,
        nomePlano: plano.nome,
        descricaoPlano: plano.descricao || '',
      };

      const contratoRef = await addDoc(collection(db, 'contratosRecorrentes'), contratoData);

      if (formaPagamento === 'PIX') {
        const response = await fetch('https://backend-vercel-nu-topaz.vercel.app/api/gerarPix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planoId: plano.id,
            valor: plano.valorMensal,
            nomePlano: plano.nome,
            billingType: 'PIX',
            contratoRecorrenteId: contratoRef.id
          })
        });

        // Verificar se resposta é OK antes de tentar parse
        const responseText = await response.text();
        console.log('Resposta bruta da API PIX:', responseText.substring(0, 500));

        if (!response.ok) {
          console.error('Erro API PIX - Status:', response.status);
          console.error('Erro API PIX - Body:', responseText);
          throw new Error(`Erro no servidor PIX: ${response.status} - ${responseText.substring(0, 200)}`);
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Erro ao fazer parse JSON:', parseError);
          console.error('Texto recebido:', responseText);
          throw new Error('Resposta inválida do servidor PIX');
        }

        if (data.success) {
          setModalVisible(false);
          navigation.navigate('PagamentoPix', {
            pixEncodedId: data.pixEncodedId,
            pixPayload: data.pixPayload,
            contratoId: contratoRef.id,
            valor: plano.valorMensal
          });
        } else {
          throw new Error(data.error || 'Erro ao criar cobrança PIX');
        }
      } else {
        Alert.alert(
          'Contrato Criado!',
          `Plano "${plano.nome}" contratado com sucesso!\n\nOs agendamentos serão gerados automaticamente.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                navigation.navigate('MeusContratos');
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('Erro ao contratar:', error);
      Alert.alert('Erro', `Não foi possível contratar o plano: ${error.message}`);
    } finally {
      setContratando(false);
    }
  };

  const formatarHorarios = (plano) => {
    if (plano?.diasDisponiveis?.length > 0 && plano?.horarioInicio && plano?.horarioFim) {
      const dias = plano.diasDisponiveis.map(d => DIAS_SEMANA[d]).join(', ');
      return `${dias}\nDas ${plano.horarioInicio} às ${plano.horarioFim}`;
    }

    const horarios = plano?.horariosFixos || plano;
    if (!horarios || horarios.length === 0) return 'Horários não definidos';

    const agrupados = {};
    horarios.forEach(h => {
      const dia = DIAS_SEMANA[h.diaSemana];
      if (!agrupados[dia]) agrupados[dia] = [];
      agrupados[dia].push(h.hora);
    });

    return Object.entries(agrupados)
      .map(([dia, horas]) => `${dia}: ${horas.join(', ')}`)
      .join('\n');
  };

  const renderPlano = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.nome}</Text>
        <View style={styles.precoBadge}>
          <Text style={styles.precoText}>R$ {item.valorMensal?.toFixed(2).replace('.', ',')}</Text>
          <Text style={styles.precoMes}>/mês</Text>
        </View>
      </View>

      {item.descricao ? (
        <Text style={styles.descricao}>{item.descricao}</Text>
      ) : null}

      <View style={styles.detalhesContainer}>
        <View style={styles.detalheItem}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.detalheText}>{item.sessoesPorMes} sessões/mês</Text>
        </View>

        <View style={styles.detalheItem}>
          <Ionicons name="time" size={20} color={colors.primary} />
          <Text style={styles.detalheText}>{item.duracaoMinutos} min cada</Text>
        </View>

        <View style={styles.detalheItem}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.detalheText}>{item.duracaoMinimaMeses} meses mín.</Text>
        </View>

        <View style={styles.detalheItem}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
          <Text style={styles.detalheText}>{item.toleranciaRemarcacao} remarcações/mês</Text>
        </View>
      </View>

      <View style={styles.horariosContainer}>
        <Text style={styles.horariosTitle}>Horários Disponíveis:</Text>
        <Text style={styles.horariosText}>{formatarHorarios(item)}</Text>
      </View>

      <TouchableOpacity
        style={styles.contratarButton}
        onPress={() => abrirModalContratacao(item)}
      >
        <Text style={styles.contratarButtonText}>Contratar Plano</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.white} />
      </TouchableOpacity>
    </View>
  );

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando planos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Planos Recorrentes</Text>
          {profissionalNome && (
            <Text style={styles.headerSubtitle}>{profissionalNome}</Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color={colors.primary} />
        <Text style={styles.infoText}>
          Planos mensais com horários fixos. Os agendamentos são gerados automaticamente todo mês!
        </Text>
      </View>

      <FlatList
        data={planos}
        keyExtractor={item => item.id}
        renderItem={renderPlano}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Nenhum plano disponível</Text>
            <Text style={styles.emptyText}>
              Este profissional ainda não criou planos recorrentes.
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar Contratação</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            {planoSelecionado && (
              <ScrollView style={styles.modalBody}>
                {etapaModal === 'resumo' && (
                  <>
                    <View style={styles.resumoBox}>
                      <Text style={styles.resumoLabel}>Plano:</Text>
                      <Text style={styles.resumoValue}>{planoSelecionado.nome}</Text>

                      <Text style={styles.resumoLabel}>Valor Mensal:</Text>
                      <Text style={styles.resumoValuePreco}>
                        R$ {planoSelecionado.valorMensal?.toFixed(2).replace('.', ',')}
                      </Text>

                      <Text style={styles.resumoLabel}>Inclui:</Text>
                      <Text style={styles.resumoValue}>
                        {planoSelecionado.sessoesPorMes} sessões por mês{'\n'}
                        Duração: {planoSelecionado.duracaoMinutos} minutos cada
                      </Text>

                      <Text style={styles.resumoLabel}>Período mínimo:</Text>
                      <Text style={styles.resumoValue}>
                        {planoSelecionado.duracaoMinimaMeses} meses
                      </Text>

                      <Text style={styles.resumoLabel}>Horários Disponíveis:</Text>
                      <Text style={styles.resumoValue}>
                        {formatarHorarios(planoSelecionado)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.selecionarHorarioButton}
                      onPress={() => setEtapaModal('dias')}
                    >
                      <Ionicons name="time-outline" size={24} color={colors.white} />
                      <Text style={styles.selecionarHorarioText}>
                        Escolher Meus Horários
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {etapaModal === 'dias' && (
                  <>
                    <Text style={styles.etapaTitulo}>Escolha seus dias disponíveis</Text>
                    <Text style={styles.etapaSubtitulo}>
                      Selecione os dias da semana que você deseja agendar
                    </Text>

                    <View style={styles.diasContainer}>
                      {planoSelecionado?.diasDisponiveis?.map((dia) => (
                        <TouchableOpacity
                          key={dia}
                          style={[
                            styles.diaOption,
                            diasSelecionados.includes(dia) && styles.diaOptionSelected
                          ]}
                          onPress={() => toggleDiaSelecionado(dia)}
                        >
                          <Ionicons
                            name={diasSelecionados.includes(dia) ? 'checkmark-circle' : 'ellipse-outline'}
                            size={24}
                            color={diasSelecionados.includes(dia) ? '#4CAF50' : colors.textSecondary}
                          />
                          <Text style={[
                            styles.diaOptionText,
                            diasSelecionados.includes(dia) && styles.diaOptionTextSelected
                          ]}>
                            {DIAS_SEMANA[dia]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {diasSelecionados.length > 0 && (
                      <TouchableOpacity
                        style={styles.continuarButton}
                        onPress={() => {
                          setDiaAtual(diasSelecionados[0]);
                          setEtapaModal('horarios');
                        }}
                      >
                        <Text style={styles.continuarButtonText}>
                          Continuar ({diasSelecionados.length} dia(s) selecionado(s))
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.voltarButton}
                      onPress={() => setEtapaModal('resumo')}
                    >
                      <Text style={styles.voltarButtonText}>Voltar</Text>
                    </TouchableOpacity>
                  </>
                )}

                {etapaModal === 'horarios' && diaAtual !== null && (
                  <>
                    <View style={styles.horariosHeader}>
                      <TouchableOpacity onPress={() => {
                        const idx = diasSelecionados.indexOf(diaAtual);
                        if (idx > 0) {
                          setDiaAtual(diasSelecionados[idx - 1]);
                        } else {
                          setEtapaModal('dias');
                        }
                      }}>
                        <Ionicons name="chevron-back" size={24} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.etapaTitulo}>{DIAS_SEMANA[diaAtual]}</Text>
                      <TouchableOpacity onPress={() => {
                        const idx = diasSelecionados.indexOf(diaAtual);
                        if (idx < diasSelecionados.length - 1) {
                          setDiaAtual(diasSelecionados[idx + 1]);
                        } else {
                          setEtapaModal('pagamento');
                        }
                      }}>
                        <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.etapaSubtitulo}>
                      Escolha os horários disponíveis das {planoSelecionado?.horarioInicio} às {planoSelecionado?.horarioFim}
                    </Text>

                    <View style={styles.horariosGrid}>
                      {gerarHorariosDoPlano(planoSelecionado).map((hora) => {
                        const isOcupado = isHorarioOcupado(diaAtual, hora);
                        const isSelecionado = (horariosPorDia[diaAtual] || []).includes(hora);

                        return (
                          <TouchableOpacity
                            key={hora}
                            style={[
                              styles.horarioGridOption,
                              isOcupado && styles.horarioGridOptionOcupado,
                              isSelecionado && styles.horarioGridOptionSelecionado
                            ]}
                            onPress={() => !isOcupado && selecionarHorario(diaAtual, hora)}
                            disabled={isOcupado}
                          >
                            <Text style={[
                              styles.horarioGridText,
                              isOcupado && styles.horarioGridTextOcupado,
                              isSelecionado && styles.horarioGridTextSelecionado
                            ]}>
                              {hora}
                            </Text>
                            {isOcupado && (
                              <View style={styles.ocupadoBadge}>
                                <Text style={styles.ocupadoText}>Ocupado</Text>
                              </View>
                            )}
                            {isSelecionado && (
                              <Ionicons name="checkmark" size={16} color="#FFF" style={styles.checkIcon} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.horariosNavegacao}>
                      <Text style={styles.horariosProgresso}>
                        Dia {diasSelecionados.indexOf(diaAtual) + 1} de {diasSelecionados.length}
                      </Text>
                    </View>

                    {diasSelecionados.indexOf(diaAtual) === diasSelecionados.length - 1 ? (
                      <TouchableOpacity
                        style={styles.continuarButton}
                        onPress={() => setEtapaModal('pagamento')}
                      >
                        <Text style={styles.continuarButtonText}>Ir para Pagamento</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.continuarButton}
                        onPress={() => {
                          const idx = diasSelecionados.indexOf(diaAtual);
                          if (idx < diasSelecionados.length - 1) {
                            setDiaAtual(diasSelecionados[idx + 1]);
                          }
                        }}
                      >
                        <Text style={styles.continuarButtonText}>Próximo Dia</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {etapaModal === 'pagamento' && (
                  <>
                    <View style={styles.resumoBox}>
                      <Text style={styles.resumoLabel}>Plano:</Text>
                      <Text style={styles.resumoValue}>{planoSelecionado.nome}</Text>

                      <Text style={[styles.resumoLabel, { marginTop: 12 }]}>Seus Horários Escolhidos:</Text>
                      {diasSelecionados.map(dia => (
                        <View key={dia} style={{ marginTop: 4 }}>
                          <Text style={{ fontWeight: '600', color: colors.textDark }}>
                            {DIAS_SEMANA[dia]}:
                          </Text>
                          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                            {(horariosPorDia[dia] || []).join(', ')}
                          </Text>
                        </View>
                      ))}

                      <Text style={[styles.resumoLabel, { marginTop: 12 }]}>Valor mensal:</Text>
                      <Text style={styles.resumoValue}>R$ {parseFloat(planoSelecionado.valorMensal).toFixed(2).replace('.', ',')}</Text>

                      <Text style={[styles.resumoLabel, { marginTop: 12 }]}>Forma de pagamento:</Text>
                      <Text style={styles.resumoValue}>PIX - Pagamento único para ativar</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.pagamentoButton}
                      onPress={() => contratarPlano('PIX')}
                      disabled={contratando}
                    >
                      <View style={styles.pagamentoIcon}>
                        <Ionicons name="qr-code" size={28} color={colors.primary} />
                      </View>
                      <View style={styles.pagamentoInfo}>
                        <Text style={styles.pagamentoNome}>PIX</Text>
                        <Text style={styles.pagamentoDesc}>Pagamento único do primeiro mês</Text>
                      </View>
                      {contratando ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pagamentoButton}
                      onPress={() => contratarPlano('CARTAO')}
                      disabled={contratando}
                    >
                      <View style={styles.pagamentoIcon}>
                        <Ionicons name="card" size={28} color={colors.primary} />
                      </View>
                      <View style={styles.pagamentoInfo}>
                        <Text style={styles.pagamentoNome}>Cartão de Crédito</Text>
                        <Text style={styles.pagamentoDesc}>Cobrança automática mensal</Text>
                      </View>
                      {contratando ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.voltarButton}
                      onPress={() => setEtapaModal('horarios')}
                    >
                      <Text style={styles.voltarButtonText}>Mudar Horários</Text>
                    </TouchableOpacity>

                    <View style={styles.alertaBox}>
                      <Ionicons name="alert-circle" size={20} color="#FF9800" />
                      <Text style={styles.alertaText}>
                        Ao contratar, você concorda com o período de fidelidade de {planoSelecionado.duracaoMinimaMeses} meses.
                      </Text>
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: colors.primary,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.textDark,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  precoBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  precoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  precoMes: {
    fontSize: 12,
    color: '#2e7d32',
    marginLeft: 2,
  },
  descricao: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  detalhesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detalheItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  detalheText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.textDark,
  },
  horariosContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  horariosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  horariosText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  contratarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  contratarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  modalBody: {
    padding: 16,
  },
  resumoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resumoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 12,
  },
  resumoValue: {
    fontSize: 15,
    color: colors.textDark,
    marginTop: 2,
  },
  resumoValuePreco: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 2,
  },
  pagamentoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pagamentoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagamentoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pagamentoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  pagamentoDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alertaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  alertaText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#E65100',
  },
  selecionarHorarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  selecionarHorarioText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  etapaTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  etapaSubtitulo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  horarioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  horarioOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  horarioOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  horarioOptionDia: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  horarioOptionHora: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  continuarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  continuarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  voltarButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  voltarButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  diasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  diaOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  diaOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  diaOptionText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark,
  },
  diaOptionTextSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  horariosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  horarioGridOption: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horarioGridOptionSelecionado: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  horarioGridOptionOcupado: {
    borderColor: '#ffcccc',
    backgroundColor: '#ffebee',
    opacity: 0.7,
  },
  horarioGridText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  horarioGridTextSelecionado: {
    color: '#FFF',
  },
  horarioGridTextOcupado: {
    color: '#c62828',
    textDecorationLine: 'line-through',
  },
  ocupadoBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#c62828',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  ocupadoText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: 'bold',
  },
  checkIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  horariosNavegacao: {
    alignItems: 'center',
    marginBottom: 16,
  },
  horariosProgresso: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});