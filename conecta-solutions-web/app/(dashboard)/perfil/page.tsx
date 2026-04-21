'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { 
  User, Mail, MapPin, Shield, Camera, 
  Save, Briefcase, Lock, MessageCircle, Copy, Hash,
  Loader2, CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/perfil.css';
import { validarPerfilForm, formatarTelefone, removerMascaraTelefone, ValidationErrors } from '@/lib/validation';

// Configuração Cloudinary (Sincronizada com Mobile)
const CLOUDINARY_CLOUD_NAME = 'dctnkaktn';
const CLOUDINARY_UPLOAD_PRESET = 'Conecta-Solutions';

/** Gera ID único da plataforma no formato CS-XXXX-XXXXXX */
function gerarPlatformUID(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CS-${rand(4)}-${rand(6)}`;
}

// Componente de input validado
function ValidatedInput({ 
  label, 
  value, 
  onChange, 
  error, 
  required = false, 
  disabled = false,
  type = 'text',
  maxLength,
  placeholder,
  helpText
}: { 
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  helpText?: string;
}) {
  const [touched, setTouched] = useState(false);

  return (
    <div className={`input-box ${error && touched ? 'input-box--error' : ''}`}>
      <label>
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      <input 
        type={type} 
        value={value} 
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        className={error && touched ? 'input-error' : ''}
      />
      {error && touched && (
        <span className="input-error-message">
          <AlertCircle size={14} /> {error}
        </span>
      )}
      {helpText && !error && <span className="input-help-text">{helpText}</span>}
    </div>
  );
}

// Componente de textarea validado
function ValidatedTextarea({ 
  label, 
  value, 
  onChange, 
  error, 
  required = false,
  maxLength = 500,
  rows = 4
}: { 
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
}) {
  const [touched, setTouched] = useState(false);
  const charCount = value?.length || 0;

  return (
    <div className={`input-box full ${error && touched ? 'input-box--error' : ''}`}>
      <label>
        {label}
        {required && <span className="required-indicator">*</span>}
        <span className="char-counter">{charCount}/{maxLength}</span>
      </label>
      <textarea 
        rows={rows} 
        value={value} 
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        className={error && touched ? 'input-error' : ''}
      />
      {error && touched && (
        <span className="input-error-message">
          <AlertCircle size={14} /> {error}
        </span>
      )}
    </div>
  );
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

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validação em tempo real
  const validateField = useCallback((field: string, value: string) => {
    const fieldErrors = validarPerfilForm({
      nome: field === 'nome' ? value : formData.nome,
      whatsapp: field === 'whatsapp' ? value : formData.whatsapp,
      email: field === 'email' ? value : formData.email,
    });
    
    setErrors(prev => ({
      ...prev,
      [field]: fieldErrors[field] || ''
    }));
  }, [formData]);

  // Handler para campos com formatação
  const handleWhatsAppChange = (value: string) => {
    const formatted = formatarTelefone(value);
    setFormData({ ...formData, whatsapp: formatted });
    validateField('whatsapp', formatted);
    setTouchedFields(prev => new Set(prev).add('whatsapp'));
  };

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
    
    // Marca todos os campos como touched
    setTouchedFields(new Set(['nome', 'whatsapp', 'email']));
    
    // Valida todos os campos
    const validationErrors = validarPerfilForm({
      nome: formData.nome,
      whatsapp: formData.whatsapp,
      email: formData.email,
    });
    
    setErrors(validationErrors);
    
    // Se houver erros, não salva
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }
    
    setSaving(true);
    try {
      // Remove máscara do telefone antes de salvar
      const dataToSave = {
        ...formData,
        whatsapp: removerMascaraTelefone(formData.whatsapp),
        telefone: removerMascaraTelefone(formData.telefone || formData.whatsapp),
        atualizadoEm: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'usuarios', user.uid), dataToSave);
      toast.success('Perfil atualizado com sucesso!', {
        icon: <CheckCircle2 className="text-green-500" />,
        duration: 3000,
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar perfil. Tente novamente.', {
        icon: <AlertCircle className="text-red-500" />,
      });
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
                  <ValidatedInput
                    label="Nome Completo / Razão Social"
                    value={formData.nome}
                    onChange={(value) => {
                      setFormData({...formData, nome: value});
                      validateField('nome', value);
                    }}
                    error={errors.nome}
                    required
                    maxLength={100}
                    placeholder="Digite seu nome completo"
                  />
                  
                  <ValidatedInput
                    label="E-mail (Login)"
                    value={formData.email}
                    onChange={() => {}}
                    disabled
                    helpText="O email não pode ser alterado"
                  />
                  
                  <ValidatedInput
                    label="WhatsApp Profissional"
                    value={formData.whatsapp}
                    onChange={handleWhatsAppChange}
                    error={errors.whatsapp}
                    required
                    maxLength={16}
                    placeholder="(00) 00000-0000"
                    helpText="Será usado para notificações e contato"
                  />
                  
                  <ValidatedInput
                    label="Cidade"
                    value={formData.cidade}
                    onChange={(value) => setFormData({...formData, cidade: value})}
                    maxLength={50}
                    placeholder="Sua cidade"
                  />
                  
                  <ValidatedInput
                    label="Estado (UF)"
                    value={formData.estado}
                    onChange={(value) => setFormData({...formData, estado: value.toUpperCase()})}
                    maxLength={2}
                    placeholder="UF"
                  />
                  
                  {ehProfissional && (
                    <>
                      <ValidatedInput
                        label="Especialidade Principal"
                        value={formData.especialidade}
                        onChange={(value) => setFormData({...formData, especialidade: value})}
                        maxLength={50}
                        placeholder="Ex: Barbeiro, Manicure, Cabeleireira"
                      />
                      
                      <ValidatedTextarea
                        label="Biografia Profissional"
                        value={formData.bio}
                        onChange={(value) => setFormData({...formData, bio: value})}
                        maxLength={500}
                        rows={4}
                      />
                    </>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  className="btn-enterprise-save" 
                  disabled={saving || Object.keys(errors).some(k => errors[k])}
                >
                  {saving ? (
                    <><Loader2 size={18} className="animate-spin" /> Salvando...</>
                  ) : (
                    <><Save size={18} /> Atualizar Perfil Corporate</>
                  )}
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
