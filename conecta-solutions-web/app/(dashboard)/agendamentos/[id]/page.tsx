'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MessageCircle, 
  Check, 
  X, 
  AlertCircle,
  FileText,
  DollarSign,
  CheckCircle,
  Star,
  StarOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/detalhes-agendamento.css';

export default function DetalhesAgendamentoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, dadosUsuario } = useAuth();
  
  const [agendamento, setAgendamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);

  // Variáveis calculadas (movidas para cima para serem usadas em funções)
  const ehProfissional = dadosUsuario?.perfil === 'profissional' || (agendamento && user?.uid === agendamento.profissionalId);
  const status = agendamento?.status || 'pendente';

  useEffect(() => {
    async function loadAgendamento() {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'agendamentos', id as string));
        if (snap.exists()) {
          setAgendamento({ id: snap.id, ...snap.data() });
        } else {
          toast.error('Agendamento não encontrado.');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar detalhes.');
      } finally {
        setLoading(false);
      }
    }
    loadAgendamento();
  }, [id, router]);

  const atualizarStatus = async (novoStatus: string) => {
    if (!agendamento || processando) return;
    
    // Confirmação para concluir
    if (novoStatus === 'concluido' && !confirm('Confirmar conclusão deste serviço?')) return;
    if (novoStatus === 'recusado' && !confirm('Deseja recusar este pedido?')) return;

    setProcessando(true);
    try {
      const agRef = doc(db, 'agendamentos', agendamento.id);
      const updateData: any = {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
        finalizado: novoStatus === 'concluido' || novoStatus === 'cancelado' || novoStatus === 'recusado'
      };

      if (novoStatus === 'confirmado') updateData.confirmadoEm = serverTimestamp();
      if (novoStatus === 'recusado')   updateData.recusadoEm = serverTimestamp();
      if (novoStatus === 'cancelado')  updateData.canceladoEm = serverTimestamp();
      if (novoStatus === 'concluido')  updateData.concluidoEm = serverTimestamp();

      await updateDoc(agRef, updateData);

      // 1. TENTAR NOTIFICAR A OUTRA PARTE (Pode falhar por regras de segurança)
      try {
        const destinoId = dadosUsuario?.perfil === 'cliente' ? agendamento.profissionalId : agendamento.clienteId;
        const remetenteNome = dadosUsuario?.nome || 'Conecta Serviços';

        let msg = '';
        if (novoStatus === 'confirmado') msg = `Seu agendamento para ${agendamento.data} foi confirmado por ${remetenteNome}! ✅`;
        if (novoStatus === 'recusado')   msg = `O profissional ${remetenteNome} não pôde aceitar seu pedido para ${agendamento.data}. ❌`;
        if (novoStatus === 'cancelado')  msg = `${remetenteNome} cancelou o agendamento de ${agendamento.data}.`;
        if (novoStatus === 'concluido')  msg = `Serviço concluído! ${remetenteNome} finalizou seu atendimento de ${agendamento.data}. ✨`;

        if (destinoId) {
          await addDoc(collection(db, 'usuarios', destinoId, 'notificacoes'), {
            titulo: 'Atualização de Agendamento 📅',
            mensagem: msg,
            data: serverTimestamp(),
            createdAt: serverTimestamp(),
            lida: false,
            visualizada: false,
            tipo: 'status_agendamento',
            agendamentoId: agendamento.id
          });

          // 2. Tentar incrementar contador
          try {
            await updateDoc(doc(db, 'usuarios', destinoId), {
              notificacoesNaoLidas: increment(1)
            });
          } catch (e) {
            console.warn('Contador não incrementado.');
          }
        }
      } catch (errNotif) {
        console.warn('Falha ao enviar notificação (Regras de Segurança), mas agendamento será atualizado.');
      }

      toast.success(`Agendamento ${novoStatus} com sucesso!`);
      setAgendamento((prev: any) => ({ ...prev, ...updateData, status: novoStatus }));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status.');
    } finally {
      setProcessando(false);
    }
  };

  const gerarOS = () => {
    if (!agendamento) return;

    const statusTraduzido = status.toUpperCase();
    const numeroOS = agendamento.id.substring(0, 8).toUpperCase();
    const total = Number(agendamento.valor || agendamento.preco || 0).toFixed(2);

    // SEGURANÇA: Se data/horário forem undefined, tenta extrair do dataHora (Timestamp)
    let dataTexto = agendamento.data;
    let horaTexto = agendamento.horario;

    if (!dataTexto || !horaTexto) {
      const d = agendamento.dataHora?.toDate ? agendamento.dataHora.toDate() : new Date(agendamento.dataHora);
      if (d && !isNaN(d.getTime())) {
        if (!dataTexto) dataTexto = d.toLocaleDateString('pt-BR');
        if (!horaTexto) horaTexto = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    }

    const htmlOS = `
      <html>
        <head>
          <title>Ordem de Serviço - ${numeroOS}</title>
          <style>
            body { font-family: 'Helvetica', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #1971c2; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #1971c2; margin: 0; }
            .os-number { font-size: 14px; color: #666; margin-top: 5px; }
            
            .section { margin-bottom: 25px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
            .section-title { background: #f8f9fa; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
            .section-content { padding: 15px; }
            
            .row { display: flex; margin-bottom: 8px; }
            .label { width: 150px; font-weight: bold; color: #666; font-size: 13px; }
            .value { flex: 1; color: #000; font-size: 14px; }
            
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table-header { background: #f8f9fa; text-align: left; }
            .table th, .table td { padding: 12px; border-bottom: 1px solid #eee; }
            .total-row { font-size: 18px; font-weight: bold; color: #1971c2; text-align: right; padding-top: 20px; }
            
            .signatures { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-box { border-top: 1px solid #333; text-align: center; padding-top: 10px; }
            .sig-label { font-size: 11px; font-weight: bold; text-transform: uppercase; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #1971c2; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Imprimir / Salvar PDF</button>
          </div>

          <div class="header">
            <h1 class="title">ORDEM DE SERVIÇO</h1>
            <div class="os-number">Nº DO CONTROLE: ${numeroOS}</div>
          </div>

          <div class="section">
            <div class="section-title">DADOS DO PROFISSIONAL (PRESTADOR)</div>
            <div class="section-content">
              <div class="row"><div class="label">PROFISSIONAL:</div><div class="value">${agendamento.profissionalNome || dadosUsuario?.nome || 'Prestador Autorizado'}</div></div>
              <div class="row"><div class="label">CONTATO:</div><div class="value">${dadosUsuario?.whatsapp || dadosUsuario?.telefone || '---'}</div></div>
              <div class="row"><div class="label">ESPECIALIDADE:</div><div class="value">${dadosUsuario?.especialidade || dadosUsuario?.categoria || 'Serviços Gerais'}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">DADOS DO CLIENTE</div>
            <div class="section-content">
              <div class="row"><div class="label">CLIENTE:</div><div class="value">${agendamento.clienteNome || '---'}</div></div>
              <div class="row"><div class="label">WHATSAPP:</div><div class="value">${agendamento.clienteWhatsapp || agendamento.whatsapp || '---'}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">DETALHES DO ATENDIMENTO</div>
            <div class="section-content">
              <div class="row"><div class="label">DATA:</div><div class="value">${dataTexto || '---'}</div></div>
              <div class="row"><div class="label">HORÁRIO:</div><div class="value">${horaTexto || '---'}</div></div>
              <div class="row"><div class="label">PROFISSIONAL:</div><div class="value">${agendamento.profissionalNome}</div></div>
              <div class="row"><div class="label">STATUS:</div><div class="value">${statusTraduzido}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">SERVIÇOS PRESTADOS</div>
            <div class="section-content">
              <table class="table">
                <tr class="table-header"><th>Descrição</th><th style="text-align: right;">Valor</th></tr>
                <tr><td>${agendamento.servico}</td><td style="text-align: right;">R$ ${total}</td></tr>
              </table>
              <div class="total-row">TOTAL: R$ ${total}</div>
            </div>
          </div>

          <div class="signatures">
            <div class="sig-box"><div class="sig-label">Assinatura do Profissional</div></div>
            <div class="sig-box"><div class="sig-label">Assinatura do Cliente</div></div>
          </div>

          <div class="footer">
            Documento gerado pelo sistema Conecta Serviços em ${new Date().toLocaleString('pt-BR')} - ID: ${agendamento.id}
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlOS);
      win.document.close();
    }
  };

  // LÓGICA DE AVALIAÇÃO
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [avaliado, setAvaliado] = useState(false);

  const enviarAvaliacao = async () => {
    if (nota === 0) return toast.error('Selecione uma nota de 1 a 5 estrelas');
    if (processando) return;

    setProcessando(true);
    try {
      if (!user?.uid || !agendamento?.profissionalId) {
        throw new Error('Usuário ou profissional não identificado.');
      }

      // 1. Salva a nova avaliação
      await addDoc(collection(db, 'avaliacoes'), {
        agendamentoId: agendamento.id,
        profissionalId: agendamento.profissionalId,
        clienteId: user.uid,
        clienteNome: dadosUsuario?.nome || 'Cliente',
        clienteFoto: dadosUsuario?.fotoPerfil || '',
        nota,
        comentario,
        servico: agendamento.servico,
        data: serverTimestamp()
      });

      // 2. Atualiza a média do profissional
      const profRef = doc(db, 'usuarios', agendamento.profissionalId);
      const profSnap = await getDoc(profRef);
      
      if (profSnap.exists()) {
        const profData = profSnap.data();
        const totalAntigo = profData.totalAvaliacoes || 0;
        const mediaAntiga = profData.avaliacaoMedia || 0;
        
        const novoTotal = totalAntigo + 1;
        const novaMedia = ((mediaAntiga * totalAntigo) + nota) / novoTotal;
        
        await updateDoc(profRef, {
          totalAvaliacoes: novoTotal,
          avaliacaoMedia: novaMedia
        });
      }

      // 3. Marca o agendamento como avaliado no banco
      await updateDoc(doc(db, 'agendamentos', agendamento.id), {
        avaliado: true
      });

      setAvaliado(true);
      toast.success('Obrigado pela sua avaliação! ✨');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar avaliação.');
    } finally {
      setProcessando(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-primary font-bold">Carregando detalhes...</div>;
  if (!agendamento) return null;

  return (
    <div className="details-page">
      <div className="details-header">
        <button onClick={() => router.back()} className="details-back">
          <ArrowLeft size={18} /> Voltar
        </button>
        <span className={`status-text status--${status} font-bold`}>
          {status.toUpperCase()}
        </span>
      </div>

      <div className="details-card">
        <div className="details-hero">
          <div className="status-floating-badge">{status}</div>
          <div className="hero-avatar">
            {ehProfissional ? (agendamento.clienteNome?.[0] || 'C') : (agendamento.profissionalNome?.[0] || 'P')}
          </div>
          <h2 className="hero-title">
            {ehProfissional ? agendamento.clienteNome : agendamento.profissionalNome}
          </h2>
          <p className="hero-subtitle">{agendamento.servico}</p>
        </div>

        <div className="details-content">
          <div className="details-section">
            <h4><AlertCircle size={18} /> Detalhes do Horário</h4>
            
            <div className="info-item">
              <div className="info-icon"><Calendar size={20} /></div>
              <div className="info-text">
                <label>Data</label>
                <span>{agendamento.data}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Clock size={20} /></div>
              <div className="info-text">
                <label>Horário</label>
                <span>{agendamento.horario}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><FileText size={20} /></div>
              <div className="info-text">
                <label>Referência</label>
                <span className="text-xs text-gray-400">ID: {agendamento.id}</span>
              </div>
            </div>
          </div>

          <div className="details-section">
            <h4><DollarSign size={18} /> Resumo Financeiro</h4>
            <div className="services-list">
              <div className="service-row">
                <span>{agendamento.servico}</span>
                <span>R$ {Number(agendamento.valor || agendamento.preco || 0).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>TOTAL A RECEBER</span>
                <span>R$ {Number(agendamento.valor || agendamento.preco || 0).toFixed(2)}</span>
              </div>
            </div>

            {ehProfissional && agendamento.clienteWhatsapp && (
              <a 
                href={`https://wa.me/55${agendamento.clienteWhatsapp.replace(/\D/g, '')}`} 
                target="_blank" 
                className="btn-action btn-whatsapp"
                style={{ marginTop: '1.5rem', width: '100%' }}
              >
                <MessageCircle size={18} /> WhatsApp do Cliente
              </a>
            )}
          </div>
        </div>

        <div className="details-actions">
          {/* AÇÕES DO PROFISSIONAL */}
          {ehProfissional && (
            <>
              {/* Botão de OS visível se confirmado ou concluído */}
              {(status === 'confirmado' || status === 'concluido') && (
                <button onClick={gerarOS} className="btn-action" style={{ backgroundColor: '#495057', color: 'white', marginBottom: '1rem', width: '100%' }}>
                  <FileText size={18} /> Gerar Ordem de Serviço (PDF)
                </button>
              )}

              {status === 'pendente' && (
                <>
                  <button onClick={() => atualizarStatus('confirmado')} className="btn-action btn-confirm" disabled={processando}>
                    <Check size={18} /> Confirmar Atendimento
                  </button>
                  <button onClick={() => atualizarStatus('recusado')} className="btn-action btn-reject" disabled={processando}>
                    <X size={18} /> Recusar Pedido
                  </button>
                </>
              )}

              {status === 'confirmado' && (
                <button onClick={() => atualizarStatus('concluido')} className="btn-action btn-confirm" style={{ backgroundColor: '#1971c2' }} disabled={processando}>
                  <CheckCircle size={18} /> Marcar como Concluído
                </button>
              )}
            </>
          )}

          {/* AÇÕES DO CLIENTE */}
          {!ehProfissional && status === 'pendente' && (
            <button onClick={() => atualizarStatus('cancelado')} className="btn-action btn-cancel" disabled={processando}>
              <X size={18} /> Cancelar Meu Pedido
            </button>
          )}

          {/* AREA DE AVALIAÇÃO PARA O CLIENTE */}
          {!ehProfissional && status === 'concluido' && !agendamento.avaliado && !avaliado && (
            <div className="p-6 bg-white border-2 border-dashed border-primary/20 rounded-2xl text-center space-y-4 shadow-sm" style={{ marginTop: '1rem' }}>
              <div className="flex flex-col items-center">
                <Star size={32} fill="#fab005" stroke="none" className="mb-2" />
                <h3 className="font-bold text-gray-800 text-lg">Avalie este serviço</h3>
                <p className="text-gray-500 text-sm">Sua opinião é muito importante para o profissional!</p>
              </div>
              
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button 
                    key={num} 
                    onClick={() => setNota(num)}
                    className="transition-transform active:scale-90"
                  >
                    <Star 
                      size={36} 
                      fill={num <= nota ? "#fab005" : "none"} 
                      stroke={num <= nota ? "#fab005" : "#A0A8B3"} 
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>

              {nota > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <textarea 
                    placeholder="Conte-nos o que achou do atendimento (opcional)..."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm min-h-[100px]"
                  />
                  <button 
                    onClick={enviarAvaliacao} 
                    className="btn-action" 
                    style={{ backgroundColor: '#1971c2', width: '100%' }}
                    disabled={processando}
                  >
                    Enviar Avaliação
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK DE STATUS FINALIZADO */}
          {status === 'concluido' && (
            <div className="p-4 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-3 w-full border border-blue-100">
              <CheckCircle size={20} /> Este serviço foi concluído com sucesso.
            </div>
          )}

          {(status === 'recusado' || status === 'cancelado') && (
            <div className="p-4 bg-gray-50 text-gray-500 rounded-xl flex items-center gap-3 w-full border border-gray-200">
              <AlertCircle size={20} /> Atendimento cancelado ou recusado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
