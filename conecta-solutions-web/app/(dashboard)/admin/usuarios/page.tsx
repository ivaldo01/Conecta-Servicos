'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, updateDoc, doc, where, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Topbar from '@/components/layout/Topbar';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  UserX, 
  UserCheck, 
  Shield, 
  Mail,
  Smartphone,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  Loader2,
  Scissors
} from 'lucide-react';
import '@/styles/admin.css';

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'profissional' | 'cliente'>('todos');

  const handleGerarIDsEmMassa = async () => {
    const semCodigo = usuarios.filter(u => !u.codigoConecta);
    if (semCodigo.length === 0) return alert('Todos os usuários já possuem um ID Conecta!');

    if (!confirm(`Deseja gerar IDs oficiais para ${semCodigo.length} usuários?`)) return;

    setLoading(true);
    try {
      const counterRef = doc(db, 'config', 'contadores');
      
      for (const user of semCodigo) {
        await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterRef);
          let currentCount = 1;
          
          if (counterDoc.exists()) {
            currentCount = (counterDoc.data().usuarios || 0) + 1;
          }

          const novoCodigo = `CS-BR-${String(currentCount).padStart(6, '0')}`;
          
          transaction.set(counterRef, { usuarios: currentCount }, { merge: true });
          transaction.update(doc(db, 'usuarios', user.id), {
            codigoConecta: novoCodigo
          });
        });
      }
      
      alert('IDs operacionais gerados com sucesso!');
      window.location.reload(); 
    } catch (err) {
      console.error('[Admin] Erro ao gerar IDs:', err);
      alert('Erro na transação de massa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function carregarUsuarios() {
      try {
        const q = query(collection(db, 'usuarios'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('[Admin] Erro ao carregar usuários:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarUsuarios();
  }, []);

  const usuariosFiltrados = usuarios.filter(u => {
    const batemBusca = (u.nome || '').toLowerCase().includes(busca.toLowerCase()) || 
                      (u.email || '').toLowerCase().includes(busca.toLowerCase());
    const batemFiltro = filtro === 'todos' || u.perfil === filtro;
    return batemBusca && batemFiltro;
  });

  const toggleStatus = async (user: any) => {
    try {
      const userRef = doc(db, 'usuarios', user.id);
      await updateDoc(userRef, { status: user.status === 'ativo' ? 'suspenso' : 'ativo' });
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: u.status === 'ativo' ? 'suspenso' : 'ativo' } : u));
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  if (loading) return <div className="loading-admin-premium">Escaneando Base de Dados...</div>;

  return (
    <div className="admin-page-premium">
      <Topbar title="Gestão de Usuários" subtitle="Controle total sobre Clientes e Profissionais da plataforma" />

      <div className="admin-container-premium">
        
        {/* BARRA DE FILTROS E BUSCA */}
        <div className="admin-filter-bar-hq">
          <div className="search-box-hq">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="admin-actions-group-hq">
            <div className="filter-tabs-hq">
              <button onClick={() => setFiltro('todos')} className={filtro === 'todos' ? 'active' : ''}>Todos</button>
              <button onClick={() => setFiltro('profissional')} className={filtro === 'profissional' ? 'active' : ''}>Profissionais</button>
              <button onClick={() => setFiltro('cliente')} className={filtro === 'cliente' ? 'active' : ''}>Clientes</button>
            </div>

            <button 
              className="btn-mass-generate-hq" 
              onClick={handleGerarIDsEmMassa}
              disabled={loading}
              title="Gerar IDs Conecta para todos que não possuem"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Gerar IDs Oficiais
            </button>
          </div>
        </div>

        {/* TABELA DE USUÁRIOS PREMIUM */}
        <div className="admin-table-wrapper-hq">
          <table className="admin-table-hq">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil / Plano</th>
                <th>Contato</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className={u.status === 'suspenso' ? 'row-disabled' : ''}>
                  <td>
                    <div className="user-info-cell-hq">
                      <div className="user-avatar-hq">
                        {u.fotoPerfil ? <img src={u.fotoPerfil} alt="" /> : <span>{u.nome?.[0] || 'U'}</span>}
                      </div>
                      <div className="user-text-hq">
                        <strong>{u.nome || 'N/A'}</strong>
                        <span className="id-badge-hq">
                          {u.codigoConecta || `ID: #${u.id.slice(0, 8).toUpperCase()}`}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="role-plan-hq">
                      <span className={`badge-role-hq ${u.perfil}`}>
                        {u.perfil === 'profissional' ? <Scissors size={12} /> : <Users size={12} />}
                        {u.perfil?.toUpperCase()}
                      </span>
                      {u.planoAtivo && (
                        <div className="plan-tag-hq">
                          <Crown size={12} /> {u.planoAtivo.split('_')[1]?.toUpperCase() || 'VIP'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell-hq">
                      <div className="contact-item"><Mail size={12} /> {u.email || '-'}</div>
                      <div className="contact-item"><Smartphone size={12} /> {u.whatsapp || u.telefone || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge-status-hq ${u.status || 'ativo'}`}>
                      {u.status === 'suspenso' ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      {(u.status || 'ativo').toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="actions-cell-hq">
                      <button className="btn-action-hq" title="Editar Perfil"><Shield size={16} /></button>
                      <button 
                        className={`btn-action-hq ${u.status === 'suspenso' ? 'btn-activate' : 'btn-suspend'}`} 
                        onClick={() => toggleStatus(u)}
                        title={u.status === 'suspenso' ? 'Ativar Conta' : 'Suspender Conta'}
                      >
                        {u.status === 'suspenso' ? <UserCheck size={16} /> : <UserX size={16} />}
                      </button>
                      <button className="btn-action-hq"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
