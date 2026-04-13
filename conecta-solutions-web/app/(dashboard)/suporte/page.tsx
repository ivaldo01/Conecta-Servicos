'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  collection, query, addDoc,
  orderBy, serverTimestamp, onSnapshot, doc, setDoc, updateDoc, increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Send, MessageCircle, Paperclip, Image, FileText, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/suporte.css';

// ============================================================
// TIPOS
// ============================================================
interface Mensagem {
  id: string;
  texto?: string;
  senderId?: string;
  createdAt?: any;
  tipo?: 'texto' | 'sistema' | 'imagem' | 'arquivo';
  anexoUrl?: string;
  anexoNome?: string;
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
      setMensagens(lista);
      setLoading(false);
      
      // Quando o usuário abre, zeramos as não lidas dele (naoLidasUsuario)
      updateDoc(doc(db, 'suporte', uid), { naoLidasUsuario: 0 }).catch(() => {});
    }, (err) => {
      console.error('[Erro Suporte]', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // Rola para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens]);

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
        remetenteNome: dadosUsuario.nome,
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

  // Upload de arquivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    // Validações básicas
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      toast.error('Somente imagens ou PDFs são permitidos.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      const storagePath = `suporte/${uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await enviar({
        url,
        tipo: isImage ? 'imagem' : 'arquivo',
        nome: file.name
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

  const formataHora = (ts: any) => {
    if (!ts) return '';
    const d = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="suporte-page">
      <Topbar title="Suporte Técnico" subtitle="Atendimento prioritário Conecta" />

      <div className="suporte-body">
        <div className="suporte-chat suporte-chat--unificado">
          
          <div className="suporte-chat-header">
            <div className="suporte-chat-header-info">
              <MessageCircle size={20} className="color-primary" />
              <div>
                <h3>Chat de Atendimento</h3>
                <p>Equipe Técnica Online</p>
              </div>
            </div>
            <span className="suporte-status-badge">Pronto para ajudar</span>
          </div>

          <div className="suporte-chat-messages">
            {loading ? (
              <div className="suporte-msg-loading">Sincronizando conversa...</div>
            ) : mensagens.length === 0 ? (
              <div className="suporte-chat-vazio">
                <MessageCircle size={40} />
                <p>Nenhuma mensagem ainda.<br />Como podemos ajudar você hoje?</p>
              </div>
            ) : (
              mensagens.map((m) => {
                const isMe = m.senderId === uid;
                return (
                  <div key={m.id} className={`suporte-msg ${isMe ? 'suporte-msg--minha' : 'suporte-msg--deles'}`}>
                    <div className="suporte-msg-bubble">
                      
                      {/* Renderização de Imagem */}
                      {m.tipo === 'imagem' && m.anexoUrl && (
                        <div className="suporte-msg-image">
                          <img src={m.anexoUrl} alt="Anexo" onClick={() => window.open(m.anexoUrl, '_blank')} />
                        </div>
                      )}

                      {/* Renderização de Arquivo/PDF */}
                      {m.tipo === 'arquivo' && m.anexoUrl && (
                        <div className="suporte-msg-file" onClick={() => window.open(m.anexoUrl, '_blank')}>
                          <FileText size={24} />
                          <div className="file-info">
                            <span className="file-name">{m.anexoNome || 'Documento PDF'}</span>
                            <span className="file-hint">Clique para baixar</span>
                          </div>
                          <Download size={16} className="file-download-icon" />
                        </div>
                      )}

                      {/* Texto (se existir junto com o anexo ou sozinho) */}
                      {m.texto && <p>{m.texto}</p>}
                    </div>
                    <span className="suporte-msg-hora">{formataHora(m.createdAt)}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="suporte-chat-input-area">
            {uploading && <div className="suporte-upload-pulse">Enviando anexo...</div>}
            
            <div className="suporte-chat-input">
              {/* Botão de Anexo */}
              <button 
                className="suporte-attach-btn" 
                onClick={() => fileInputRef.current?.click()}
                disabled={enviando || uploading || !uid}
              >
                <Paperclip size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,application/pdf"
              />

              <input 
                className="suporte-input" 
                placeholder="Digite sua mensagem ou anexe um arquivo..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                disabled={enviando || uploading || !uid} 
              />
              <button 
                className="suporte-send-btn" 
                onClick={() => enviar()} 
                disabled={enviando || uploading || (!novaMensagem.trim() && !uploading) || !uid}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
