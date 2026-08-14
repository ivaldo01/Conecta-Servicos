'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { ChevronLeft, ChevronRight, Clock, User, CheckCircle, X, AlertCircle, LayoutGrid, Calendar as CalendarIcon, Eye, CheckCircle2 } from 'lucide-react';
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
type ViewMode = 'monthly' | 'weekly';
type StatusFilter = 'todos' | 'pendente' | 'confirmado' | 'concluido' | 'cancelado';

export default function AgendaPage() {
  const { dadosUsuario, ehProfissional } = useAuth();
  const [agendamentos, setAgendamentos]   = useState<Agendamento[]>([]);
  const [loading, setLoading]             = useState(true);
  const [mesAtual, setMesAtual]           = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date());
  const [viewMode, setViewMode]           = useState<ViewMode>('monthly');
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('todos');

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
      const matchDia = d && d.toDateString() === dia.toDateString();
      const matchStatus = statusFilter === 'todos' || ag.status === statusFilter;
      return matchDia && matchStatus;
    });

  // Estatísticas do mês
  const stats = {
    total: agendamentos.length,
    pendentes: agendamentos.filter(a => a.status === 'pendente').length,
    confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
    concluidos: agendamentos.filter(a => a.status === 'concluido').length,
  };

  // Status filter config
  const FILTROS_STATUS: { key: StatusFilter; label: string; color: string }[] = [
    { key: 'todos', label: 'Todos', color: '#94a3b8' },
    { key: 'pendente', label: 'Pendentes', color: '#f59e0b' },
    { key: 'confirmado', label: 'Confirmados', color: '#10b981' },
    { key: 'concluido', label: 'Concluídos', color: '#8b5cf6' },
    { key: 'cancelado', label: 'Cancelados', color: '#ef4444' },
  ];

  const contagemStatus = (status: StatusFilter) =>
    status === 'todos' ? agendamentos.length : agendamentos.filter(item => item.status === status).length;

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

      <section className="agenda-intro-premium">
        <div>
          <span>PLANEJAMENTO OPERACIONAL</span>
          <h1>Organize seu tempo e cuide de cada atendimento.</h1>
          <p>Visualize sua disponibilidade, acompanhe os status e mantenha sua rotina sob controle.</p>
        </div>
        <button onClick={() => { const agora = new Date(); setMesAtual(agora); setDiaSelecionado(agora); }}>
          <CalendarIcon size={16} /> Ir para hoje
        </button>
      </section>

      <div className="agenda-container-premium">
        
        {/* ===== COLUNA ESQUERDA — CALENDÁRIO CORPORATIVO ===== */}
        <section className="calendario-enterprise-panel">
          {/* Mini Estatísticas */}
          <div className="mini-stats-premium" style={{ marginBottom: '24px' }}>
            <div className="mini-stat-card">
              <div className="mini-stat-value">{stats.total}</div>
              <div className="mini-stat-label">Total</div>
            </div>
            <div className="mini-stat-card">
              <div className="mini-stat-value pendente">{stats.pendentes}</div>
              <div className="mini-stat-label">Pendentes</div>
            </div>
            <div className="mini-stat-card">
              <div className="mini-stat-value confirmado">{stats.confirmados}</div>
              <div className="mini-stat-label">Confirmados</div>
            </div>
          </div>

          <div className="calendario-header-premium">
            <h2 className="mes-titulo-premium">
              {MESES[mesAtual.getMonth()]} <span>{mesAtual.getFullYear()}</span>
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Toggle Mensal/Semanal */}
              <div className="view-toggle-premium">
                <button 
                  className={`view-toggle-btn ${viewMode === 'monthly' ? 'ativo' : ''}`}
                  onClick={() => setViewMode('monthly')}
                >
                  <CalendarIcon size={14} /> Mensal
                </button>
                <button 
                  className={`view-toggle-btn ${viewMode === 'weekly' ? 'ativo' : ''}`}
                  onClick={() => setViewMode('weekly')}
                >
                  <LayoutGrid size={14} /> Semanal
                </button>
              </div>
              <div className="nav-btns-premium">
                <button onClick={mesAnterior}><ChevronLeft size={20} /></button>
                <button onClick={proximoMes}><ChevronRight size={20} /></button>
              </div>
            </div>
          </div>

          {/* Filtros de Status */}
          <div className="status-filters-premium">
            {FILTROS_STATUS.map(f => (
              <button
                key={f.key}
                className={`status-filter-btn ${statusFilter === f.key ? 'ativo' : ''}`}
                onClick={() => setStatusFilter(f.key)}
              >
                <div className="status-dot" style={{ background: f.color }}></div>
                {f.label}
                <span>{contagemStatus(f.key)}</span>
              </button>
            ))}
          </div>

          {viewMode === 'monthly' ? (
            <div className="calendario-grid-premium">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="grid-header-cell-premium">{d}</div>
            ))}
            
            {celulas.map((dia, i) => {
              if (!dia) return <div key={`empty-${i}`} className="cell-premium cell-vazio" />;

              const isHoje = dia.toDateString() === hoje.toDateString();
              const isSelecionado = diaSelecionado?.toDateString() === dia.toDateString();
              const agsDoDia = agendamentosDoDia(dia);
              const temAgs = agsDoDia.length > 0;

              // Contar agendamentos por status para dots coloridos
              const statusCount = {
                pendente: agsDoDia.filter(a => a.status === 'pendente').length,
                confirmado: agsDoDia.filter(a => a.status === 'confirmado').length,
                concluido: agsDoDia.filter(a => a.status === 'concluido').length,
                cancelado: agsDoDia.filter(a => a.status === 'cancelado').length,
              };

              return (
                <button
                  key={dia.toISOString()}
                  onClick={() => setDiaSelecionado(dia)}
                  className={`cell-premium ${isHoje ? 'is-hoje' : ''} ${isSelecionado ? 'is-selecionado' : ''} ${temAgs ? 'has-events' : ''}`}
                >
                  <span className="dia-num">{dia.getDate()}</span>
                  {temAgs && (
                    <div className="event-dots">
                      {statusCount.pendente > 0 && <div className="event-dot pendente" />}
                      {statusCount.confirmado > 0 && <div className="event-dot confirmado" />}
                      {statusCount.concluido > 0 && <div className="event-dot concluido" />}
                      {statusCount.cancelado > 0 && <div className="event-dot cancelado" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          ) : (
            // VISUALIZAÇÃO SEMANAL
            <div className="semana-grid-premium">
              {Array.from({ length: 7 }, (_, i) => {
                const diaSemana = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), mesAtual.getDate() - mesAtual.getDay() + i);
                const agsDoDia = agendamentosDoDia(diaSemana);
                const isHoje = diaSemana.toDateString() === hoje.toDateString();
                
                return (
                  <div key={i} className={`semana-dia-column ${isHoje ? 'hoje' : ''}`}>
                    <div className="semana-dia-header">
                      <div className="semana-dia-nome">{DIAS_SEMANA[diaSemana.getDay()]}</div>
                      <div className={`semana-dia-numero ${isHoje ? 'hoje' : ''}`}>{diaSemana.getDate()}</div>
                      {isHoje && <div className="hoje-badge">HOJE</div>}
                    </div>
                    <div className="semana-lista-agendamentos">
                      {agsDoDia.length === 0 ? (
                        <div className="semana-empty">
                          <Clock size={24} style={{ marginBottom: '8px', opacity: 0.3 }} />
                          <span>Sem agendamentos</span>
                        </div>
                      ) : (
                        agsDoDia.map(ag => {
                          const data = toDate(ag.dataHora);
                          const hora = data?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={ag.id} className="semana-ag-item" onClick={() => setDiaSelecionado(diaSemana)}>
                              <div className="semana-ag-hora">
                                <Clock size={12} /> {hora}
                              </div>
                              <div className="semana-ag-servico">{ag.servico || 'Serviço'}</div>
                              <div className="semana-ag-cliente">
                                <User size={10} />
                                {ag.clienteNome || 'Cliente'}
                                {ag.status && (
                                  <span className={`semana-ag-status ${ag.status}`}></span>
                                )}
                              </div>
                              {ag.valor && (
                                <div className="semana-ag-valor">
                                  R$ {Number(ag.valor).toFixed(2).replace('.', ',')}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
                <div className="vazio-agenda-icon"><Clock size={26} /></div>
                <strong>Horário disponível</strong>
                <p>Nenhuma atividade agendada para este dia.</p>
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
                      
                      {/* Ações Rápidas */}
                      <div className="quick-actions-premium">
                        {(ag.status === 'pendente' || ag.status === 'confirmado') && (
                          <button className="quick-action-btn concluir">
                            <CheckCircle2 size={12} /> Concluir
                          </button>
                        )}
                        {ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                          <button className="quick-action-btn cancelar">
                            <X size={12} /> Cancelar
                          </button>
                        )}
                        <button className="quick-action-btn detalhes">
                          <Eye size={12} /> Ver
                        </button>
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
