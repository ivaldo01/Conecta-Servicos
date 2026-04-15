'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Topbar from '@/components/layout/Topbar';
import { 
  Users, 
  Search,
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
  Scissors,
  Trash2,
  Star,
  ExternalLink
} from 'lucide-react';
import '@/styles/admin.css';

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'profissional' | 'cliente'>('todos');
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [planoModal, setPlanoModal] = useState<unknown>(null);

  const handleGerarIDsEmMassa = async () => {
    const semCodigo = usuarios.filter(u => !u.codigoConecta);
    console.log('[Admin] Usuários sem código:', semCodigo.length);
    
    if (semCodigo.length === 0) return alert('Todos os usuários já possuem um ID Conecta!');

    if (!confirm(`Deseja gerar IDs oficiais para ${semCodigo.length} usuários?`)) return;

    setLoading(true);
    
    try {
      for (const u of semCodigo) {
        const novoCodigo = 'CS-' + Math.floor(10000 + Math.random() * 90000);
        const ref = doc(db, 'usuarios', u.id);
        
        try {
          await updateDoc(ref, { codigoConecta: novoCodigo });
          console.log(`[Admin] ID ${novoCodigo} gerado para ${(u as {nome?: string}).nome || u.id}`);
        } catch (updateErr) {
          console.error(`[Admin] Erro ao atualizar ${u.id}:`, updateErr);
        }
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
        // Busca simples sem orderBy para evitar erro de índice
        const snap = await getDocs(collection(db, 'usuarios'));
        const usuariosData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordena manualmente no cliente
        usuariosData.sort((a, b) => {
          const dateA = (a as {createdAt?: {toDate?: () => Date} | string | number}).createdAt?.toDate?.() || new Date((a as {createdAt?: string | number}).createdAt || 0);
          const dateB = (b as {createdAt?: {toDate?: () => Date} | string | number}).createdAt?.toDate?.() || new Date((b as {createdAt?: string | number}).createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        setUsuarios(usuariosData);
        console.log(`[Admin] ${usuariosData.length} usuários carregados`);
      } catch (err) {
        console.error('[Admin] Erro ao carregar usuários:', err);
        alert('Erro ao carregar usuários. Verifique o console.');
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

  const toggleStatus = async (user: { id: string; status?: string }) => {
    try {
      const userRef = doc(db, 'usuarios', user.id);
      await updateDoc(userRef, { status: user.status === 'ativo' ? 'suspenso' : 'ativo' });
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, status: u.status === 'ativo' ? 'suspenso' : 'ativo' } : u));
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const ativarPlanoManual = async (userId: string, planoId: string) => {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, { 
        planoAtivo: planoId,
        planoAtivadoManualmente: true,
        dataAtivacaoPlano: new Date().toISOString()
      });
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, planoAtivo: planoId } : u));
      alert(`Plano ${planoId} ativado com sucesso!`);
      setPlanoModal(null);
    } catch (err) {
      alert('Erro ao ativar plano');
    }
  };

  const verificarProfissional = async (userId: string, aprovado: boolean) => {
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, {
        statusVerificacao: aprovado ? 'verificado' : 'rejeitado',
        seloVerificado: aprovado,
        dataVerificacao: new Date().toISOString()
      });
      setUsuarios(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        statusVerificacao: aprovado ? 'verificado' : 'rejeitado',
        seloVerificado: aprovado 
      } : u));
      alert(aprovado ? 'Profissional verificado!' : 'Verificação rejeitada');
    } catch (err) {
      alert('Erro ao processar verificação');
    }
  };

  const excluirUsuario = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita!')) return;
    try {
      const userRef = doc(db, 'usuarios', userId);
      await updateDoc(userRef, { 
        ativo: false,
        excluidoEm: new Date().toISOString(),
        status: 'excluido'
      });
      setUsuarios(prev => prev.filter(u => u.id !== userId));
      alert('Usuário marcado como excluído');
    } catch (err) {
      alert('Erro ao excluir usuário');
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
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <div className="empty-state-hq">
                      <Users size={48} className="mb-4 opacity-50" />
                      <p>Nenhum usuário encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
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
                    <div className="actions-cell-hq" style={{ position: 'relative' }}>
                      <button className="btn-action-hq" title="Editar Perfil"><Shield size={16} /></button>
                      <button 
                        className={`btn-action-hq ${u.status === 'suspenso' ? 'btn-activate' : 'btn-suspend'}`} 
                        onClick={() => toggleStatus(u)}
                        title={u.status === 'suspenso' ? 'Ativar Conta' : 'Suspender Conta'}
                      >
                        {u.status === 'suspenso' ? <UserCheck size={16} /> : <UserX size={16} />}
                      </button>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button 
                          className="btn-action-hq" 
                          onClick={() => setMenuAberto(menuAberto === u.id ? null : u.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuAberto === u.id && (
                          <div style={{
                            position: 'fixed',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '8px 0',
                            minWidth: '200px',
                            zIndex: 9999,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            right: '80px',
                            top: '50%',
                            transform: 'translateY(-50%)'
                          }}>
                            <div style={{ padding: '8px 16px', borderBottom: '1px solid #334155', fontSize: '12px', color: '#94a3b8' }}>
                              Ações Admin
                            </div>
                            <button 
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
                              onClick={() => { setPlanoModal(u); setMenuAberto(null); }}
                            >
                              <Crown size={14} /> Ativar/Alterar Plano VIP
                            </button>
                            {u.perfil === 'profissional' && (
                              <>
                                <button 
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '13px' }}
                                  onClick={() => { verificarProfissional(u.id, true); setMenuAberto(null); }}
                                >
                                  <Star size={14} /> Aprovar Verificação
                                </button>
                                <button 
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                                  onClick={() => { verificarProfissional(u.id, false); setMenuAberto(null); }}
                                >
                                  <XCircle size={14} /> Rejeitar Verificação
                                </button>
                              </>
                            )}
                            <button 
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '13px' }}
                              onClick={() => window.open(`/perfil-profissional/${u.id}`, '_blank')}
                            >
                              <ExternalLink size={14} /> Ver Perfil Público
                            </button>
                            <div style={{ borderTop: '1px solid #334155', margin: '8px 0' }}></div>
                            <button 
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                              onClick={() => { excluirUsuario(u.id); setMenuAberto(null); }}
                            >
                              <Trash2 size={14} /> Excluir Usuário
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL DE SELEÇÃO DE PLANO */}
      {planoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid #334155'
          }}>
            <h3 style={{ marginBottom: '8px', color: '#fff' }}>Ativar Plano VIP</h3>
            <p style={{ marginBottom: '4px', color: '#94a3b8', fontSize: '14px' }}>
              Usuário: <strong>{planoModal.nome}</strong> ({planoModal.perfil})
            </p>
            <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#22c55e20', border: '1px solid #22c55e', borderRadius: '6px' }}>
              <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 'bold' }}>🎉 PROMOÇÃO: 50% OFF nos primeiros 3 meses!</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {planoModal.perfil === 'profissional' ? (
                <>
                  <button 
                    style={{ padding: '12px', background: '#334155', border: '1px solid #475569', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => ativarPlanoManual(planoModal.id, 'pro_iniciante')}
                  >
                    <strong>Grátis (Iniciante)</strong> - Sem selo verificado
                  </button>
                  <button 
                    style={{ padding: '12px', background: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => ativarPlanoManual(planoModal.id, 'pro_profissional')}
                  >
                    <strong style={{ textDecoration: 'line-through', opacity: 0.7 }}>R$ 49,90</strong> <strong>R$ 24,95</strong> <span style={{ fontSize: '11px', background: '#22c55e', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>50% OFF</span><br/>
                    <small>Profissional - Selo verificado + 3 funcionários</small>
                  </button>
                  <button 
                    style={{ padding: '12px', background: '#8b5cf6', border: '1px solid #8b5cf6', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => ativarPlanoManual(planoModal.id, 'pro_empresa')}
                  >
                    <strong style={{ textDecoration: 'line-through', opacity: 0.7 }}>R$ 79,90</strong> <strong>R$ 39,95</strong> <span style={{ fontSize: '11px', background: '#22c55e', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>50% OFF</span><br/>
                    <small>Empresa - Selo verificado + 10 funcionários</small>
                  </button>
                  <button 
                    style={{ padding: '12px', background: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => ativarPlanoManual(planoModal.id, 'pro_franquia')}
                  >
                    <strong style={{ textDecoration: 'line-through', opacity: 0.7 }}>R$ 199,90</strong> <strong>R$ 99,95</strong> <span style={{ fontSize: '11px', background: '#22c55e', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>50% OFF</span><br/>
                    <small>Franquia - Selo verificado + Funcionários ilimitados</small>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    style={{ padding: '12px', background: '#334155', border: '1px solid #475569', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => ativarPlanoManual(planoModal.id, 'client_free')}
                  >
                    <strong>Grátis (Standard)</strong> - Sem selo VIP
                  </button>
                  <button 
                    style={{ padding: '12px', background: '#ec4899', border: '1px solid #ec4899', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => ativarPlanoManual(planoModal.id, 'client_premium')}
                  >
                    <strong style={{ textDecoration: 'line-through', opacity: 0.7 }}>R$ 14,90</strong> <strong>R$ 7,45</strong> <span style={{ fontSize: '11px', background: '#22c55e', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>50% OFF</span><br/>
                    <small>VIP Cliente - Selo Cliente VIP + Benefícios</small>
                  </button>
                </>
              )}
            </div>
            
            <button 
              style={{ width: '100%', padding: '12px', background: '#475569', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
              onClick={() => setPlanoModal(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
