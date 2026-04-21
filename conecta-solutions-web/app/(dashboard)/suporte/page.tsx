'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  collection, query, addDoc,
  orderBy, serverTimestamp, onSnapshot, doc, setDoc, updateDoc, increment, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { 
  Send, MessageCircle, Paperclip, Image, FileText, X, Download, 
  Megaphone, Ticket, User, Check, CheckCheck, Clock, Calendar, 
  AlertCircle, ChevronLeft, MoreVertical, Search, Filter, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/suporte-premium.css';
import NextImage from 'next/image';

// Função para upload de imagem no Cloudinary (web)
const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'conecta-solutions';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'conecta_uploads';
  
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
    throw new Error('Falha no upload da imagem');
  }
  
  const data = await response.json();
  return data.secure_url;
};

// ============================================================
// TIPOS
// ============================================================
interface TicketInfo {
  nomeUsuario?: string;
  perfilUsuario?: string;
  status?: 'aberto' | 'em_atendimento' | 'resolvido';
  [key: string]: unknown;
}

interface Mensagem {
  id: string;
  texto?: string;
  senderId?: string;
  createdAt?: Timestamp | Date | string;
  tipo?: 'texto' | 'sistema' | 'imagem' | 'arquivo' | 'campanha';
  anexoUrl?: string;
  anexoNome?: string;
  lida?: boolean;
  // Campos de campanha
  titulo?: string;
  mensagem?: string;
  imagemUrl?: string;
  videoUrl?: string;
  cupom?: string;
  valor?: number;
  dataFim?: Timestamp | Date | string;
}

// ============================================================
// SUPORTE — Chat com Suporte a Anexos (Imagens e PDFs)
// ============================================================
export default function SuportePage() {
  const { dadosUsuario, ehProfissional } = useAuth();
  const [mensagens, setMensagens]         = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem]   = useState('');
  const [loading, setLoading]             = useState(true);
  const [enviando, setEnviando]           = useState(false);
  const [uploading, setUploading]         = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Estados para preview e anexos
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [digitando, setDigitando] = useState(false);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);

  // UID do usuário logado
  const uid = dadosUsuario?.uid;

  // Escuta mensagens
  useEffect(() => {
    if (!uid) return;
    
    setLoading(true);
    const mensagensRef = collection(db, 'suporte', uid, 'mensagens');
    const q = query(mensagensRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Mensagem));
      
      // Contar mensagens não lidas (recebidas do admin)
      const naoLidas = lista.filter(m => m.senderId !== uid && !m.lida).length;
      setMensagensNaoLidas(naoLidas);
      
      // Notificação se houver mensagens novas
      if (lista.length > mensagens.length && mensagens.length > 0) {
        const ultimaMsg = lista[lista.length - 1];
        if (ultimaMsg.senderId !== uid) {
          toast.success('Nova mensagem do suporte!', { icon: '📬' });
          // Tocar som se permitido
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }
      }
      
      setMensagens(lista);
      setLoading(false);
      
      // Marcar como lidas
      lista.forEach(async (m) => {
        if (m.senderId !== uid && !m.lida) {
          await updateDoc(doc(db, 'suporte', uid, 'mensagens', m.id), { lida: true });
        }
      });
      
      // Zerar contador no documento pai
      updateDoc(doc(db, 'suporte', uid), { naoLidasUsuario: 0 }).catch(() => {});
      
      // Carregar info do ticket
      getDoc(doc(db, 'suporte', uid)).then((ticketSnap) => {
        if (ticketSnap.exists()) {
          setTicketInfo(ticketSnap.data());
        }
      }).catch(() => {});
    }, (err) => {
      console.error('[Erro Suporte]', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, mensagens.length]);

  // Rola para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [novaMensagem]);

  // Simular indicador de "digitando" quando o admin responde
  useEffect(() => {
    const ultimaMsg = mensagens[mensagens.length - 1];
    if (ultimaMsg && ultimaMsg.senderId === uid) {
      setDigitando(true);
      const timer = setTimeout(() => setDigitando(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensagens, uid]);

  // Função centralizada para enviar mensagem (com ou sem anexo)
  const enviar = async (dadosAnexo?: { url: string; tipo: 'imagem' | 'arquivo'; nome: string }) => {
    if ((!novaMensagem.trim() && !dadosAnexo) || !uid || !dadosUsuario) return;
    
    const textoParaEnviar = novaMensagem.trim();
    if (!dadosAnexo) setNovaMensagem(''); 
    setEnviando(true);

    try {
      const ticketRef = doc(db, 'suporte', uid);
      const logMsg = dadosAnexo ? `📎 Enviou um ${dadosAnexo.tipo === 'imagem' ? 'imagem' : 'documento'}` : textoParaEnviar;

      // 1. Atualiza o documento pai (o ticket de suporte)
      await setDoc(ticketRef, {
        id: uid,
        usuarioId: uid,
        nomeUsuario: dadosUsuario.nome || 'Usuário Web',
        ultimaMensagem: logMsg,
        dataUltimaMensagem: serverTimestamp(),
        status: 'aberto',
        naoLidasAdmin: increment(1),
        perfilUsuario: ehProfissional ? 'profissional' : 'cliente',
        fotoUsuario: dadosUsuario.fotoUrl || '',
        lastActivity: Date.now()
      }, { merge: true });

      // 2. Adiciona a mensagem na subcoleção 'mensagens'
      await addDoc(collection(db, 'suporte', uid, 'mensagens'), {
        texto: textoParaEnviar || '',
        senderId: uid,
        remetenteId: uid,
        remetenteNome: dadosUsuario.nome || dadosUsuario.email || 'Usuário',
        senderNome: dadosUsuario.nome || dadosUsuario.email || 'Usuário',
        senderType: ehProfissional ? 'profissional' : 'cliente',
        createdAt: serverTimestamp(),
        channelId: 'suporte-admin',
        tipo: dadosAnexo ? dadosAnexo.tipo : 'texto',
        anexoUrl: dadosAnexo?.url || null,
        anexoNome: dadosAnexo?.nome || null
      });

    } catch (err) {
      console.error('[Erro Envio]', err);
      toast.error('Não foi possível enviar a mensagem.');
      if (!dadosAnexo) setNovaMensagem(textoParaEnviar);
    } finally {
      setEnviando(false);
    }
  };

  // Upload de arquivo via Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    // Verificar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    // Verificar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou PDF.');
      return;
    }

    setUploading(true);
    try {
      // Upload para Cloudinary
      const url = await uploadToCloudinary(file);

      await enviar({
        url,
        nome: file.name,
        tipo: file.type.startsWith('image/') ? 'imagem' : 'arquivo'
      });

      toast.success('Arquivo enviado!');
    } catch (err) {
      console.error('[Upload Error]', err);
      toast.error('Falha no upload do arquivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isTimestamp = (value: unknown): value is Timestamp => {
    return value instanceof Timestamp;
  };

  const formataHora = (ts: Timestamp | string | number | Date | null | undefined) => {
    if (!ts) return '';
    let d: Date;
    if (isTimestamp(ts)) {
      d = ts.toDate();
    } else if (ts instanceof Date) {
      d = ts;
    } else {
      d = new Date(ts as string | number);
    }
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formataData = (ts: Timestamp | string | number | Date | null | undefined) => {
    if (!ts) return '';
    let d: Date;
    if (isTimestamp(ts)) {
      d = ts.toDate();
    } else if (ts instanceof Date) {
      d = ts;
    } else {
      d = new Date(ts as string | number);
    }
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  };

  const isMesmoDia = (ts1: Timestamp | string | number | Date | null | undefined, ts2: Timestamp | string | number | Date | null | undefined) => {
    if (!ts1 || !ts2) return false;
    const converterParaDate = (ts: Timestamp | string | number | Date): Date => {
      if (isTimestamp(ts)) {
        return ts.toDate();
      } else if (ts instanceof Date) {
        return ts;
      } else {
        return new Date(ts as string | number);
      }
    };
    const d1 = converterParaDate(ts1);
    const d2 = converterParaDate(ts2);
    return d1.toDateString() === d2.toDateString();
  };

  // Estatísticas simplificadas para o profissional
  const stats = {
    total: mensagens.length,
    naoLidas: mensagensNaoLidas,
    respondidas: mensagens.filter(m => m.senderId === uid).length,
    anexos: mensagens.filter(m => m.tipo === 'imagem' || m.tipo === 'arquivo').length
  };

  return (
    <div className="suporte-page-premium">
      <Topbar title="Suporte Técnico" subtitle="Atendimento prioritário Conecta" />

      {/* Header com Estatísticas */}
      <div className="suporte-header-stats-premium">
        <div className="stats-row-premium">
          <div className="stat-card-premium warning">
            <Clock size={18} />
            <span>{stats.naoLidas} Não Lidas</span>
          </div>
          <div className="stat-card-premium info">
            <MessageCircle size={18} />
            <span>{stats.total} Mensagens</span>
          </div>
          <div className="stat-card-premium success">
            <CheckCircle size={18} />
            <span>{stats.respondidas} Respondidas</span>
          </div>
          <div className="stat-card-premium primary">
            <Paperclip size={18} />
            <span>{stats.anexos} Anexos</span>
          </div>
        </div>
      </div>

      <div className="suporte-body-premium">
        <div className="suporte-chat-premium suporte-chat--unificado-premium">
          
          <div className="suporte-chat-header-premium">
            <div className="suporte-chat-header-info-premium">
              <MessageCircle size={20} className="color-primary" />
              <div>
                <h3>Chat de Atendimento</h3>
                <p>{ticketInfo?.nomeUsuario || 'Equipe Conecta'} • {ticketInfo?.perfilUsuario === 'profissional' ? 'Profissional' : 'Cliente'}</p>
              </div>
            </div>
            <div className="suporte-header-actions-premium">
              <span className={`status-badge-premium ${ticketInfo?.status || 'aberto'}`}>
                {ticketInfo?.status === 'resolvido' ? 'Resolvido' : 
                 ticketInfo?.status === 'em_atendimento' ? 'Em Atendimento' : 'Aberto'}
              </span>
            </div>
          </div>

          <div className="suporte-chat-messages-premium">
            {loading ? (
              <div className="suporte-msg-loading-premium">
                <div className="loading-spinner-premium"></div>
                <span>Sincronizando conversa...</span>
              </div>
            ) : mensagens.length === 0 ? (
              <div className="suporte-chat-vazio-premium">
                <div className="vazio-icon-premium">
                  <MessageCircle size={48} />
                </div>
                <h3>Bem-vindo ao Suporte Conecta</h3>
                <p>Como podemos ajudar você hoje?</p>
                <span className="vazio-dica-premium">💡 Dica: Você pode anexar imagens e documentos</span>
              </div>
            ) : (
              <>
                {mensagens.map((m, index) => {
                  const isMe = m.senderId === uid;
                  const msgAnterior = index > 0 ? mensagens[index - 1] : null;
                  const mostrarData = !msgAnterior || !isMesmoDia(m.createdAt, msgAnterior.createdAt);
                  
                  return (
                    <React.Fragment key={m.id}>
                      {mostrarData && (
                        <div className="suporte-data-separator-premium">
                          <Calendar size={12} />
                          <span>{formataData(m.createdAt)}</span>
                        </div>
                      )}
                      <div className={`suporte-msg ${isMe ? 'suporte-msg--minha' : 'suporte-msg--deles'}`}>
                        {/* Avatar */}
                        <div className="suporte-msg-avatar">
                          {isMe ? (
                            dadosUsuario?.fotoUrl ? (
                              <NextImage src={dadosUsuario.fotoUrl} alt="Eu" width={32} height={32} className="rounded-full" />
                            ) : (
                              <User size={20} />
                            )
                          ) : (
                            <div className="avatar-suporte">
                              <MessageCircle size={18} />
                            </div>
                          )}
                        </div>
                        
                        {/* Conteúdo */}
                        <div className="suporte-msg-content">
                          <div className="suporte-msg-header">
                            <span className="msg-nome">
                              {isMe ? 'Você' : 'Equipe Conecta'}
                            </span>
                          </div>
                          
                          <div className="suporte-msg-bubble">
                            {/* Renderização de Imagem */}
                            {m.tipo === 'imagem' && m.anexoUrl && (
                              <div className="suporte-msg-image">
                                <NextImage src={m.anexoUrl!} alt="Anexo" width={200} height={150} className="cursor-pointer object-cover rounded" onClick={() => window.open(m.anexoUrl, '_blank')} />
                              </div>
                            )}
                            
                            <p className="msg-texto">{m.texto}</p>
                          </div>
                          
                          <div className="suporte-msg-footer">
                            <span className="suporte-msg-hora">{formataHora(m.createdAt)}</span>
                            {isMe && (
                              <span className={`suporte-msg-status ${m.lida ? 'lida' : ''}`}>
                                {m.lida ? <CheckCheck size={14} /> : <Check size={14} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                
                {/* Indicador de digitando */}
                {digitando && (
                  <div className="suporte-msg-premium suporte-msg--deles-premium digitando-indicator-premium">
                    <div className="suporte-msg-avatar-premium avatar-suporte-premium">
                      <MessageCircle size={18} />
                    </div>
                    <div className="suporte-msg-content-premium">
                      <div className="suporte-msg-bubble-premium digitando-bubble-premium">
                        <div className="digitando-dots-premium">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preview de imagem antes de enviar */}
          {previewImagem && (
            <div className="suporte-preview-container-premium">
              <div className="preview-wrapper-premium">
                <NextImage src={previewImagem} alt="Preview" width={120} height={120} className="object-cover rounded" />
                <button 
                  className="btn-remover-preview"
                  onClick={() => {
                    setPreviewImagem(null);
                    setArquivoSelecionado(null);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="suporte-chat-input-area">
            {uploading && (
              <div className="suporte-upload-pulse">
                <div className="upload-spinner"></div>
                <span>Enviando anexo...</span>
              </div>
            )}
            
            <div className="suporte-chat-input">
              {/* Botão de Anexo */}
              <button 
                className="suporte-attach-btn" 
                onClick={() => fileInputRef.current?.click()}
                disabled={enviando || uploading || !uid}
                title="Anexar arquivo"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Preview para imagens
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPreviewImagem(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                    setArquivoSelecionado(file);
                    handleFileChange(e);
                  }
                }}
                className="hidden" 
                accept="image/*,application/pdf"
              />

              {/* Textarea com auto-resize */}
              <textarea 
                ref={textareaRef}
                className="suporte-input" 
                placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (novaMensagem.trim() || previewImagem) {
                      enviar();
                      setPreviewImagem(null);
                      setArquivoSelecionado(null);
                    }
                  }
                }}
                disabled={enviando || uploading || !uid}
                rows={1}
                maxLength={1000}
              />
              
              {/* Contador de caracteres */}
              <span className="char-counter-input">{novaMensagem.length}/1000</span>
              
              <button 
                className="suporte-send-btn" 
                onClick={() => {
                  enviar();
                  setPreviewImagem(null);
                  setArquivoSelecionado(null);
                }}
                disabled={enviando || uploading || (!novaMensagem.trim() && !previewImagem) || !uid}
                title="Enviar mensagem"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
