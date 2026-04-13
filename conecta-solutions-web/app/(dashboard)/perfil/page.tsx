'use client';

import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { 
  User, Mail, MapPin, Shield, Camera, 
  Save, Briefcase, Lock, MessageCircle, Copy, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/perfil.css';

// Configuração Cloudinary (Sincronizada com Mobile)
const CLOUDINARY_CLOUD_NAME = 'dctnkaktn';
const CLOUDINARY_UPLOAD_PRESET = 'Conecta-Solutions';

/** Gera ID único da plataforma no formato CS-XXXX-XXXXXX */
function gerarPlatformUID(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CS-${rand(4)}-${rand(6)}`;
}

export default function PerfilPage() {
  const { user, dadosUsuario, ehProfissional } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');
  const [uploading, setUploading] = useState<string | null>(null);
  const [platformUID, setPlatformUID] = useState<string>('');

  const [formData, setFormData] = useState<any>({
    nome: '',
    email: '',
    whatsapp: '',
    telefone: '',
    cidade: '',
    estado: '',
    especialidade: '',
    bio: '',
    fotoUrl: '',
    fotoBanner: ''
  });

  useEffect(() => {
    async function loadPerfil() {
      if (!user?.uid) {
        if (user === null) setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setFormData({
            nome: d.nome || d.nomeCompleto || '',
            email: d.email || '',
            whatsapp: d.whatsapp || '',
            telefone: d.telefonePrincipal || d.telefone || '',
            cidade: d.cidade || '',
            estado: d.estado || '',
            especialidade: d.especialidade || d.categoria || '',
            bio: d.bio || '',
            fotoUrl: d.fotoPerfil || d.foto || d.avatar || d.fotoUrl || '',
            fotoBanner: d.bannerPerfil || d.banner || d.bannerUrl || d.fotoBanner || ''
          });

          // ID único — gera se ainda não existir
          if (d.platformUID) {
            setPlatformUID(d.platformUID as string);
          } else {
            const novoUID = gerarPlatformUID();
            await updateDoc(doc(db, 'usuarios', user.uid), { platformUID: novoUID });
            setPlatformUID(novoUID);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPerfil();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'perfil' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploading(tipo);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      data.append('folder', 'usuarios');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: data }
      );

      const result = await response.json();
      
      if (result.secure_url) {
        const url = result.secure_url;
        const uRef = doc(db, 'usuarios', user.uid);
        
        // Sincronização Mobile: Grava em todos os campos usados pelo App
        const updateFields = tipo === 'perfil' 
          ? { fotoPerfil: url, foto: url, avatar: url, fotoUrl: url }
          : { bannerPerfil: url, banner: url, bannerUrl: url, fotoBanner: url };
        
        await updateDoc(uRef, { ...updateFields, atualizadoEm: serverTimestamp() });
        
        setFormData((prev: any) => ({ 
          ...prev, 
          [tipo === 'perfil' ? 'fotoUrl' : 'fotoBanner']: url 
        }));
        
        toast.success(`${tipo === 'perfil' ? 'Foto' : 'Banner'} sincronizado com sucesso!`);
      } else {
        throw new Error('Falha no upload');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao sincronizar imagem.');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { ...formData, atualizadoEm: serverTimestamp() });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-primary">Carregando perfil...</div>;

  return (
    <div className="profile-page">
      <Topbar title="Meu Perfil" subtitle="Identidade Visual Enterprise" />

      <div className="profile-container">
        <section className="profile-header-premium">
          <div className="profile-banner">
            {formData.fotoBanner ? <img src={formData.fotoBanner as string} alt="Banner" className="banner-img" /> : <div className="banner-placeholder" />}
            <label className="btn-edit-banner">
              <Camera size={16} /> {uploading === 'banner' ? 'Enviando...' : 'Mudar Banner'}
              <input type="file" hidden onChange={(e) => handleFileUpload(e, 'banner')} accept="image/*" />
            </label>
          </div>

          <div className="profile-identity-strip">
            <div className="profile-avatar-premium">
              <div className="avatar-circle">
                {formData.fotoUrl ? <img src={formData.fotoUrl as string} alt="Foto" /> : ((formData.nome as string)?.charAt(0).toUpperCase() || 'U')}
                {uploading === 'perfil' && <div className="avatar-loading">...</div>}
              </div>
              <label className="btn-edit-avatar"><Camera size={14} /><input type="file" hidden onChange={(e) => handleFileUpload(e, 'perfil')} accept="image/*" /></label>
            </div>
            <div className="profile-identity-info">
              <h1 className="profile-name-xl">{formData.nome as string}</h1>
              <p className="profile-role-xl">{(dadosUsuario?.perfil || 'Usuário') as string}</p>
            </div>
            <nav className="profile-tabs-enterprise">
              <button className={`tab-item ${activeTab === 'dados' ? 'tab-item--active' : ''}`} onClick={() => setActiveTab('dados')}>Dados</button>
              <button className={`tab-item ${activeTab === 'seguranca' ? 'tab-item--active' : ''}`} onClick={() => setActiveTab('seguranca')}>Segurança</button>
            </nav>
          </div>
        </section>

        <div className="profile-content-enterprise">
          <aside className="profile-aside-info">
            <div className="aside-card">
              <h5 className="aside-card-title">Resumo Corporativo</h5>
              <div className="aside-info-item"><Mail size={14} /> <span>{formData.email}</span></div>
              <div className="aside-info-item"><Briefcase size={14} /> <span>{formData.especialidade || 'Expert'}</span></div>
              <div className="aside-info-item"><MapPin size={14} /> <span>{formData.cidade || 'Perto de você'}</span></div>
              {platformUID && (
                <div className="aside-uid-badge">
                  <Hash size={12} />
                  <span>{platformUID}</span>
                  <button
                    className="aside-uid-copy"
                    title="Copiar ID"
                    onClick={() => { navigator.clipboard.writeText(platformUID); toast.success('ID copiado!'); }}
                  >
                    <Copy size={11} />
                  </button>
                </div>
              )}
              <div className="aside-divider" />
              <button className="aside-btn-support" onClick={() => window.open('https://wa.me/5591992104583', '_blank')}><MessageCircle size={14} /> Suporte Conecta</button>
            </div>
          </aside>

          <main className="profile-form-main">
            {activeTab === 'dados' ? (
              <form onSubmit={handleSave} className="enterprise-form">
                <div className="form-grid">
                  <div className="input-box full">
                    <label>Nome Completo / Razão Social</label>
                    <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                  </div>
                  <div className="input-box">
                    <label>E-mail (Login)</label>
                    <input type="email" value={formData.email} disabled />
                  </div>
                  <div className="input-box">
                    <label>WhatsApp Profissional</label>
                    <input type="text" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                  </div>
                  <div className="input-box">
                    <label>Cidade</label>
                    <input type="text" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
                  </div>
                  <div className="input-box">
                    <label>Estado (UF)</label>
                    <input type="text" maxLength={2} value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} />
                  </div>
                  {ehProfissional && (
                    <>
                      <div className="input-box full">
                        <label>Especialidade Principal</label>
                        <input type="text" value={formData.especialidade} onChange={e => setFormData({...formData, especialidade: e.target.value})} />
                      </div>
                      <div className="input-box full">
                        <label>Biografia Profissional</label>
                        <textarea rows={4} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                      </div>
                    </>
                  )}
                </div>
                <button type="submit" className="btn-enterprise-save" disabled={saving}>
                  {saving ? 'Processando...' : <><Save size={18} /> Atualizar Perfil Corporate</>}
                </button>
              </form>
            ) : (
              <div className="security-view">
                <Shield size={64} color="#3B82F6" strokeWidth={1} />
                <h3>Segurança da Conta</h3>
                <p>Suas informações estão protegidas por criptografia de ponta a ponta. Para redefinir sua senha, utilize o portal de recuperação no login.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
