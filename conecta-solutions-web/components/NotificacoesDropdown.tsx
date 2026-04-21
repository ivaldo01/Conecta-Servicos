'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Megaphone, Tag, Calendar, Ticket, ExternalLink } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  imagemUrl?: string;
  videoUrl?: string;
  cupom?: string;
  campanhaId?: string;
  lida: boolean;
  createdAt: Timestamp;
}

export default function NotificacoesDropdown() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [notifSelecionada, setNotifSelecionada] = useState<Notificacao | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  useEffect(() => {
    console.log('[NotificacoesDropdown] User state:', user?.uid ? 'Logado: ' + user.uid : 'Não logado');
    
    if (!user?.uid) {
      console.log('[NotificacoesDropdown] Aguardando autenticação...');
      return;
    }

    console.log('[NotificacoesDropdown] Iniciando listener para:', user.uid);
    
    // Query simplificada - Firestore cria índice automático para subcoleções
    const notificacoesRef = collection(db, 'usuarios', user.uid, 'notificacoes');
    const q = query(notificacoesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('[NotificacoesDropdown] Snapshot recebido:', snapshot.size, 'notificações');
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notificacao[];
        setNotificacoes(data);
      },
      (error) => {
        console.error('[NotificacoesDropdown] Erro ao buscar notificações:', error);
        console.error('[NotificacoesDropdown] Código do erro:', error.code);
        console.error('[NotificacoesDropdown] Mensagem:', error.message);
        if (error.code === 'permission-denied') {
          console.error('[NotificacoesDropdown] UID do usuário:', user?.uid);
          console.error('[NotificacoesDropdown] Coleção:', 'usuarios/' + user?.uid + '/notificacoes');
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const marcarComoLida = async (id: string) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'usuarios', user.uid, 'notificacoes', id), {
        lida: true
      });
    } catch (err) {
      console.error('Erro ao marcar notificação:', err);
    }
  };

  const abrirDetalhes = (notif: Notificacao) => {
    setNotifSelecionada(notif);
    setModalAberto(true);
    if (!notif.lida) {
      marcarComoLida(notif.id);
    }
  };

  const marcarTodasComoLidas = async () => {
    if (!user?.uid) return;
    try {
      const promises = notificacoes
        .filter(n => !n.lida)
        .map(n => updateDoc(doc(db, 'usuarios', user.uid, 'notificacoes', n.id), { lida: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error('Erro ao marcar notificações:', err);
    }
  };

  const getIconeCampanha = (titulo: string) => {
    if (titulo.toLowerCase().includes('promo') || titulo.toLowerCase().includes('desconto')) {
      return <Tag size={16} className="text-purple-400" />;
    }
    if (titulo.toLowerCase().includes('cupom')) {
      return <Ticket size={16} className="text-green-400" />;
    }
    if (titulo.toLowerCase().includes('evento') || titulo.toLowerCase().includes('dia')) {
      return <Calendar size={16} className="text-blue-400" />;
    }
    return <Megaphone size={16} className="text-pink-400" />;
  };

  return (
    <div className="notificacoes-container" ref={dropdownRef}>
      <button 
        className="notificacoes-btn"
        onClick={() => setAberto(!aberto)}
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="notificacoes-badge">{naoLidas}</span>
        )}
      </button>

      {aberto && (
        <div className="notificacoes-dropdown">
          <div className="notificacoes-header">
            <h3>Campanhas & Promoções</h3>
            {naoLidas > 0 && (
              <button className="marcar-todas" onClick={marcarTodasComoLidas}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="notificacoes-lista">
            {notificacoes.length === 0 ? (
              <div className="notificacoes-vazio">
                <Bell size={32} className="text-gray-500" />
                <p>Nenhuma campanha ativa</p>
              </div>
            ) : (
              notificacoes.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notificacao-item ${!notif.lida ? 'nao-lida' : ''}`}
                  onClick={() => abrirDetalhes(notif)}
                >
                  <div className="notificacao-icon">
                    {getIconeCampanha(notif.titulo)}
                  </div>
                  
                  <div className="notificacao-conteudo">
                    <h4>{notif.titulo}</h4>
                    <p>{notif.mensagem}</p>
                    
                    {notif.imagemUrl && (
                      <img 
                        src={notif.imagemUrl} 
                        alt="Campanha" 
                        className="notificacao-imagem"
                      />
                    )}
                    
                    {notif.videoUrl && (
                      <video 
                        src={notif.videoUrl} 
                        controls 
                        className="notificacao-video"
                      />
                    )}
                    
                    {notif.cupom && (
                      <div className="cupom-box">
                        <Ticket size={14} />
                        <code>{notif.cupom}</code>
                      </div>
                    )}
                  </div>

                  {!notif.lida && <div className="notificacao-ponto" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Notificação */}
      {modalAberto && notifSelecionada && (
        <div 
          className="modal-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalAberto(false);
          }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h3>{notifSelecionada.titulo}</h3>
              <button 
                className="modal-close" 
                onClick={() => setModalAberto(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {notifSelecionada.imagemUrl && (
                <img 
                  src={notifSelecionada.imagemUrl} 
                  alt="Campanha" 
                  className="modal-imagem"
                />
              )}
              
              {notifSelecionada.videoUrl && (
                <video 
                  src={notifSelecionada.videoUrl} 
                  controls 
                  className="modal-video"
                />
              )}
              
              <p className="modal-mensagem">{notifSelecionada.mensagem}</p>
              
              {notifSelecionada.cupom && (
                <div className="modal-cupom">
                  <Ticket size={20} />
                  <div>
                    <span className="cupom-label">Código do Cupom</span>
                    <code className="cupom-codigo">{notifSelecionada.cupom}</code>
                  </div>
                </div>
              )}
              
              {notifSelecionada.valor && (
                <div className="modal-valor">
                  <Tag size={18} />
                  <span>Desconto: {notifSelecionada.valor}%</span>
                </div>
              )}
              
              {notifSelecionada.dataFim && (
                <div className="modal-validade">
                  <Calendar size={18} />
                  <span>Válido até: {new Date(notifSelecionada.dataFim).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-fechar"
                onClick={() => setModalAberto(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .notificacoes-container {
          position: relative;
        }
        
        .notificacoes-btn {
          position: relative;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .notificacoes-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #fff;
        }
        
        .notificacoes-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .notificacoes-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 380px;
          max-height: 500px;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          z-index: 1000;
          overflow: hidden;
        }
        
        .notificacoes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .notificacoes-header h3 {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
        
        .marcar-todas {
          background: none;
          border: none;
          color: #8b5cf6;
          font-size: 11px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        .marcar-todas:hover {
          background: rgba(139, 92, 246, 0.1);
        }
        
        .notificacoes-lista {
          max-height: 400px;
          overflow-y: auto;
          padding: 8px;
        }
        
        .notificacoes-vazio {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px;
          color: #64748b;
        }
        
        .notificacao-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        .notificacao-item:hover {
          background: rgba(139, 92, 246, 0.1);
        }
        
        .notificacao-item.nao-lida {
          background: rgba(139, 92, 246, 0.05);
        }
        
        .notificacao-icon {
          width: 32px;
          height: 32px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .notificacao-conteudo {
          flex: 1;
          min-width: 0;
        }
        
        .notificacao-conteudo h4 {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }
        
        .notificacao-conteudo p {
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .notificacao-imagem {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          margin-top: 8px;
        }
        
        .notificacao-video {
          width: 100%;
          height: 120px;
          border-radius: 8px;
          margin-top: 8px;
        }
        
        .cupom-box {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 6px 10px;
          background: rgba(34, 197, 94, 0.2);
          border: 1px dashed rgba(34, 197, 94, 0.5);
          border-radius: 6px;
          color: #86efac;
        }
        
        .cupom-box code {
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 1px;
        }
        
        .notificacao-ponto {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 8px;
          height: 8px;
          background: #8b5cf6;
          border-radius: 50%;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content {
          background: #1e293b;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .modal-header h3 {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        
        .modal-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }
        
        .modal-close:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-imagem {
          width: 100%;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        
        .modal-video {
          width: 100%;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        
        .modal-mensagem {
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }
        
        .modal-cupom {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: rgba(34, 197, 94, 0.15);
          border: 2px dashed rgba(34, 197, 94, 0.5);
          border-radius: 10px;
          color: #4ade80;
          margin-bottom: 12px;
        }
        
        .cupom-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }
        
        .cupom-codigo {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 2px;
          font-family: monospace;
        }
        
        .modal-valor, .modal-validade {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #cbd5e1;
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(139, 92, 246, 0.2);
          display: flex;
          justify-content: flex-end;
        }
        
        .btn-fechar {
          background: rgba(139, 92, 246, 0.2);
          border: none;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-fechar:hover {
          background: rgba(139, 92, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
