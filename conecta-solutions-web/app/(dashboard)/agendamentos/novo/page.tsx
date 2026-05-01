'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, Timestamp, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Calendar as CalendarIcon, Clock, ArrowLeft, CheckCircle, CreditCard, QrCode, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/novo-agendamento.css';

function NovoAgendamentoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dadosUsuario } = useAuth();

  const profId = searchParams.get('prof');
  const servId = searchParams.get('serv');

  const [profissional, setProfissional] = useState<any>(null);
  const [servico, setServico]           = useState<any>(null);
  const [servicos, setServicos]         = useState<any[]>([]);
  const [dataSel, setDataSel]           = useState('');
  const [horaSel, setHoraSel]           = useState('');
  const [loading, setLoading]           = useState(true);
  const [enviando, setEnviando]         = useState(false);
  const [equipe, setEquipe]             = useState<any[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<any>(null);
  const [formaPagamento, setFormaPagamento] = useState('pix');

  const FORMAS_PAGAMENTO = [
    {
      id: 'pix',
      titulo: 'Pix',
      descricao: 'Pagamento instantâneo',
      icon: 'qr-code'
    },
    {
      id: 'cartao_credito',
      titulo: 'Cartão de crédito',
      descricao: 'Pagamento parcelado',
      icon: 'credit-card'
    },
    {
      id: 'dinheiro',
      titulo: 'Dinheiro',
      descricao: 'Pagamento no local',
      icon: 'banknote'
    }
  ];

  useEffect(() => {
    async function loadData() {
      if (!profId) return;
      try {
        const pSnap = await getDoc(doc(db, 'usuarios', profId));

        // Carregar todos os serviços do profissional
        const servicosSnap = await getDocs(collection(db, 'usuarios', profId, 'servicos'));
        const listaServicos = servicosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setServicos(listaServicos);

        // Se servId foi passado, seleciona o serviço correspondente
        if (servId) {
          const servicoSelecionado = listaServicos.find(s => s.id === servId);
          if (servicoSelecionado) {
            setServico(servicoSelecionado);
          }
        } else if (listaServicos.length > 0) {
          // Se não passou servId, seleciona o primeiro por padrão
          setServico(listaServicos[0]);
        }

        if (pSnap.exists()) {
          const dadosProfissional = { id: pSnap.id, ...pSnap.data() };
          setProfissional(dadosProfissional);

          // Carregar equipe completa (dono + colaboradores)
          const equipeLista = [dadosProfissional];

          // Buscar colaboradores da subcoleção (mobile)
          try {
            const colabSnap = await getDocs(collection(db, 'usuarios', profId, 'colaboradores'));
            colabSnap.docs.forEach(d => {
              equipeLista.push({ id: d.id, ...d.data() });
            });
          } catch (e) {
            console.log('[Agendamento] Erro ao buscar colaboradores subcoleção:', e);
          }

          // Buscar colaboradores da coleção raiz (web)
          try {
            const webSnap = await getDocs(
              query(collection(db, 'colaboradores'), where('profissionalId', '==', profId))
            );
            webSnap.docs.forEach(d => {
              const dados = d.data();
              const colabId = dados.uid || d.id;
              if (!equipeLista.find(c => c.id === colabId)) {
                equipeLista.push({ id: colabId, ...dados });
              }
            });
          } catch (e) {
            console.log('[Agendamento] Erro ao buscar colaboradores web:', e);
          }

          setEquipe(equipeLista);
          setProfissionalSelecionado(dadosProfissional); // Seleciona o dono por padrão
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar detalhes.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profId, servId]);

  const slots = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  const confirmarAgendamento = async () => {
    if (!dataSel || !horaSel || !dadosUsuario?.uid || !servico) {
      toast.error('Selecione serviço, data e horário.');
      return;
    }

    setEnviando(true);
    try {
      const dataObjeto = new Date(`${dataSel}T${horaSel}:00`);
      const dataString = dataObjeto.toLocaleDateString('pt-BR');

      // 1. Criar o Agendamento com a estrutura COMPLETA do Mobile
      const agendamentoData = {
        // Dados do Cliente
        clienteId: dadosUsuario.uid,
        clienteNome: dadosUsuario.nome || 'Cliente',
        clienteFoto: dadosUsuario.fotoUrl || '',
        clienteWhatsapp: dadosUsuario.whatsapp || '',
        clientePushToken: dadosUsuario.pushToken || '',

        // Dados do Profissional/Clínica
        profissionalId: profissionalSelecionado?.id || profId,
        profissionalNome: profissionalSelecionado?.nome || profissionalSelecionado?.nomeCompleto || 'Profissional',
        colaboradorId: profissionalSelecionado?.id !== profId ? profissionalSelecionado?.id : null,
        colaboradorNome: profissionalSelecionado?.id !== profId ? (profissionalSelecionado?.nome || profissionalSelecionado?.nomeCompleto) : null,
        clinicaId: profId,
        clinicaNome: profissional?.nome || profissional?.nomeCompleto || 'Profissional',

        // Estrutura de Serviços (Array de objetos que o Mobile exige)
        servicoId: servico.id, // Principal - usa o ID do serviço selecionado
        servico: servico?.nome || 'Serviço',
        servicos: [
          {
            id: servico.id,
            nome: servico?.nome || 'Serviço',
            preco: Number(servico?.preco) || 0,
            duracao: Number(servico?.duracao) || 30
          }
        ],

        // Valores e Status
        preco: Number(servico?.preco) || 0, // Campo 'preco' usado no Mobile
        valor: Number(servico?.preco) || 0, // Campo 'valor' usado na Web
        duracao: Number(servico?.duracao) || 30,
        status: 'pendente',
        statusPagamento: 'aguardando_cobranca',
        formaPagamento: formaPagamento,
        formaPagamentoLabel: FORMAS_PAGAMENTO.find(f => f.id === formaPagamento)?.titulo || 'Pix',
        finalizado: false,

        // Datas (Strings e Timestamps)
        data: dataString,        // "13/04/2026"
        horario: horaSel,        // "08:00"
        dataFiltro: dataSel,     // "2026-04-13" (usado para filtros de disponibilidade)
        dataHora: Timestamp.fromDate(dataObjeto),
        dataCriacao: serverTimestamp(),
        criadoEm: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'agendamentos'), agendamentoData);

      // 2. ENVIAR NOTIFICAÇÃO (Seguindo rigorosamente o padrão do Mobile)
      const nomeCliente = dadosUsuario.nome || dadosUsuario.email || 'Cliente';
      const profissionalNotificarId = profissionalSelecionado?.id || profId;
      await addDoc(collection(db, 'usuarios', profissionalNotificarId as string, 'notificacoes'), {
        titulo: 'Novo Agendamento! 📅',
        mensagem: `${nomeCliente} solicitou ${servico?.nome} para ${dataString} às ${horaSel}.`,
        texto: `${nomeCliente} solicitou ${servico?.nome} para ${dataString} às ${horaSel}.`, // redundância
        data: serverTimestamp(),
        createdAt: serverTimestamp(), // O Mobile às vezes usa createdAt
        lida: false,
        visualizada: false, 
        tipo: 'novo_agendamento',
        tipoNotificacao: 'agendamento',
        agendamentoId: docRef.id,
        clienteId: dadosUsuario.uid,
        clienteNome: nomeCliente
      });

      // 3. Tentar atualizar contador (pode falhar se as regras de segurança forem restritas)
      try {
        await updateDoc(doc(db, 'usuarios', profissionalNotificarId as string), {
          notificacoesNaoLidas: increment(1)
        });
      } catch (e) {
        console.warn('Nota: Contador de notificações não foi incrementado devido a permissões, mas o agendamento foi salvo.');
      }

      toast.success('Agendamento realizado com sucesso!');
      router.push('/agendamentos');
    } catch (err) {
      console.error('[Agendamento]', err);
      toast.error('Erro ao processar agendamento.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <div className="book-loading">Carregando detalhes...</div>;

  return (
    <div className="book-page">
      <Topbar title="Confirmar Agendamento" subtitle="Seu pedido aparecerá instantaneamente no App do profissional" />
      <div className="book-container">
        <button onClick={() => router.back()} className="btn-back"><ArrowLeft size={16} /> Voltar</button>

        <div className="book-grid">
          <div className="book-summary">
            <h3 className="book-title">Resumo do Serviço</h3>
            <div className="book-serv-card">
              <div className="book-serv-icon"><CheckCircle size={24} /></div>
              <div className="book-serv-info">
                <h4>{servico?.nome}</h4>
                <p>Profissional: {profissionalSelecionado?.nome || profissionalSelecionado?.nomeCompleto || profissional?.nome || profissional?.nomeCompleto}</p>
                <div className="book-serv-pills">
                  <span>R$ {Number(servico?.preco).toFixed(2)}</span>
                  <span>{servico?.duracao} min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="book-selection">
            <div className="book-step">
              <div className="book-step-head"><CalendarIcon size={18} /> 1. Serviço</div>
              <div className="book-servicos-list">
                {servicos.map((s) => (
                  <button
                    key={s.id}
                    className={`book-servico-item ${servico?.id === s.id ? 'book-servico-item--selected' : ''}`}
                    onClick={() => setServico(s)}
                  >
                    <div className="book-servico-item-info">
                      <span className="book-servico-item-nome">{s.nome}</span>
                      <span className="book-servico-item-detalhes">
                        R$ {Number(s.preco).toFixed(2)} • {s.duracao} min
                      </span>
                    </div>
                    {servico?.id === s.id && <CheckCircle size={16} className="book-servico-item-check" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="book-step">
              <div className="book-step-head"><CalendarIcon size={18} /> 2. Profissional</div>
              <div className="book-profissionais-list">
                {equipe.map((prof) => (
                  <button
                    key={prof.id}
                    className={`book-profissional-card ${profissionalSelecionado?.id === prof.id ? 'book-profissional-card--selected' : ''}`}
                    onClick={() => setProfissionalSelecionado(prof)}
                  >
                    <div className="book-profissional-avatar">
                      {prof.fotoUrl || prof.fotoPerfil ? (
                        <img src={prof.fotoUrl || prof.fotoPerfil} alt={prof.nome || prof.nomeCompleto} />
                      ) : (
                        <span>{(prof.nome || prof.nomeCompleto || 'P')?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="book-profissional-info">
                      <span className="book-profissional-nome">{prof.nome || prof.nomeCompleto}</span>
                      {prof.id === profId && <span className="book-profissional-badge">Dono</span>}
                    </div>
                    {profissionalSelecionado?.id === prof.id && <CheckCircle size={16} className="book-profissional-check" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="book-step">
              <div className="book-step-head"><CalendarIcon size={18} /> 3. Data do Atendimento</div>
              <input
                type="date"
                className="book-date-input"
                min={new Date().toISOString().split('T')[0]}
                value={dataSel}
                onChange={e => setDataSel(e.target.value)}
              />
            </div>

            <div className="book-step">
              <div className="book-step-head"><Clock size={18} /> 4. Horário Disponível</div>
              <div className="book-slots-grid">
                {slots.map(s => (
                  <button 
                    key={s} 
                    className={`book-slot ${horaSel === s ? 'book-slot--active' : ''}`} 
                    onClick={() => setHoraSel(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="book-step">
              <div className="book-step-head"><CreditCard size={18} /> 5. Forma de Pagamento</div>
              <div className="book-payment-list">
                {FORMAS_PAGAMENTO.map((fp) => {
                  const Icon = fp.id === 'pix' ? QrCode : fp.id === 'cartao_credito' ? CreditCard : Banknote;
                  return (
                    <button
                      key={fp.id}
                      className={`book-payment-card ${formaPagamento === fp.id ? 'book-payment-card--selected' : ''}`}
                      onClick={() => setFormaPagamento(fp.id)}
                    >
                      <div className="book-payment-icon">
                        <Icon size={20} />
                      </div>
                      <div className="book-payment-info">
                        <span className="book-payment-title">{fp.titulo}</span>
                        <span className="book-payment-desc">{fp.descricao}</span>
                      </div>
                      {formaPagamento === fp.id && <CheckCircle size={16} className="book-payment-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              className="btn-confirm-booking" 
              disabled={!dataSel || !horaSel || enviando} 
              onClick={confirmarAgendamento}
            >
              {enviando ? 'Processando...' : 'Confirmar e Notificar Profissional'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NovoAgendamentoPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovoAgendamentoContent />
    </Suspense>
  );
}
