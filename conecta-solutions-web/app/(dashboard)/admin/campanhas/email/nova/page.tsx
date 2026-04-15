'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  Users,
  Send,
  Eye,
  Clock,
  Save
} from 'lucide-react';
import '@/styles/admin-campanhas.css';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const segmentos = [
  { value: 'todos', label: 'Todos os usuários', icon: '👥', count: '~10.000' },
  { value: 'clientes', label: 'Apenas Clientes', icon: '👤', count: '~6.000' },
  { value: 'profissionais', label: 'Apenas Profissionais', icon: '💼', count: '~4.000' },
  { value: 'ativos', label: 'Usuários Ativos', icon: '✅', count: '~7.000' },
  { value: 'inativos', label: 'Usuários Inativos', icon: '⚠️', count: '~3.000' },
  { value: 'vip', label: 'Assinantes VIP', icon: '👑', count: '~500' },
  { value: 'novos', label: 'Novos Cadastros', icon: '🆕', count: '~200' }
];

const templates = [
  { 
    id: 'boas-vindas', 
    nome: 'Boas-vindas', 
    descricao: 'Email de boas-vindas para novos usuários',
    assunto: 'Bem-vindo ao Conecta Serviços! 🎉',
    conteudo: `<h1>Olá, {{nome}}!</h1>
<p>Seja muito bem-vindo ao <strong>Conecta Serviços</strong>! Estamos felizes em ter você conosco.</p>
<p>Com nossa plataforma, você pode:</p>
<ul>
  <li>Encontrar os melhores profissionais</li>
  <li>Agendar serviços com facilidade</li>
  <li>Pagar com segurança</li>
</ul>
<p><a href="{{link_app}}" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Começar Agora</a></p>
<p>Qualquer dúvida, estamos à disposição!</p>
<p>Equipe Conecta Serviços 💙</p>`
  },
  { 
    id: 'promocao', 
    nome: 'Promoção Especial', 
    descricao: 'Email com oferta ou desconto',
    assunto: '🎁 Oferta Especial para Você!',
    conteudo: `<h1>{{nome}}, temos uma oferta especial!</h1>
<p>Aproveite <strong>20% OFF</strong> em todos os serviços de {{categoria}}.</p>
<p>Use o cupom:</p>
<div style="background:#F3F4F6;padding:16px;border-radius:8px;text-align:center;margin:20px 0;">
  <code style="font-size:24px;font-weight:bold;color:#3B82F6;">{{cupom}}</code>
</div>
<p>⏰ Válido até {{data_validade}}</p>
<p><a href="{{link_promocao}}" style="background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Aproveitar Agora</a></p>`
  },
  { 
    id: 'reativacao', 
    nome: 'Reativação', 
    descricao: 'Para usuários inativos',
    assunto: 'Sentimos sua falta! 🥺',
    conteudo: `<h1>Olá, {{nome}}!</h1>
<p>Percebemos que você não usa o Conecta Serviços há algum tempo.</p>
<p><strong>Sua conta está esperando por você!</strong></p>
<p>Que tal agendar um serviço hoje? Temos muitos profissionais disponíveis na sua região.</p>
<p><a href="{{link_app}}" style="background:#8B5CF6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Voltar ao App</a></p>
<p>Se precisar de ajuda, responda este email.</p>`
  },
  { 
    id: 'newsletter', 
    nome: 'Newsletter', 
    descricao: 'Atualizações e novidades',
    assunto: '📬 Novidades da Semana - Conecta Serviços',
    conteudo: `<h1>Olá, {{nome}}!</h1>
<p>Confira as novidades desta semana:</p>
<h2>🆕 Novos Profissionais</h2>
<p>Temos novos profissionais em {{cidade}}!</p>
<h2>💡 Dica do Dia</h2>
<p>{{dica}}</p>
<h2>⭐ Avaliações em Destaque</h2>
<p>{{depoimento}}</p>
<p><a href="{{link_app}}" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Ver Tudo</a></p>`
  }
];

export default function NovaCampanhaEmailPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    assunto: '',
    conteudo: '',
    segmento: [] as string[],
    agendar: false,
    dataAgendamento: '',
    usarTemplate: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selecionarTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        usarTemplate: templateId,
        assunto: template.assunto,
        conteudo: template.conteudo
      }));
    }
  };

  const toggleSegmento = (value: string) => {
    setFormData(prev => ({
      ...prev,
      segmento: prev.segmento.includes(value)
        ? prev.segmento.filter(s => s !== value)
        : [...prev.segmento, value]
    }));
  };

  const salvarRascunho = async () => {
    try {
      await addDoc(collection(db, 'campanhasEmail'), {
        titulo: formData.titulo,
        assunto: formData.assunto,
        conteudo: formData.conteudo,
        segmento: formData.segmento,
        status: 'rascunho',
        metricas: {
          total: 0,
          enviados: 0,
          abertos: 0,
          cliques: 0,
          falhas: 0,
          taxaAbertura: 0,
          taxaClique: 0
        },
        createdAt: serverTimestamp()
      });
      alert('Rascunho salvo!');
      router.push('/admin/campanhas/email');
    } catch (err) {
      alert('Erro ao salvar rascunho');
    }
  };

  const enviarCampanha = async () => {
    if (!confirm('Confirma o envio desta campanha?')) return;
    
    setLoading(true);
    try {
      const campanhaData = {
        titulo: formData.titulo,
        assunto: formData.assunto,
        conteudo: formData.conteudo,
        segmento: formData.segmento,
        status: formData.agendar ? 'agendada' : 'enviando',
        agendamento: formData.agendar ? Timestamp.fromDate(new Date(formData.dataAgendamento)) : null,
        metricas: {
          total: 0,
          enviados: 0,
          abertos: 0,
          cliques: 0,
          falhas: 0,
          taxaAbertura: 0,
          taxaClique: 0
        },
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'campanhasEmail'), campanhaData);
      alert(formData.agendar ? 'Campanha agendada!' : 'Campanha iniciada!');
      router.push('/admin/campanhas/email');
    } catch (err) {
      console.error('Erro ao criar campanha:', err);
      alert('Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  };

  const substituirVariaveis = (conteudo: string) => {
    return conteudo
      .replace(/\{\{nome\}\}/g, 'João Silva')
      .replace(/\{\{cidade\}\}/g, 'São Paulo')
      .replace(/\{\{categoria\}\}/g, 'Limpeza')
      .replace(/\{\{cupom\}\}/g, 'PROMO20')
      .replace(/\{\{data_validade\}\}/g, '31/12/2024')
      .replace(/\{\{link_app\}\}/g, '#')
      .replace(/\{\{link_promocao\}\}/g, '#')
      .replace(/\{\{dica\}\}/g, 'Agende serviços com antecedência para garantir o melhor horário!')
      .replace(/\{\{depoimento\}\}/g, '"Excelente serviço! Super recomendo!" - Maria');
  };

  const steps = [
    { number: 1, label: 'Template', icon: Mail },
    { number: 2, label: 'Conteúdo', icon: Edit },
    { number: 3, label: 'Segmento', icon: Users },
    { number: 4, label: 'Envio', icon: Send }
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <Mail size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Nova Campanha de Email
          </h1>
          <p className="admin-subtitle">Crie uma campanha de email marketing</p>
        </div>
      </div>

      {/* Progress */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 32,
        padding: 20,
        background: '#111827',
        borderRadius: 12,
        border: '1px solid #1F2937'
      }}>
        {steps.map((s) => (
          <div 
            key={s.number}
            style={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              background: step >= s.number ? '#3B82F6' : '#0B0F1A',
              borderRadius: 8,
              opacity: step >= s.number ? 1 : 0.5
            }}
          >
            <s.icon size={20} />
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Passo {s.number}</div>
              <div style={{ fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ 
        background: '#111827',
        borderRadius: 16,
        border: '1px solid #1F2937',
        padding: 32
      }}>
        {/* STEP 1: Template */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: 8 }}>Escolha um Template</h2>
            <p style={{ color: '#9CA3AF', marginBottom: 24 }}>Selecione um template pré-definido ou comece do zero</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div
                onClick={() => {
                  setFormData(prev => ({ ...prev, usarTemplate: '' }));
                  setStep(2);
                }}
                style={{
                  padding: 24,
                  background: formData.usarTemplate === '' ? '#3B82F620' : '#0B0F1A',
                  border: `2px solid ${formData.usarTemplate === '' ? '#3B82F6' : '#1F2937'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                <h3 style={{ marginBottom: 8 }}>Começar do Zero</h3>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Crie seu email personalizado</p>
              </div>

              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => selecionarTemplate(template.id)}
                  style={{
                    padding: 24,
                    background: formData.usarTemplate === template.id ? '#3B82F620' : '#0B0F1A',
                    border: `2px solid ${formData.usarTemplate === template.id ? '#3B82F6' : '#1F2937'}`,
                    borderRadius: 12,
                    cursor: 'pointer'
                  }}
                >
                  <h3 style={{ marginBottom: 8 }}>{template.nome}</h3>
                  <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>{template.descricao}</p>
                  <small style={{ color: '#6B7280' }}>Assunto: {template.assunto}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Conteúdo */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2>Conteúdo do Email</h2>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="btn-secondary"
              >
                <Eye size={16} style={{ marginRight: 8 }} />
                {previewMode ? 'Editar' : 'Preview'}
              </button>
            </div>

            {previewMode ? (
              <div style={{ 
                background: '#FFF', 
                color: '#000', 
                padding: 40, 
                borderRadius: 8,
                minHeight: 400
              }}>
                <div dangerouslySetInnerHTML={{ __html: substituirVariaveis(formData.conteudo) }} />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Título Interno *</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => handleChange('titulo', e.target.value)}
                    placeholder="Ex: Campanha Black Friday 2024"
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#0B0F1A',
                      border: '1px solid #1F2937',
                      borderRadius: 8,
                      color: '#F9FAFB',
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Assunto do Email *</label>
                  <input
                    type="text"
                    value={formData.assunto}
                    onChange={(e) => handleChange('assunto', e.target.value)}
                    placeholder="Ex: Oferta Especial para Você!"
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#0B0F1A',
                      border: '1px solid #1F2937',
                      borderRadius: 8,
                      color: '#F9FAFB',
                      fontSize: 14
                    }}
                  />
                  <small style={{ color: '#6B7280' }}>Dica: Use emojis e crie urgência para aumentar a taxa de abertura</small>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Conteúdo (HTML) *</label>
                  <textarea
                    value={formData.conteudo}
                    onChange={(e) => handleChange('conteudo', e.target.value)}
                    rows={15}
                    placeholder="<h1>Olá!</h1><p>Seu conteúdo aqui...</p>"
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#0B0F1A',
                      border: '1px solid #1F2937',
                      borderRadius: 8,
                      color: '#F9FAFB',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ padding: 16, background: '#0B0F1A', borderRadius: 8 }}>
                  <strong style={{ fontSize: 12, color: '#9CA3AF' }}>Variáveis disponíveis:</strong>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {['{{nome}}', '{{cidade}}', '{{categoria}}', '{{cupom}}', '{{data_validade}}', '{{link_app}}'].map(v => (
                      <code key={v} style={{ padding: '4px 8px', background: '#1F2937', borderRadius: 4, fontSize: 12 }}>
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Segmento */}
        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: 8 }}>Selecione o Público</h2>
            <p style={{ color: '#9CA3AF', marginBottom: 24 }}>Escolha quem receberá esta campanha</p>
            
            <div style={{ display: 'grid', gap: 12 }}>
              {segmentos.map((seg) => (
                <div
                  key={seg.value}
                  onClick={() => toggleSegmento(seg.value)}
                  style={{
                    padding: 20,
                    background: formData.segmento.includes(seg.value) ? '#3B82F620' : '#0B0F1A',
                    border: `2px solid ${formData.segmento.includes(seg.value) ? '#3B82F6' : '#1F2937'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 32 }}>{seg.icon}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>{seg.label}</h3>
                      <small style={{ color: '#6B7280' }}>~{seg.count} destinatários estimados</small>
                    </div>
                  </div>
                  {formData.segmento.includes(seg.value) && (
                    <CheckCircle size={24} style={{ color: '#3B82F6' }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: 16, background: '#0B0F1A', borderRadius: 8 }}>
              <strong style={{ color: '#9CA3AF' }}>Segmentos selecionados:</strong>
              <p style={{ marginTop: 8 }}>
                {formData.segmento.length === 0 
                  ? 'Nenhum segmento selecionado' 
                  : formData.segmento.map(s => segmentos.find(seg => seg.value === s)?.label).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Envio */}
        {step === 4 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Configuração de Envio</h2>
            
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ 
                padding: 20, 
                background: formData.agendar ? '#3B82F620' : '#0B0F1A',
                border: `2px solid ${formData.agendar ? '#3B82F6' : '#1F2937'}`,
                borderRadius: 12,
                cursor: 'pointer'
              }}
              onClick={() => handleChange('agendar', !formData.agendar)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Clock size={24} />
                  <h3 style={{ margin: 0 }}>Agendar para Depois</h3>
                </div>
                <p style={{ color: '#9CA3AF', margin: 0 }}>
                  {formData.agendar 
                    ? 'Selecione a data e hora abaixo' 
                    : 'Clique para agendar o envio'}
                </p>
              </div>

              {formData.agendar && (
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Data e Hora do Envio *</label>
                  <input
                    type="datetime-local"
                    value={formData.dataAgendamento}
                    onChange={(e) => handleChange('dataAgendamento', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#0B0F1A',
                      border: '1px solid #1F2937',
                      borderRadius: 8,
                      color: '#F9FAFB',
                      fontSize: 14
                    }}
                  />
                </div>
              )}

              {/* Resumo */}
              <div style={{ padding: 20, background: '#0B0F1A', borderRadius: 12, marginTop: 16 }}>
                <h3 style={{ marginBottom: 16 }}>Resumo da Campanha</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Título:</span>
                    <span>{formData.titulo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Assunto:</span>
                    <span>{formData.assunto}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Segmento:</span>
                    <span>{formData.segmento.map(s => segmentos.find(seg => seg.value === s)?.label).join(', ')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Envio:</span>
                    <span>{formData.agendar ? `Agendado para ${new Date(formData.dataAgendamento).toLocaleString()}` : 'Imediato'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid #1F2937'
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="btn-secondary"
              style={{ opacity: step === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={18} />
              Anterior
            </button>
            
            {step === 2 && (
              <button
                onClick={salvarRascunho}
                className="btn-secondary"
              >
                <Save size={18} style={{ marginRight: 8 }} />
                Salvar Rascunho
              </button>
            )}
          </div>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary"
              disabled={
                (step === 2 && (!formData.titulo || !formData.assunto || !formData.conteudo)) ||
                (step === 3 && formData.segmento.length === 0)
              }
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={enviarCampanha}
              disabled={loading || (formData.agendar && !formData.dataAgendamento)}
              className="btn-primary"
              style={{ minWidth: 180 }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Enviando...</>
              ) : (
                <><Send size={18} /> {formData.agendar ? 'Agendar' : 'Enviar Agora'}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { Edit } from 'lucide-react';
