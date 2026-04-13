'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { ChevronLeft, ChevronRight, Clock, User, DollarSign, CheckCircle, X, AlertCircle } from 'lucide-react';
import '@/styles/agenda.css';

// ============================================================
// TIPOS
// ============================================================
interface Agendamento {
  id: string;
  clienteNome?: string;
  profissionalNome?: string;
  servico?: string;
  dataHora?: { toDate(): Date } | string;
  status?: string;
  valor?: number;
  duracao?: number;
}

// Dias da semana e meses em português
const DIAS_SEMANA  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES        = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Retorna uma data segura a partir do campo do Firestore
function toDate(valor: Agendamento['dataHora']): Date | null {
  if (!valor) return null;
  if (typeof (valor as { toDate?: () => Date }).toDate === 'function') {
    return (valor as { toDate: () => Date }).toDate();
  }
  const d = new Date(valor as string);
  return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// COMPONENTE PRINCIPAL — AGENDA
// ============================================================
export default function AgendaPage() {
  const { dadosUsuario, ehProfissional } = useAuth();
  const [agendamentos, setAgendamentos]   = useState<Agendamento[]>([]);
  const [loading, setLoading]             = useState(true);
  const [mesAtual, setMesAtual]           = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date());

  // Carrega agendamentos do mês atual
  const carregarAgendamentos = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      const campo = ehProfissional ? 'profissionalId' : 'clienteId';
      const q = query(
        collection(db, 'agendamentos'),
        where(campo, '==', dadosUsuario.uid),
        orderBy('dataHora', 'asc')
      );
      const snap = await getDocs(q);
      setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agendamento)));
    } catch (err) {
      console.error('[Agenda]', err);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario, ehProfissional]);

  useEffect(() => { carregarAgendamentos(); }, [carregarAgendamentos]);

  // ── Helpers de calendário ──────────────────────────────────
  const primeiroDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const ultimoDiaMes   = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
  const offsetInicio   = primeiroDiaMes.getDay(); // 0=Dom

  // Gera os dias visíveis na grade (incluindo célululas vazias no início)
  const celulas: (Date | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: ultimoDiaMes.getDate() }, (_, i) =>
      new Date(mesAtual.getFullYear(), mesAtual.getMonth(), i + 1)
    ),
  ];

  const mesAnterior = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1));
  const proximoMes  = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1));

  // Agendamentos de um dia específico
  const agendamentosDoDia = (dia: Date) =>
    agendamentos.filter(ag => {
      const d = toDate(ag.dataHora);
      return d && d.toDateString() === dia.toDateString();
    });

  // Agendamentos do dia selecionado
  const agendamentosSelecionados = diaSelecionado ? agendamentosDoDia(diaSelecionado) : [];

  const hoje = new Date();

  // Ícone de status
  const IconeStatus = ({ status = '' }: { status?: string }) => {
    const icones: Record<string, React.ReactNode> = {
      confirmado: <CheckCircle size={14} />,
      pendente:   <AlertCircle size={14} />,
      cancelado:  <X size={14} />,
      concluido:  <CheckCircle size={14} />,
    };
    return <>{icones[status] ?? <AlertCircle size={14} />}</>;
  };

  return (
    <div className="agenda-page-enterprise">
      <Topbar title="Gestão de Compromissos" subtitle="Controle total da sua agenda corporativa" />

      <div className="agenda-container-premium">
        
        {/* ===== COLUNA ESQUERDA — CALENDÁRIO CORPORATIVO ===== */}
        <section className="calendario-enterprise-panel">
          <div className="calendario-header-premium">
            <h2 className="mes-titulo-premium">
              {MESES[mesAtual.getMonth()]} <span>{mesAtual.getFullYear()}</span>
            </h2>
            <div className="nav-btns-premium">
              <button onClick={mesAnterior}><ChevronLeft size={20} /></button>
              <button onClick={proximoMes}><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="calendario-grid-premium">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="grid-header-cell-premium">{d}</div>
            ))}
            
            {celulas.map((dia, i) => {
              if (!dia) return <div key={`empty-${i}`} className="cell-premium cell-vazio" />;

              const isHoje = dia.toDateString() === hoje.toDateString();
              const isSelecionado = diaSelecionado?.toDateString() === dia.toDateString();
              const qtd = agendamentosDoDia(dia).length;
              const temAgs = qtd > 0;

              return (
                <button
                  key={dia.toISOString()}
                  onClick={() => setDiaSelecionado(dia)}
                  className={`cell-premium ${isHoje ? 'is-hoje' : ''} ${isSelecionado ? 'is-selecionado' : ''} ${temAgs ? 'has-events' : ''}`}
                >
                  <span className="dia-num">{dia.getDate()}</span>
                  {temAgs && <div className="event-dot" style={{ opacity: Math.min(qtd * 0.3, 1) }} />}
                </button>
              );
            })}
          </div>

          <div className="calendario-summary-premium">
            <div className="summary-item">
              <strong>{agendamentos.length}</strong> compromissos no mês
            </div>
          </div>
        </section>

        {/* ===== COLUNA DIREITA — TIMELINE DO DIA ===== */}
        <section className="timeline-enterprise-panel">
          <div className="timeline-header-premium">
            <div className="header-info-premium">
              <h3 className="dia-titulo-premium">
                {diaSelecionado
                  ? `${DIAS_SEMANA[diaSelecionado.getDay()]}, ${diaSelecionado.getDate()}`
                  : 'Selecione um dia'}
              </h3>
              <p className="dia-subtitulo-premium">{MESES[diaSelecionado?.getMonth() || 0]}</p>
            </div>
            <div className="dia-status-badge">
              {agendamentosSelecionados.length} SERVIÇOS
            </div>
          </div>

          <div className="timeline-list-premium">
            {loading ? (
              <div className="loading-state-premium">Carregando timeline...</div>
            ) : agendamentosSelecionados.length === 0 ? (
              <div className="vazio-state-premium">
                <Clock size={40} className="opacity-20" />
                <p>Nenhuma atividade para este dia.</p>
              </div>
            ) : (
              agendamentosSelecionados.map(ag => {
                const data = toDate(ag.dataHora);
                const hora = data?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={ag.id} className={`agenda-item-premium status-${ag.status}`}>
                    <div className="item-time-panel">
                      <span className="time-val">{hora}</span>
                      <div className="status-line" />
                    </div>
                    
                    <div className="item-card-premium">
                      <div className="card-top">
                        <span className="servico-name">{ag.servico || 'Serviço Geral'}</span>
                        <span className={`status-badge-premium ${ag.status}`}>
                          <IconeStatus status={ag.status} /> {ag.status}
                        </span>
                      </div>
                      
                      <div className="card-main">
                        <div className="user-info-premium">
                          <div className="user-avatar-mini">
                            <User size={14} />
                          </div>
                          <span className="user-name-premium">
                            {ehProfissional ? ag.clienteNome : ag.profissionalNome}
                          </span>
                        </div>
                        {ag.valor != null && (
                          <div className="price-tag-premium">
                            R$ {Number(ag.valor).toFixed(2).replace('.', ',')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
