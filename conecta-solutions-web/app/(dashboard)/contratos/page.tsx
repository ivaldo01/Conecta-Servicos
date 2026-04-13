'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { FileText, Calendar, RefreshCcw, X, CheckCircle, AlertCircle } from 'lucide-react';
import '@/styles/perfil-contratos-rel.css';

// ============================================================
// TIPOS
// ============================================================
interface Contrato {
  id: string;
  profissionalId?: string;
  profissionalNome?: string;
  clienteId?: string;
  clienteNome?: string;
  planoNome?: string;
  preco?: any;
  periodicidade?: string;
  status?: string;
  dataInicio?: any;
  proximaCobranca?: any;
  servicos?: string[];
}

// ============================================================
// PÁGINA DE CONTRATOS (MEUS CONTRATOS - CLIENTE)
// ============================================================
export default function ContratosPage() {
  const { dadosUsuario, ehProfissional } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading]     = useState(true);

  const carregarContratos = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      // Busca na coleção correta (contratosRecorrentes conforme regras e mobile)
      const campo = ehProfissional ? 'profissionalId' : 'clienteId';
      const q = query(
        collection(db, 'contratosRecorrentes'),
        where(campo, '==', dadosUsuario.uid)
      );
      const snap = await getDocs(q);
      setContratos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contrato)));
    } catch (err) {
      console.error('[Contratos]', err);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario, ehProfissional]);

  useEffect(() => { carregarContratos(); }, [carregarContratos]);

  // Formatação de Data
  const formatarData = (v: any): string => {
    if (!v) return '—';
    try {
      const d = v.toDate ? v.toDate() : new Date(v);
      return d.toLocaleDateString('pt-BR');
    } catch { return '—'; }
  };

  // Status Badge
  const getStatusBadge = (status = 'ativo') => {
    const s = status.toLowerCase();
    const mapa: any = {
      ativo:     { cls: 'ct-badge--ativo',     icon: <CheckCircle size={12} />, label: 'Ativo' },
      pausado:   { cls: 'ct-badge--pausado',   icon: <AlertCircle size={12} />, label: 'Pausado' },
      cancelado: { cls: 'ct-badge--cancelado', icon: <X size={12} />,           label: 'Cancelado' },
    };
    return mapa[s] || mapa['pausado'];
  };

  const ativos = contratos.filter(c => c.status === 'ativo');
  const outros = contratos.filter(c => c.status !== 'ativo');

  return (
    <div className="ct-page">
      <Topbar
        title="Meus Contratos"
        subtitle={ehProfissional ? 'Gerencie as assinaturas dos seus clientes' : 'Acompanhe seus planos e assinaturas ativas'}
      />

      <div className="ct-body">
        {/* RESUMO RÁPIDO */}
        <div className="ct-resumo">
          <div className="ct-resumo-card ct-resumo-card--verde">
            <p className="ct-resumo-num">{ativos.length}</p>
            <p className="ct-resumo-label">Assinaturas Ativas</p>
          </div>
          <div className="ct-resumo-card ct-resumo-card--azul">
            <p className="ct-resumo-num">
              R$ {ativos.reduce((acc, c) => acc + (Number(c.preco) || 0), 0).toFixed(2)}
            </p>
            <p className="ct-resumo-label">Total Recorrente</p>
          </div>
        </div>

        {loading ? (
          <div className="ct-lista">
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 20 }} />)}
          </div>
        ) : contratos.length === 0 ? (
          <div className="ct-vazio">
            <FileText size={48} strokeWidth={1.5} />
            <p>Você ainda não possui contratos registrados.</p>
          </div>
        ) : (
          <>
            {/* ATIVOS */}
            {ativos.length > 0 && (
              <div className="ct-secao">
                <h2 className="ct-secao-titulo">
                  <CheckCircle size={18} className="ct-secao-icon--verde" /> Contratos Atuais
                </h2>
                <div className="ct-lista">
                  {ativos.map(c => (
                    <CardContrato 
                      key={c.id} 
                      c={c} 
                      ehProfissional={ehProfissional} 
                      formatarData={formatarData} 
                      badge={getStatusBadge(c.status)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* HISTÓRICO / OUTROS */}
            {outros.length > 0 && (
              <div className="ct-secao">
                <h2 className="ct-secao-titulo">
                  <RefreshCcw size={18} /> Outras Assinaturas
                </h2>
                <div className="ct-lista">
                  {outros.map(c => (
                    <CardContrato 
                      key={c.id} 
                      c={c} 
                      ehProfissional={ehProfissional} 
                      formatarData={formatarData} 
                      badge={getStatusBadge(c.status)} 
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: CARD DO CONTRATO
// ============================================================
function CardContrato({ c, ehProfissional, formatarData, badge }: any) {
  return (
    <div className="ct-card">
      <div className="ct-card-topo">
        <h3 className="ct-card-titulo">{c.planoNome || 'Plano de Serviço'}</h3>
        <span className={`ct-badge ${badge.cls}`}>
          {badge.icon} {badge.label}
        </span>
      </div>
      
      <p className="ct-card-parte">
        {ehProfissional ? `Cliente: ${c.clienteNome}` : `Pro: ${c.profissionalNome}`}
      </p>

      {c.servicos && c.servicos.length > 0 && (
        <p className="ct-card-servicos">
          {c.servicos.join(' • ')}
        </p>
      )}

      <div className="ct-card-rodape">
        <div className="ct-card-info">
          <Calendar size={13} /> Início: {formatarData(c.dataInicio)}
        </div>
        {c.status === 'ativo' && (
          <div className="ct-card-info">
            <RefreshCcw size={13} /> Próxima cobrança: {formatarData(c.proximaCobranca)}
          </div>
        )}
        <div className="ct-card-preco">
          R$ {Number(c.preco).toFixed(2)}
          <small>/{c.periodicidade || 'mês'}</small>
        </div>
      </div>
    </div>
  );
}
