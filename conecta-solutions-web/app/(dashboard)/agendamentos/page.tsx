'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';
import { Calendar, Clock, X, RotateCcw, CheckCircle, AlertCircle, Search, Filter, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/agendamentos.css';

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
  preco?: number;
  profissionalId?: string;
  clienteId?: string;
}

type FiltroStatus = 'todos' | 'confirmado' | 'pendente' | 'concluido' | 'cancelado';

function toDate(v: Agendamento['dataHora']): Date | null {
  if (!v) return null;
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') return (v as { toDate: () => Date }).toDate();
  const d = new Date(v as string); return isNaN(d.getTime()) ? null : d;
}

export default function AgendamentosPage() {
  const { dadosUsuario, ehProfissional } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filtro, setFiltro]             = useState<FiltroStatus>('todos');
  const [busca, setBusca]               = useState('');

  const carregarAgendamentos = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      const campo = ehProfissional ? 'profissionalId' : 'clienteId';
      const q = query(
        collection(db, 'agendamentos'),
        where(campo, '==', dadosUsuario.uid),
        orderBy('dataHora', 'desc')
      );
      const snap = await getDocs(q);
      setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agendamento)));
    } catch (err) {
      console.error('[Agendamentos]', err);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario, ehProfissional]);

  useEffect(() => { carregarAgendamentos(); }, [carregarAgendamentos]);

  const cancelar = async (id: string) => {
    if (!confirm('Deseja cancelar este agendamento?')) return;
    try {
      await updateDoc(doc(db, 'agendamentos', id), { status: 'cancelado' });
      toast.success('Agendamento cancelado.');
      carregarAgendamentos();
    } catch { toast.error('Erro ao cancelar.'); }
  };

  const agendamentosFiltrados = agendamentos
    .filter(ag => filtro === 'todos' || ag.status === filtro)
    .filter(ag => {
      if (!busca) return true;
      const termo = busca.toLowerCase();
      return (
        ag.clienteNome?.toLowerCase().includes(termo) ||
        ag.profissionalNome?.toLowerCase().includes(termo) ||
        ag.servico?.toLowerCase().includes(termo)
      );
    });

  const fmtData = (v: Agendamento['dataHora']) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  };

  const FILTROS: { key: FiltroStatus; label: string }[] = [
    { key: 'todos',     label: 'Todos'     },
    { key: 'confirmado', label: 'Confirmados' },
    { key: 'pendente',  label: 'Pendentes' },
    { key: 'concluido', label: 'Concluídos' },
    { key: 'cancelado', label: 'Cancelados' },
  ];

  const IconeStatus = ({ status = '' }: { status?: string }) => ({
    confirmado: <CheckCircle size={14} />,
    concluido:  <CheckCircle size={14} />,
    pendente:   <AlertCircle size={14} />,
    cancelado:  <X size={14} />,
  }[status] ?? <AlertCircle size={14} />);

  return (
    <div className="ags-page">
      <Topbar
        title={ehProfissional ? 'Agendamentos' : 'Meus Agendamentos'}
        subtitle="Visualize e gerencie todos os agendamentos"
      />

      <div className="ags-body">
        <div className="ags-toolbar">
          <div className="ags-busca-wrap">
            <Search size={15} className="ags-busca-icon" />
            <input className="ags-busca" type="text" placeholder="Buscar por nome ou serviço..."
              value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <div className="ags-filtros">
            <Filter size={14} />
            {FILTROS.map(f => (
              <button key={f.key}
                className={`ags-filtro-btn ${filtro === f.key ? 'ags-filtro-btn--ativo' : ''}`}
                onClick={() => setFiltro(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ags-table-card">
          {loading ? (
            <div className="ags-loading">
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />)}
            </div>
          ) : agendamentosFiltrados.length === 0 ? (
            <div className="ags-vazio">
              <Calendar size={40} />
              <p>Nenhum agendamento encontrado.</p>
            </div>
          ) : (
            <table className="ags-table">
              <thead>
                <tr>
                  <th>{ehProfissional ? 'Cliente' : 'Profissional'}</th>
                  <th>Serviço</th>
                  <th>Data / Hora</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosFiltrados.map(ag => (
                  <tr key={ag.id}>
                    <td className="ags-td-nome">
                      <div className="ags-avatar">
                        {(ehProfissional ? ag.clienteNome : ag.profissionalNome || 'P')?.charAt(0)}
                      </div>
                      {ehProfissional ? ag.clienteNome : ag.profissionalNome}
                    </td>
                    <td>{ag.servico || '—'}</td>
                    <td>
                      <span className="ags-data">
                        <Clock size={12} /> {fmtData(ag.dataHora)}
                      </span>
                    </td>
                    <td className="ags-valor">
                      R$ {Number(ag.valor || ag.preco || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`ags-badge ags-badge--${ag.status}`}>
                        <IconeStatus status={ag.status} />
                        {ag.status}
                      </span>
                    </td>
                    <td>
                      <div className="ags-acoes">
                        <Link href={`/agendamentos/${ag.id}`} className="btn-icon btn-icon--view" title="Detalhes">
                          <Eye size={16} />
                        </Link>
                        {ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                          <button className="btn-icon btn-icon--delete" title="Cancelar"
                            onClick={() => cancelar(ag.id)}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="ags-contador">
          {agendamentosFiltrados.length} agendamento(s) encontrado(s)
        </p>
      </div>
    </div>
  );
}
