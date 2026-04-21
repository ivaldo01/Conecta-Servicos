'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
// Configuração Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dctnkaktn';
const CLOUDINARY_UPLOAD_PRESET = 'Conecta-Solutions';
import axios from 'axios';
import {
  Megaphone,
  Plus,
  Send,
  Mail,
  Bell,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  RefreshCw,
  AlertTriangle,
  Tag,
  Calendar,
  Ticket,
  MessageCircle,
  Loader2,
  X,
  Image as ImageIcon,
  ImagePlus,
  Video as VideoIcon,
  Film,
  Clapperboard
} from 'lucide-react';
import '@/styles/admin-campanhas.css';
import '@/styles/admin-campanhas-modal.css';

interface Campanha {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'email' | 'push' | 'sms' | 'todos';
  status: 'rascunho' | 'agendada' | 'enviada' | 'cancelada';
  segmento: 'todos' | 'clientes' | 'profissionais' | 'inativos' | 'vip';
  totalEnviados: number;
  totalAbertos: number;
}

export default function CampanhasPage() {
  const router = useRouter();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [criandoCampanha, setCriandoCampanha] = useState(false);
  
  // Estado do formulário de nova campanha
  const [novaCampanha, setNovaCampanha] = useState({
    tipo: 'promocao' as 'promocao' | 'evento' | 'cupom',
    titulo: '',
    mensagem: '',
    canais: ['notificacao'] as string[],
    segmento: 'todos' as 'todos' | 'clientes' | 'profissionais' | 'vip' | 'inativos',
    codigoCupom: '',
    valor: '',
    dataLimite: '',
    imagemUrl: '',
    videoUrl: ''
  });
  const [uploadingImagem, setUploadingImagem] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Gerar código de cupom aleatório
  const gerarCodigoCupom = () => {
    const codigo = 'PROMO' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setNovaCampanha({...novaCampanha, codigoCupom: codigo});
  };

  // Upload de imagem para Cloudinary
  const handleUploadImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImagem(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'campanhas');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (!response.ok || !data?.secure_url) {
        throw new Error(data?.error?.message || 'Erro no upload');
      }

      setNovaCampanha({...novaCampanha, imagemUrl: data.secure_url});
      alert('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao upload imagem:', error);
      alert('Erro ao carregar imagem');
    } finally {
      setUploadingImagem(false);
    }
  };

  // Upload de vídeo para Cloudinary
  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'campanhas/videos');
      formData.append('resource_type', 'video');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (!response.ok || !data?.secure_url) {
        throw new Error(data?.error?.message || 'Erro no upload');
      }

      setNovaCampanha({...novaCampanha, videoUrl: data.secure_url});
      alert('Vídeo carregado com sucesso!');
    } catch (error) {
      console.error('Erro ao upload video:', error);
      alert('Erro ao carregar vídeo');
    } finally {
      setUploadingVideo(false);
    }
  };

  // Criar e enviar campanha
  const criarCampanha = async () => {
    if (!novaCampanha.titulo || !novaCampanha.mensagem || novaCampanha.canais.length === 0) {
      alert('Preencha todos os campos obrigatórios e selecione pelo menos um canal de envio');
      return;
    }

    setCriandoCampanha(true);
    
    try {
      // 1. Salvar campanha no Firestore
      const campanhaData = {
        titulo: novaCampanha.titulo,
        mensagem: novaCampanha.mensagem,
        tipo: novaCampanha.tipo,
        canais: novaCampanha.canais,
        segmento: novaCampanha.segmento,
        codigoCupom: novaCampanha.tipo === 'cupom' ? novaCampanha.codigoCupom : null,
        valor: novaCampanha.valor,
        dataLimite: novaCampanha.dataLimite,
        imagemUrl: novaCampanha.imagemUrl || null,
        videoUrl: novaCampanha.videoUrl || null,
        status: 'enviada',
        criadaEm: serverTimestamp(),
        totalEnviados: 0,
        totalAbertos: 0
      };

      const campanhaRef = await addDoc(collection(db, 'campanhas'), campanhaData);
      console.log('[Campanhas] Campanha criada:', campanhaRef.id);

      // 2. Buscar usuários do segmento selecionado
      const usuariosQuery = query(collection(db, 'usuarios'));
      const usuariosSnap = await getDocs(usuariosQuery);
      
      let usuariosAlvo = usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtrar por segmento
      if (novaCampanha.segmento === 'clientes') {
        usuariosAlvo = usuariosAlvo.filter((u: any) => u.perfil === 'cliente');
      } else if (novaCampanha.segmento === 'profissionais') {
        usuariosAlvo = usuariosAlvo.filter((u: any) => u.perfil === 'profissional');
      } else if (novaCampanha.segmento === 'vip') {
        usuariosAlvo = usuariosAlvo.filter((u: any) => u.planoAtivo?.includes('vip'));
      } else if (novaCampanha.segmento === 'inativos') {
        usuariosAlvo = usuariosAlvo.filter((u: any) => !u.ultimoAcesso || 
          (new Date().getTime() - (u.ultimoAcesso?.toDate?.() || new Date(u.ultimoAcesso)).getTime()) > 30 * 24 * 60 * 60 * 1000);
      }

      console.log(`[Campanhas] Enviando para ${usuariosAlvo.length} usuários`);

      // 3. Enviar notificações
      for (const usuario of usuariosAlvo) {
        try {
          // Notificações push/web (sino)
          if (novaCampanha.canais.includes('notificacao')) {
            await addDoc(collection(db, 'usuarios', usuario.id, 'notificacoes'), {
              tipo: 'campanha',
              titulo: novaCampanha.titulo,
              mensagem: novaCampanha.mensagem,
              campanhaId: campanhaRef.id,
              cupom: novaCampanha.tipo === 'cupom' ? novaCampanha.codigoCupom : null,
              imagemUrl: novaCampanha.imagemUrl || null,
              videoUrl: novaCampanha.videoUrl || null,
              lida: false,
              createdAt: serverTimestamp()
            });
          }

          // Mensagens no chat de suporte (subcoleção mensagens)
          if (novaCampanha.canais.includes('suporte')) {
            await addDoc(collection(db, 'suporte', usuario.id, 'mensagens'), {
              tipo: 'campanha',
              senderId: 'sistema',
              titulo: novaCampanha.titulo,
              mensagem: novaCampanha.mensagem,
              imagemUrl: novaCampanha.imagemUrl || null,
              videoUrl: novaCampanha.videoUrl || null,
              cupom: novaCampanha.cupom || null,
              valor: novaCampanha.valor || null,
              dataFim: novaCampanha.dataFim ? Timestamp.fromDate(novaCampanha.dataFim) : null,
              createdAt: serverTimestamp(),
              lida: false
            });
            
            // Atualizar contador de não lidas no documento principal
            await updateDoc(doc(db, 'suporte', usuario.id), {
              naoLidasUsuario: increment(1),
              ultimaMensagem: novaCampanha.titulo,
              ultimaAtualizacao: serverTimestamp()
            });
          }

          // Push notifications para mobile
          if (novaCampanha.canais.includes('push') && (usuario as any).expoPushToken) {
            // Aqui você integraria com o serviço de push
            console.log('[Campanhas] Push enviado para:', usuario.id);
          }
        } catch (err) {
          console.error(`[Campanhas] Erro ao enviar para ${usuario.id}:`, err);
        }
      }

      // Atualizar contador de envios
      await updateDoc(doc(db, 'campanhas', campanhaRef.id), {
        totalEnviados: usuariosAlvo.length
      });

      alert(`Campanha enviada com sucesso para ${usuariosAlvo.length} usuários!`);
      
      // Resetar formulário
      setNovaCampanha({
        tipo: 'promocao',
        titulo: '',
        mensagem: '',
        canais: ['notificacao'],
        segmento: 'todos',
        codigoCupom: '',
        valor: '',
        dataLimite: ''
      });
      setShowModal(false);
      
    } catch (error) {
      console.error('[Campanhas] Erro ao criar campanha:', error);
      alert('Erro ao criar campanha. Tente novamente.');
    } finally {
      setCriandoCampanha(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'campanhas'), orderBy('criadaEm', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Campanha[];
        setCampanhas(data);
        setLoading(false);
        setErro('');
      },
      (error) => {
        console.error('[Campanhas] Erro:', error);
        setErro(error.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Campanhas & Marketing</h1>
            <p className="admin-subtitle">Comunicação com usuários - Quartel General</p>
          </div>
        </div>
        
        <div style={{
          padding: 40,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 16,
          textAlign: 'center',
          maxWidth: 600,
          margin: '40px auto'
        }}>
          <AlertTriangle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
          <h2 style={{ color: '#EF4444', marginBottom: 16 }}>Erro de Permissão</h2>
          <p style={{ marginBottom: 24, color: '#CBD5E1' }}>
            <strong>Mensagem:</strong> {erro}
          </p>
          
          <div style={{ textAlign: 'left', background: '#0B0F1A', padding: 20, borderRadius: 12, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>🔧 Soluções:</h3>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Verifique se você é admin em <a href="/admin/diagnostico" style={{ color: '#3B82F6' }}>/admin/diagnostico</a></li>
              <li>Adicione <code>isAdmin: true</code> no seu documento no Firestore</li>
              <li>Deploy das regras: <code>firebase deploy --only firestore:rules</code></li>
            </ol>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}
          >
            <RefreshCw size={16} />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Campanhas & Marketing</h1>
          <p className="admin-subtitle">Comunicação com usuários - Quartel General</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Nova Campanha
        </button>
      </div>

      <div className="campanhas-grid">
        {campanhas.length === 0 ? (
          <div className="empty-state">
            <Megaphone size={64} />
            <h3>Nenhuma campanha criada</h3>
            <p>Crie sua primeira campanha de marketing</p>
          </div>
        ) : (
          campanhas.map((campanha) => (
            <div key={campanha.id} className={`campanha-card ${campanha.status}`}>
              <div className="campanha-header">
                <span className={`status-badge ${campanha.status}`}>{campanha.status}</span>
              </div>
              <h3>{campanha.titulo}</h3>
              <p>{campanha.mensagem}</p>
            </div>
          ))
        )}
      </div>

      {/* Modal Nova Campanha */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content campanha-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🚀 Nova Campanha Interna</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Tipo de Campanha */}
              <div className="form-group">
                <label>Tipo de Campanha</label>
                <div className="tipo-campanha-grid">
                  <button 
                    type="button"
                    className={`tipo-btn ${novaCampanha.tipo === 'promocao' ? 'active' : ''}`}
                    onClick={() => setNovaCampanha({...novaCampanha, tipo: 'promocao'})}
                  >
                    <Tag size={24} />
                    <span>Promoção</span>
                    <small>Descontos especiais</small>
                  </button>
                  <button 
                    type="button"
                    className={`tipo-btn ${novaCampanha.tipo === 'evento' ? 'active' : ''}`}
                    onClick={() => setNovaCampanha({...novaCampanha, tipo: 'evento'})}
                  >
                    <Calendar size={24} />
                    <span>Evento</span>
                    <small>Datas comemorativas</small>
                  </button>
                  <button 
                    type="button"
                    className={`tipo-btn ${novaCampanha.tipo === 'cupom' ? 'active' : ''}`}
                    onClick={() => setNovaCampanha({...novaCampanha, tipo: 'cupom'})}
                  >
                    <Ticket size={24} />
                    <span>Cupom</span>
                    <small>Código de desconto</small>
                  </button>
                </div>
              </div>

              {/* Título */}
              <div className="form-group">
                <label>Título da Campanha</label>
                <input 
                  type="text" 
                  placeholder="Ex: Black Friday 50% OFF"
                  value={novaCampanha.titulo}
                  onChange={(e) => setNovaCampanha({...novaCampanha, titulo: e.target.value})}
                />
              </div>

              {/* Mensagem */}
              <div className="form-group">
                <label>Mensagem</label>
                <textarea 
                  rows={4}
                  placeholder="Descreva sua campanha..."
                  value={novaCampanha.mensagem}
                  onChange={(e) => setNovaCampanha({...novaCampanha, mensagem: e.target.value})}
                />
              </div>

              {/* Canal de Envio */}
              <div className="form-group">
                <label>Canal de Envio</label>
                <div className="canais-grid">
                  <label className="canal-checkbox">
                    <input 
                      type="checkbox" 
                      checked={novaCampanha.canais.includes('notificacao')}
                      onChange={(e) => {
                        const canais = e.target.checked 
                          ? [...novaCampanha.canais, 'notificacao']
                          : novaCampanha.canais.filter(c => c !== 'notificacao');
                        setNovaCampanha({...novaCampanha, canais});
                      }}
                    />
                    <Bell size={20} />
                    <span>Notificações (Sino)</span>
                  </label>
                  <label className="canal-checkbox">
                    <input 
                      type="checkbox" 
                      checked={novaCampanha.canais.includes('suporte')}
                      onChange={(e) => {
                        const canais = e.target.checked 
                          ? [...novaCampanha.canais, 'suporte']
                          : novaCampanha.canais.filter(c => c !== 'suporte');
                        setNovaCampanha({...novaCampanha, canais});
                      }}
                    />
                    <MessageCircle size={20} />
                    <span>Chat Suporte</span>
                  </label>
                  <label className="canal-checkbox">
                    <input 
                      type="checkbox" 
                      checked={novaCampanha.canais.includes('push')}
                      onChange={(e) => {
                        const canais = e.target.checked 
                          ? [...novaCampanha.canais, 'push']
                          : novaCampanha.canais.filter(c => c !== 'push');
                        setNovaCampanha({...novaCampanha, canais});
                      }}
                    />
                    <Smartphone size={20} />
                    <span>Push Mobile</span>
                  </label>
                </div>
              </div>

              {/* Segmento */}
              <div className="form-group">
                <label>Segmento de Usuários</label>
                <select 
                  value={novaCampanha.segmento}
                  onChange={(e) => setNovaCampanha({...novaCampanha, segmento: e.target.value})}
                >
                  <option value="todos">Todos os usuários</option>
                  <option value="clientes">Apenas Clientes</option>
                  <option value="profissionais">Apenas Profissionais</option>
                  <option value="vip">Usuários VIP</option>
                  <option value="inativos">Usuários Inativos</option>
                </select>
              </div>

              {/* Código Cupom (se tipo cupom) */}
              {novaCampanha.tipo === 'cupom' && (
                <div className="form-group">
                  <label>Código do Cupom</label>
                  <div className="cupom-input-group">
                    <input 
                      type="text" 
                      placeholder="Ex: PROMO20"
                      value={novaCampanha.codigoCupom}
                      onChange={(e) => setNovaCampanha({...novaCampanha, codigoCupom: e.target.value.toUpperCase()})}
                    />
                    <button type="button" className="btn-secondary" onClick={gerarCodigoCupom}>
                      <RefreshCw size={16} />
                      Gerar
                    </button>
                  </div>
                  <small className="help-text">Os usuários precisarão digitar este código</small>
                </div>
              )}

              {/* Valor/Desconto */}
              <div className="form-row">
                <div className="form-group">
                  <label>Valor/Desconto</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 20% ou R$ 50,00"
                    value={novaCampanha.valor}
                    onChange={(e) => setNovaCampanha({...novaCampanha, valor: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Data Limite</label>
                  <input 
                    type="date" 
                    value={novaCampanha.dataLimite}
                    onChange={(e) => setNovaCampanha({...novaCampanha, dataLimite: e.target.value})}
                  />
                </div>
              </div>

              {/* Upload de Mídia */}
              <div className="form-group">
                <label>Mídia da Campanha (Opcional)</label>
                <div className="upload-grid">
                  {/* Upload Imagem */}
                  <div className="upload-item">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImagem}
                      disabled={uploadingImagem}
                      id="upload-imagem"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="upload-imagem" className="upload-btn">
                      {uploadingImagem ? (
                        <Loader2 size={24} className="spin" />
                      ) : novaCampanha.imagemUrl ? (
                        <ImageIcon size={24} />
                      ) : (
                        <ImagePlus size={24} />
                      )}
                      <span>{novaCampanha.imagemUrl ? 'Imagem OK' : 'Adicionar Imagem'}</span>
                    </label>
                    {novaCampanha.imagemUrl && (
                      <div className="preview-container">
                        <img src={novaCampanha.imagemUrl} alt="Preview" className="preview-image" />
                        <button 
                          className="btn-remove" 
                          onClick={() => setNovaCampanha({...novaCampanha, imagemUrl: ''})}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload Vídeo */}
                  <div className="upload-item">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleUploadVideo}
                      disabled={uploadingVideo}
                      id="upload-video"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="upload-video" className="upload-btn video">
                      {uploadingVideo ? (
                        <Loader2 size={24} className="spin" />
                      ) : novaCampanha.videoUrl ? (
                        <VideoIcon size={24} />
                      ) : (
                        <Film size={24} />
                      )}
                      <span>{novaCampanha.videoUrl ? 'Vídeo OK' : 'Adicionar Vídeo'}</span>
                    </label>
                    {novaCampanha.videoUrl && (
                      <div className="preview-container">
                        <video src={novaCampanha.videoUrl} className="preview-video" controls />
                        <button 
                          className="btn-remove" 
                          onClick={() => setNovaCampanha({...novaCampanha, videoUrl: ''})}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <small className="help-text">Imagens e vídeos deixam a campanha mais atrativa para os usuários</small>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={criarCampanha}
                disabled={!novaCampanha.titulo || !novaCampanha.mensagem || novaCampanha.canais.length === 0 || criandoCampanha}
              >
                {criandoCampanha ? (
                  <><Loader2 size={18} className="spin" /> Criando...</>
                ) : (
                  <><Send size={18} /> Criar e Enviar Campanha</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
