'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Topbar from '@/components/layout/Topbar';
import { 
  ShieldCheck, 
  FileText, 
  Check, 
  X, 
  ExternalLink,
  Clock,
  User,
  Info,
  ChevronRight
} from 'lucide-react';
import '@/styles/admin.css';

export default function AdminVerificacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarSolicitacoes() {
      try {
        // Busca usuários cujo status de verificação seja 'pendente'
        const q = query(collection(db, 'usuarios'), where('statusVerificacao', '==', 'pendente'));
        const snap = await getDocs(q);
        setSolicitacoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('[Admin] Erro ao carregar verificações:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarSolicitacoes();
  }, []);

  const handleVerificar = async (userId: string, aprovado: boolean) => {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, {
        statusVerificacao: aprovado ? 'verificado' : 'rejeitado',
        dataVerificacao: new Date().toISOString(),
        seloVerificado: aprovado
      });
      setSolicitacoes(prev => prev.filter(s => s.id !== userId));
      alert(aprovado ? 'Profissional Verificado com Sucesso!' : 'Solicitação Rejeitada.');
    } catch (err) {
      alert('Erro ao processar verificação');
    }
  };

  if (loading) return <div className="loading-admin-premium">Varrendo Arquivos de Identidade...</div>;

  return (
    <div className="admin-page-premium">
      <Topbar title="Central de Verificações" subtitle="Analise e aprove o selo de confiança para novos profissionais" />

      <div className="admin-container-premium">
        
        {solicitacoes.length === 0 ? (
          <div className="empty-state-hq">
            <ShieldCheck size={64} className="opacity-10 mb-4" />
            <h3>Tudo em ordem!</h3>
            <p>Não há solicitações de verificação pendentes no momento.</p>
          </div>
        ) : (
          <div className="verificacoes-grid-hq">
            {solicitacoes.map((s) => (
              <div key={s.id} className="verificacao-card-hq">
                <div className="v-card-header">
                  <div className="v-user-info">
                    <div className="v-avatar">
                      {s.fotoPerfil ? <img src={s.fotoPerfil} alt="" /> : <User />}
                    </div>
                    <div>
                      <h4>{s.nome}</h4>
                      <span>Registrado em: {new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="v-badge-pending">PENDENTE</div>
                </div>

                <div className="v-card-body">
                  <div className="v-info-item">
                    <label>Especialidade:</label>
                    <p>{s.categoria || 'Não informada'}</p>
                  </div>
                  <div className="v-info-item">
                    <label>Localização:</label>
                    <p>{s.cidade} - {s.estado}</p>
                  </div>
                  
                  <div className="v-docs-section">
                    <p><FileText size={16} /> Documentos Enviados</p>
                    <div className="v-docs-list">
                      <button className="btn-doc-link">RG Frontal <ExternalLink size={12} /></button>
                      <button className="btn-doc-link">RG Verso <ExternalLink size={12} /></button>
                      <button className="btn-doc-link">Comprovante <ExternalLink size={12} /></button>
                    </div>
                  </div>
                </div>

                <div className="v-card-footer">
                  <button className="btn-v-rejeitar" onClick={() => handleVerificar(s.id, false)}>
                    <X size={18} /> Rejeitar
                  </button>
                  <button className="btn-v-aprovar" onClick={() => handleVerificar(s.id, true)}>
                    <Check size={18} /> Aprovar Selo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
