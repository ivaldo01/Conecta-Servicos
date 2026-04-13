'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Calendar as CalendarIcon, Clock, ArrowLeft, CheckCircle } from 'lucide-react';
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
  const [dataSel, setDataSel]           = useState('');
  const [horaSel, setHoraSel]           = useState('');
  const [loading, setLoading]           = useState(true);
  const [enviando, setEnviando]         = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!profId || !servId) return;
      try {
        const pSnap = await getDoc(doc(db, 'usuarios', profId));
        const sSnap = await getDoc(doc(db, 'usuarios', profId, 'servicos', servId));
        
        if (pSnap.exists()) {
          setProfissional({ id: pSnap.id, ...pSnap.data() });
        }
        if (sSnap.exists()) {
          setServico({ id: sSnap.id, ...sSnap.data() });
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
    if (!dataSel || !horaSel || !dadosUsuario?.uid) {
      toast.error('Selecione data e horário.');
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
        profissionalId: profId,
        profissionalNome: profissional?.nome || profissional?.nomeCompleto || 'Profissional',
        clinicaId: profId,
        clinicaNome: profissional?.nome || profissional?.nomeCompleto || 'Profissional',
        
        // Estrutura de Serviços (Array de objetos que o Mobile exige)
        servicoId: servId, // Principal
        servico: servico?.nome || 'Serviço',
        servicos: [
          {
            id: servId,
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
      await addDoc(collection(db, 'usuarios', profId as string, 'notificacoes'), {
        titulo: 'Novo Agendamento! 📅',
        mensagem: `${dadosUsuario.nome} solicitou ${servico?.nome} para ${dataString} às ${horaSel}.`,
        texto: `${dadosUsuario.nome} solicitou ${servico?.nome} para ${dataString} às ${horaSel}.`, // redundância
        data: serverTimestamp(),
        createdAt: serverTimestamp(), // O Mobile às vezes usa createdAt
        lida: false,
        visualizada: false, 
        tipo: 'novo_agendamento',
        tipoNotificacao: 'agendamento',
        agendamentoId: docRef.id,
        clienteId: dadosUsuario.uid,
        clienteNome: dadosUsuario.nome
      });

      // 3. Tentar atualizar contador (pode falhar se as regras de segurança forem restritas)
      try {
        await updateDoc(doc(db, 'usuarios', profId as string), {
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
                <p>Profissional: {profissional?.nome || profissional?.nomeCompleto}</p>
                <div className="book-serv-pills">
                  <span>R$ {Number(servico?.preco).toFixed(2)}</span>
                  <span>{servico?.duracao} min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="book-selection">
            <div className="book-step">
              <div className="book-step-head"><CalendarIcon size={18} /> 1. Data do Atendimento</div>
              <input 
                type="date" 
                className="book-date-input" 
                min={new Date().toISOString().split('T')[0]} 
                value={dataSel} 
                onChange={e => setDataSel(e.target.value)} 
              />
            </div>

            <div className="book-step">
              <div className="book-step-head"><Clock size={18} /> 2. Horário Disponível</div>
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
