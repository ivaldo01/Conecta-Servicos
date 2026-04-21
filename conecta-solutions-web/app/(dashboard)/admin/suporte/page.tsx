'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import {
  MessageCircle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Paperclip,
  MoreVertical,
  User,
  Briefcase,
  ChevronLeft,
  RefreshCw,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import '@/styles/admin-suporte.css';

interface Chat {
  id: string;
  nomeUsuario: string;
  perfilUsuario: 'cliente' | 'profissional';
  fotoUsuario?: string;
  ultimaMensagem: string;
  dataUltimaMensagem: any;
  naoLidasAdmin: number;
  status: 'aberto' | 'em_atendimento' | 'resolvido' | 'arquivado';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
}

interface Mensagem {
  id: string;
  texto: string;
  senderId: string;
  senderType: 'admin' | 'usuario';
  createdAt: any;
  anexo?: string;
}

export default function SuporteMasterPage() {
  const { dadosUsuario } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatSelecionado, setChatSelecionado] = useState<Chat | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const mensagensEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Carregar todos os chats de suporte
  useEffect(() => {
    const q = query(
      collection(db, 'suporte'),
      orderBy('dataUltimaMensagem', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const chatsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Chat[];
        setChats(chatsData);
        setLoading(false);
      },
      (error) => {
        console.error('[Suporte] Erro ao carregar chats:', error);
        alert('Erro de permissão ao carregar tickets de suporte. Verifique se você é admin.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Carregar mensagens do chat selecionado
  useEffect(() => {
    if (!chatSelecionado) return;

    // Resetar contador de não lidas
    updateDoc(doc(db, 'suporte', chatSelecionado.id), { naoLidasAdmin: 0 });

    const mensagensRef = collection(db, 'suporte', chatSelecionado.id, 'mensagens');
    const q = query(mensagensRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Mensagem[];
      setMensagens(msgs);
    });

    return () => unsubscribe();
  }, [chatSelecionado]);

  // Scroll automático para última mensagem
  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Função para upload de imagem no Cloudinary (mesmas credenciais do mobile)
  const uploadToCloudinary = async (file: File): Promise<string> => {
    // Credenciais do mobile (uploadService.js)
    const cloudName = 'dctnkaktn';
    const uploadPreset = 'Conecta-Solutions';
    
    console.log('[Cloudinary] Cloud Name:', cloudName);
    console.log('[Cloudinary] Upload Preset:', uploadPreset);
    console.log('[Cloudinary] Enviando arquivo:', file.name, 'Size:', file.size);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cloudinary] Status:', response.status);
      console.error('[Cloudinary] Response:', errorText);
      throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Cloudinary] Upload sucesso:', data.secure_url);
    return data.secure_url;
  };

  // Upload de arquivo para Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatSelecionado || !dadosUsuario?.uid) return;

    // Verificar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      
      // Enviar mensagem com anexo
      const mensagensRef = collection(db, 'suporte', chatSelecionado.id, 'mensagens');
      await addDoc(mensagensRef, {
        texto: '',
        anexoUrl: url,
        anexoNome: file.name,
        tipo: file.type.startsWith('image/') ? 'imagem' : 'arquivo',
        senderId: dadosUsuario.uid,
        senderNome: dadosUsuario?.nome || 'Admin',
        senderType: 'admin',
        createdAt: serverTimestamp()
      });

      // Atualizar última mensagem do chat
      await updateDoc(doc(db, 'suporte', chatSelecionado.id), {
        ultimaMensagem: `📎 Arquivo: ${file.name}`,
        ultimaMensagemAdmin: true,
        ultimaMensagemData: serverTimestamp()
      });

    } catch (err: any) {
      console.error('[Upload Error]', err);
      console.error('[Upload Error Message]', err?.message);
      console.error('[Upload Error Response]', err?.response);
      alert(`Falha ao enviar arquivo: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !chatSelecionado) return;

    const mensagensRef = collection(db, 'suporte', chatSelecionado.id, 'mensagens');
    await addDoc(mensagensRef, {
      texto: novaMensagem,
      senderId: dadosUsuario?.uid || 'admin',
      senderType: 'admin',
      createdAt: serverTimestamp()
    });

    // Atualizar última mensagem no chat
    await updateDoc(doc(db, 'suporte', chatSelecionado.id), {
      ultimaMensagem: novaMensagem,
      dataUltimaMensagem: serverTimestamp(),
      status: 'em_atendimento'
    });

    setNovaMensagem('');
  };

  const alterarStatus = async (novoStatus: string) => {
    if (!chatSelecionado) return;
    await updateDoc(doc(db, 'suporte', chatSelecionado.id), { status: novoStatus });
  };

  const chatsFiltrados = chats.filter(chat => {
    const matchBusca = chat.nomeUsuario.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || chat.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const stats = {
    total: chats.length,
    abertos: chats.filter(c => c.status === 'aberto').length,
    emAtendimento: chats.filter(c => c.status === 'em_atendimento').length,
    resolvidos: chats.filter(c => c.status === 'resolvido').length,
    urgentes: chats.filter(c => c.prioridade === 'urgente' && c.status !== 'resolvido').length
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <RefreshCw className="animate-spin" size={32} />
          <p>Carregando central de suporte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Suporte Master</h1>
          <p className="admin-subtitle">Central de atendimento - Quartel General</p>
        </div>
        <div className="stats-row">
          <div className="stat-card urgent">
            <AlertCircle size={20} />
            <span>{stats.urgentes} Urgentes</span>
          </div>
          <div className="stat-card warning">
            <Clock size={20} />
            <span>{stats.abertos} Abertos</span>
          </div>
          <div className="stat-card info">
            <MessageCircle size={20} />
            <span>{stats.emAtendimento} Em Atendimento</span>
          </div>
          <div className="stat-card success">
            <CheckCircle size={20} />
            <span>{stats.resolvidos} Resolvidos</span>
          </div>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="suporte-layout">
        {/* Sidebar - Lista de Chats */}
        <div className={`suporte-sidebar ${chatSelecionado ? 'sidebar-hidden' : ''}`}>
          {/* Filtros */}
          <div className="suporte-filtros">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="filtro-select"
            >
              <option value="todos">Todos os status</option>
              <option value="aberto">Aberto</option>
              <option value="em_atendimento">Em Atendimento</option>
              <option value="resolvido">Resolvido</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>

          {/* Lista de Chats */}
          <div className="chats-list">
            {chatsFiltrados.length === 0 ? (
              <div className="empty-state">
                <MessageCircle size={48} />
                <p>{busca ? 'Nenhum ticket encontrado para esta busca' : 'Nenhum ticket no momento'}</p>
                <small style={{ color: '#64748B', marginTop: 8, display: 'block' }}>
                  {busca ? 'Tente outro termo de busca' : 'Os tickets aparecerão aqui quando usuários iniciarem conversas'}
                </small>
              </div>
            ) : (
              chatsFiltrados.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${chatSelecionado?.id === chat.id ? 'active' : ''} ${chat.naoLidasAdmin > 0 ? 'unread' : ''}`}
                  onClick={() => setChatSelecionado(chat)}
                >
                  <div className="chat-avatar">
                    {chat.fotoUsuario ? (
                      <img src={chat.fotoUsuario} alt={chat.nomeUsuario} />
                    ) : (
                      <div className={`avatar-placeholder ${chat.perfilUsuario}`}>
                        {chat.perfilUsuario === 'profissional' ? <Briefcase size={20} /> : <User size={20} />}
                      </div>
                    )}
                    <div className={`status-dot ${chat.status}`} />
                  </div>
                  <div className="chat-info">
                    <div className="chat-header">
                      <span className="user-name">{chat.nomeUsuario}</span>
                      <span className="chat-time">
                        {chat.dataUltimaMensagem?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="last-message">{chat.ultimaMensagem}</p>
                    <div className="chat-meta">
                      <span className={`badge tipo-${chat.perfilUsuario}`}>
                        {chat.perfilUsuario === 'profissional' ? 'Profissional' : 'Cliente'}
                      </span>
                      <span className={`badge prioridade-${chat.prioridade}`}>
                        {chat.prioridade}
                      </span>
                    </div>
                  </div>
                  {chat.naoLidasAdmin > 0 && (
                    <div className="unread-badge">{chat.naoLidasAdmin}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de Chat */}
        {chatSelecionado ? (
          <div className={`chat-area ${chatSelecionado ? 'chat-open' : ''}`}>
            {/* Header do Chat */}
            <div className="chat-header-bar">
              <button className="btn-voltar" onClick={() => setChatSelecionado(null)}>
                <ChevronLeft size={24} />
              </button>
              <div className="chat-user-info">
                {chatSelecionado.fotoUsuario ? (
                  <img src={chatSelecionado.fotoUsuario} alt="" className="user-avatar" />
                ) : (
                  <div className={`avatar-placeholder ${chatSelecionado.perfilUsuario}`}>
                    {chatSelecionado.perfilUsuario === 'profissional' ? <Briefcase size={20} /> : <User size={20} />}
                  </div>
                )}
                <div>
                  <h3>{chatSelecionado.nomeUsuario}</h3>
                  <span className={`badge tipo-${chatSelecionado.perfilUsuario}`}>
                    {chatSelecionado.perfilUsuario === 'profissional' ? 'Profissional' : 'Cliente'}
                  </span>
                </div>
              </div>
              <div className="chat-actions">
                <select
                  value={chatSelecionado.status}
                  onChange={(e) => alterarStatus(e.target.value)}
                  className="status-select"
                >
                  <option value="aberto">Aberto</option>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="resolvido">Resolvido</option>
                  <option value="arquivado">Arquivado</option>
                </select>
                <button className="btn-more">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="messages-container">
              {mensagens.length === 0 ? (
                <div className="empty-chat">
                  <MessageCircle size={64} />
                  <p>Inicie a conversa com {chatSelecionado.nomeUsuario}</p>
                </div>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderType === 'admin' ? 'sent' : 'received'}`}
                  >
                    <div className="message-bubble">
                      {msg.anexoUrl && (
                        <div className="message-attachment">
                          {msg.anexoUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <a href={msg.anexoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                              <img 
                                src={msg.anexoUrl} 
                                alt="Imagem anexada" 
                                style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px', cursor: 'pointer' }} 
                              />
                            </a>
                          ) : (
                            <a href={msg.anexoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', textDecoration: 'none' }}>
                              <FileText size={16} />
                              <span>{msg.anexoNome || 'Arquivo anexado'}</span>
                            </a>
                          )}
                        </div>
                      )}
                      {msg.texto && <p>{msg.texto}</p>}
                      <span className="message-time">
                        {msg.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={mensagensEndRef} />
            </div>

            {/* Input de Mensagem */}
            <form className="message-input-bar" onSubmit={enviarMensagem}>
              {/* Input file escondido para upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              <button 
                type="button" 
                className="btn-anexo" 
                onClick={() => fileInputRef.current?.click()}
                title="Anexar arquivo"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                placeholder="Digite sua mensagem e pressione Enter..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && novaMensagem.trim()) {
                    e.preventDefault();
                    enviarMensagem(e);
                  }
                }}
                autoFocus
              />
              <button 
                type="submit" 
                className="btn-enviar" 
                disabled={!novaMensagem.trim()}
                title="Enviar mensagem"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        ) : (
          <div className="chat-empty-state">
            <MessageCircle size={80} />
            <h3>Central de Suporte Master</h3>
            <p>Selecione um ticket para iniciar o atendimento</p>
          </div>
        )}
      </div>
    </div>
  );
}
