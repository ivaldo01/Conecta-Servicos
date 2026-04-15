'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Megaphone, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  Image as ImageIcon,
  Target,
  DollarSign,
  Eye,
  Plus
} from 'lucide-react';
import '@/styles/admin-campanhas.css';
import { criarAnuncio, listarAnunciantes, Anunciante, TipoAnuncio, ModeloCobranca } from '@/lib/anuncioService';

const tiposAnuncio: { value: TipoAnuncio; label: string; dimensoes: string; descricao: string }[] = [
  { value: 'banner_superior', label: 'Banner Superior', dimensoes: '728x90px', descricao: 'Exibido no topo das páginas' },
  { value: 'banner_lateral', label: 'Banner Lateral', dimensoes: '300x250px', descricao: 'Sidebar lateral do dashboard' },
  { value: 'card', label: 'Card Intermediário', dimensoes: '300x200px', descricao: 'Entre cards de serviços' },
  { value: 'banner_full', label: 'Banner Full', dimensoes: '100%x300px', descricao: 'Banner grande entre seções' },
  { value: 'modal', label: 'Modal Pop-up', dimensoes: '400x400px', descricao: 'Janela modal ao abrir app' },
  { value: 'push', label: 'Push Notification', dimensoes: 'Texto + Ícone', descricao: 'Notificação push no mobile' },
  { value: 'story', label: 'Story', dimensoes: '9:16 Full', descricao: 'Tela cheia estilo stories' }
];

const modelosCobranca: { value: ModeloCobranca; label: string; descricao: string; exemplo: string }[] = [
  { value: 'cpm', label: 'CPM (Custo por Mil)', descricao: 'Pague a cada 1000 impressões', exemplo: 'R$ 25,00 por 1000 visualizações' },
  { value: 'cpc', label: 'CPC (Custo por Clique)', descricao: 'Pague apenas quando clicarem', exemplo: 'R$ 2,50 por clique' },
  { value: 'cpa', label: 'CPA (Custo por Aquisição)', descricao: 'Pague por conversão real', exemplo: 'R$ 30,00 por venda/cadastro' },
  { value: 'pacote_fixo', label: 'Pacote Fixo', descricao: 'Valor mensal/semanal fixo', exemplo: 'R$ 500,00/mês ilimitado' }
];

export default function NovoAnuncioPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [anunciantes, setAnunciantes] = useState<Anunciante[]>([]);
  
  const [formData, setFormData] = useState({
    // Anunciante
    anuncianteId: '',
    
    // Informações básicas
    titulo: '',
    tipo: 'banner_superior' as TipoAnuncio,
    modeloCobranca: 'cpm' as ModeloCobranca,
    valorCobranca: '',
    orcamentoTotal: '',
    
    // Criativo
    imagemUrl: '',
    imagemMobileUrl: '',
    tituloAnuncio: '',
    textoAnuncio: '',
    ctaTexto: 'Saiba mais',
    ctaLink: '',
    corPrimaria: '#3B82F6',
    corSecundaria: '#1E40AF',
    
    // Período
    dataInicio: '',
    dataFim: '',
    agendado: false,
    
    // Segmentação
    segmentacao: {
      todos: true,
      perfis: [] as ('cliente' | 'profissional')[],
      cidades: [] as string[],
      categorias: [] as string[],
      dispositivos: ['web', 'mobile', 'desktop'] as ('web' | 'mobile' | 'desktop')[],
    }
  });

  useEffect(() => {
    carregarAnunciantes();
  }, []);

  const carregarAnunciantes = async () => {
    try {
      const data = await listarAnunciantes();
      setAnunciantes(data);
    } catch (err) {
      console.error('Erro ao carregar anunciantes:', err);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSegmentacaoChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      segmentacao: { ...prev.segmentacao, [field]: value }
    }));
  };

  const salvar = async () => {
    setLoading(true);
    try {
      const anuncioData = {
        anuncianteId: formData.anuncianteId,
        titulo: formData.titulo,
        tipo: formData.tipo,
        modeloCobranca: formData.modeloCobranca,
        valorCobranca: parseFloat(formData.valorCobranca) || 0,
        orcamentoTotal: formData.orcamentoTotal ? parseFloat(formData.orcamentoTotal) : undefined,
        dataInicio: new Date(formData.dataInicio),
        dataFim: new Date(formData.dataFim),
        agendado: formData.agendado,
        imagemUrl: formData.imagemUrl,
        imagemMobileUrl: formData.imagemMobileUrl,
        tituloAnuncio: formData.tituloAnuncio,
        textoAnuncio: formData.textoAnuncio,
        ctaTexto: formData.ctaTexto,
        ctaLink: formData.ctaLink,
        corPrimaria: formData.corPrimaria,
        corSecundaria: formData.corSecundaria,
        segmentacao: formData.segmentacao,
        status: 'rascunho' as const
      };

      await criarAnuncio(anuncioData);
      alert('Anúncio criado com sucesso!');
      router.push('/admin/campanhas/anuncios');
    } catch (err) {
      console.error('Erro ao criar anúncio:', err);
      alert('Erro ao criar anúncio. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'Anunciante', icon: Target },
    { number: 2, label: 'Configuração', icon: Megaphone },
    { number: 3, label: 'Criativo', icon: ImageIcon },
    { number: 4, label: 'Segmentação', icon: Eye },
    { number: 5, label: 'Revisão', icon: CheckCircle }
  ];

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <Megaphone size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Novo Anúncio
          </h1>
          <p className="admin-subtitle">Crie uma nova campanha publicitária</p>
        </div>
      </div>

      {/* Progress Steps */}
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

      {/* Form Content */}
      <div style={{ 
        background: '#111827',
        borderRadius: 16,
        border: '1px solid #1F2937',
        padding: 32
      }}>
        {/* STEP 1: Anunciante */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Selecione o Anunciante</h2>
            
            {anunciantes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: '#9CA3AF', marginBottom: 16 }}>Nenhum anunciante cadastrado</p>
                <button 
                  className="btn-primary"
                  onClick={() => router.push('/admin/campanhas/anunciantes')}
                >
                  <Plus size={18} style={{ marginRight: 8 }} />
                  Cadastrar Anunciante
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {anunciantes.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => handleChange('anuncianteId', a.id)}
                    style={{
                      padding: 20,
                      background: formData.anuncianteId === a.id ? '#3B82F620' : '#0B0F1A',
                      border: `2px solid ${formData.anuncianteId === a.id ? '#3B82F6' : '#1F2937'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 16 }}>{a.nomeFantasia}</div>
                      <div style={{ fontSize: 14, color: '#9CA3AF' }}>{a.razaoSocial}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                        CNPJ: {a.cnpj} | Saldo: R$ {a.saldoCreditos?.toFixed(2) || '0,00'}
                      </div>
                    </div>
                    {formData.anuncianteId === a.id && (
                      <CheckCircle size={24} style={{ color: '#3B82F6' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Configuração */}
        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Configuração do Anúncio</h2>
            
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Título interno do anúncio *</label>
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
                <label style={{ display: 'block', marginBottom: 12 }}>Tipo de Anúncio *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {tiposAnuncio.map((tipo) => (
                    <div
                      key={tipo.value}
                      onClick={() => handleChange('tipo', tipo.value)}
                      style={{
                        padding: 16,
                        background: formData.tipo === tipo.value ? '#3B82F620' : '#0B0F1A',
                        border: `2px solid ${formData.tipo === tipo.value ? '#3B82F6' : '#1F2937'}`,
                        borderRadius: 12,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{tipo.label}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{tipo.dimensoes}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{tipo.descricao}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 12 }}>Modelo de Cobrança *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {modelosCobranca.map((modelo) => (
                    <div
                      key={modelo.value}
                      onClick={() => handleChange('modeloCobranca', modelo.value)}
                      style={{
                        padding: 16,
                        background: formData.modeloCobranca === modelo.value ? '#10B98120' : '#0B0F1A',
                        border: `2px solid ${formData.modeloCobranca === modelo.value ? '#10B981' : '#1F2937'}`,
                        borderRadius: 12,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{modelo.label}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{modelo.descricao}</div>
                      <div style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>{modelo.exemplo}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Valor da Cobrança *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valorCobranca}
                      onChange={(e) => handleChange('valorCobranca', e.target.value)}
                      placeholder="25,00"
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        background: '#0B0F1A',
                        border: '1px solid #1F2937',
                        borderRadius: 8,
                        color: '#F9FAFB',
                        fontSize: 14
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Orçamento Total (opcional)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.orcamentoTotal}
                      onChange={(e) => handleChange('orcamentoTotal', e.target.value)}
                      placeholder="1000,00"
                      style={{
                        width: '100%',
                        padding: '12px 12px 12px 40px',
                        background: '#0B0F1A',
                        border: '1px solid #1F2937',
                        borderRadius: 8,
                        color: '#F9FAFB',
                        fontSize: 14
                      }}
                    />
                  </div>
                  <small style={{ color: '#6B7280' }}>Quando atingir, o anúncio pausa automaticamente</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Data de Início *</label>
                  <input
                    type="datetime-local"
                    value={formData.dataInicio}
                    onChange={(e) => handleChange('dataInicio', e.target.value)}
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
                  <label style={{ display: 'block', marginBottom: 8 }}>Data de Término *</label>
                  <input
                    type="datetime-local"
                    value={formData.dataFim}
                    onChange={(e) => handleChange('dataFim', e.target.value)}
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
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Criativo */}
        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Criativo do Anúncio</h2>
            
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>URL da Imagem Desktop *</label>
                  <input
                    type="url"
                    value={formData.imagemUrl}
                    onChange={(e) => handleChange('imagemUrl', e.target.value)}
                    placeholder="https://..."
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
                  <label style={{ display: 'block', marginBottom: 8 }}>URL da Imagem Mobile (opcional)</label>
                  <input
                    type="url"
                    value={formData.imagemMobileUrl}
                    onChange={(e) => handleChange('imagemMobileUrl', e.target.value)}
                    placeholder="https://..."
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
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Título do Anúncio *</label>
                <input
                  type="text"
                  value={formData.tituloAnuncio}
                  onChange={(e) => handleChange('tituloAnuncio', e.target.value)}
                  placeholder="Ex: 50% OFF em Serviços de Limpeza"
                  maxLength={60}
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
                <small style={{ color: '#6B7280' }}>{formData.tituloAnuncio.length}/60 caracteres</small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Texto do Anúncio</label>
                <textarea
                  value={formData.textoAnuncio}
                  onChange={(e) => handleChange('textoAnuncio', e.target.value)}
                  placeholder="Descrição breve do anúncio..."
                  rows={3}
                  maxLength={150}
                  style={{
                    width: '100%',
                    padding: 12,
                    background: '#0B0F1A',
                    border: '1px solid #1F2937',
                    borderRadius: 8,
                    color: '#F9FAFB',
                    fontSize: 14,
                    resize: 'vertical'
                  }}
                />
                <small style={{ color: '#6B7280' }}>{formData.textoAnuncio.length}/150 caracteres</small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Texto do Botão *</label>
                  <input
                    type="text"
                    value={formData.ctaTexto}
                    onChange={(e) => handleChange('ctaTexto', e.target.value)}
                    placeholder="Saiba mais"
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
                  <label style={{ display: 'block', marginBottom: 8 }}>Link de Destino *</label>
                  <input
                    type="url"
                    value={formData.ctaLink}
                    onChange={(e) => handleChange('ctaLink', e.target.value)}
                    placeholder="https://exemplo.com/oferta"
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Cor Primária</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={formData.corPrimaria}
                      onChange={(e) => handleChange('corPrimaria', e.target.value)}
                      style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={formData.corPrimaria}
                      onChange={(e) => handleChange('corPrimaria', e.target.value)}
                      style={{
                        flex: 1,
                        padding: 12,
                        background: '#0B0F1A',
                        border: '1px solid #1F2937',
                        borderRadius: 8,
                        color: '#F9FAFB',
                        fontSize: 14
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Cor Secundária</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={formData.corSecundaria}
                      onChange={(e) => handleChange('corSecundaria', e.target.value)}
                      style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={formData.corSecundaria}
                      onChange={(e) => handleChange('corSecundaria', e.target.value)}
                      style={{
                        flex: 1,
                        padding: 12,
                        background: '#0B0F1A',
                        border: '1px solid #1F2937',
                        borderRadius: 8,
                        color: '#F9FAFB',
                        fontSize: 14
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {formData.imagemUrl && (
                <div style={{ marginTop: 24, padding: 20, background: '#0B0F1A', borderRadius: 12 }}>
                  <label style={{ display: 'block', marginBottom: 12 }}>Preview</label>
                  <div style={{ 
                    border: '2px solid #1F2937', 
                    borderRadius: 8, 
                    overflow: 'hidden',
                    maxWidth: formData.tipo === 'banner_superior' ? 728 : formData.tipo === 'banner_lateral' ? 300 : 400
                  }}>
                    <img 
                      src={formData.imagemUrl} 
                      alt="Preview" 
                      style={{ width: '100%', display: 'block' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Segmentação */}
        {step === 4 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Segmentação do Público</h2>
            
            <div style={{ display: 'grid', gap: 24 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.segmentacao.todos}
                    onChange={(e) => handleSegmentacaoChange('todos', e.target.checked)}
                    style={{ width: 20, height: 20 }}
                  />
                  <span style={{ fontSize: 16 }}>Exibir para todos os usuários</span>
                </label>
              </div>

              {!formData.segmentacao.todos && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: 12 }}>Perfis de Usuário</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {['cliente', 'profissional'].map((perfil) => (
                        <label 
                          key={perfil}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            padding: '12px 16px',
                            background: formData.segmentacao.perfis.includes(perfil as any) ? '#3B82F620' : '#0B0F1A',
                            border: `2px solid ${formData.segmentacao.perfis.includes(perfil as any) ? '#3B82F6' : '#1F2937'}`,
                            borderRadius: 8,
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.segmentacao.perfis.includes(perfil as any)}
                            onChange={(e) => {
                              const newPerfis = e.target.checked
                                ? [...formData.segmentacao.perfis, perfil]
                                : formData.segmentacao.perfis.filter(p => p !== perfil);
                              handleSegmentacaoChange('perfis', newPerfis);
                            }}
                            style={{ display: 'none' }}
                          />
                          <span style={{ textTransform: 'capitalize' }}>{perfil}s</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 12 }}>Dispositivos</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[
                        { value: 'web', label: 'Web' },
                        { value: 'mobile', label: 'Mobile App' },
                        { value: 'desktop', label: 'Desktop App' }
                      ].map((device) => (
                        <label 
                          key={device.value}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            padding: '12px 16px',
                            background: formData.segmentacao.dispositivos.includes(device.value as any) ? '#3B82F620' : '#0B0F1A',
                            border: `2px solid ${formData.segmentacao.dispositivos.includes(device.value as any) ? '#3B82F6' : '#1F2937'}`,
                            borderRadius: 8,
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.segmentacao.dispositivos.includes(device.value as any)}
                            onChange={(e) => {
                              const newDevices = e.target.checked
                                ? [...formData.segmentacao.dispositivos, device.value]
                                : formData.segmentacao.dispositivos.filter(d => d !== device.value);
                              handleSegmentacaoChange('dispositivos', newDevices);
                            }}
                            style={{ display: 'none' }}
                          />
                          <span>{device.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Revisão */}
        {step === 5 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Revisão e Confirmação</h2>
            
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ padding: 20, background: '#0B0F1A', borderRadius: 12 }}>
                <h3 style={{ marginBottom: 16, fontSize: 16 }}>Resumo do Anúncio</h3>
                
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Anunciante:</span>
                    <span>{anunciantes.find(a => a.id === formData.anuncianteId)?.nomeFantasia}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Título:</span>
                    <span>{formData.titulo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Tipo:</span>
                    <span>{tiposAnuncio.find(t => t.value === formData.tipo)?.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Modelo:</span>
                    <span>{modelosCobranca.find(m => m.value === formData.modeloCobranca)?.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Valor:</span>
                    <span>R$ {formData.valorCobranca}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Período:</span>
                    <span>{new Date(formData.dataInicio).toLocaleString()} até {new Date(formData.dataFim).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {formData.imagemUrl && (
                <div style={{ padding: 20, background: '#0B0F1A', borderRadius: 12 }}>
                  <h3 style={{ marginBottom: 16, fontSize: 16 }}>Preview do Criativo</h3>
                  <div style={{ border: '2px solid #1F2937', borderRadius: 8, overflow: 'hidden', maxWidth: 400 }}>
                    <img src={formData.imagemUrl} alt="Preview" style={{ width: '100%', display: 'block' }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <strong>{formData.tituloAnuncio}</strong>
                    <p style={{ color: '#9CA3AF', fontSize: 14 }}>{formData.textoAnuncio}</p>
                    <button style={{ marginTop: 8, padding: '8px 16px', background: formData.corPrimaria, color: '#FFF', border: 'none', borderRadius: 4 }}>
                      {formData.ctaTexto}
                    </button>
                  </div>
                </div>
              )}
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
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="btn-secondary"
            style={{ opacity: step === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={18} />
            Anterior
          </button>
          
          {step < 5 ? (
            <button
              onClick={() => {
                // Validação antes de avançar
                if (step === 1 && !formData.anuncianteId) {
                  alert('Por favor, selecione um anunciante para continuar.');
                  return;
                }
                if (step === 2 && (!formData.titulo || !formData.valorCobranca || !formData.dataInicio || !formData.dataFim)) {
                  alert('Por favor, preencha todos os campos obrigatórios: Título, Valor, Data Início e Data Fim.');
                  return;
                }
                if (step === 3 && (!formData.imagemUrl || !formData.tituloAnuncio || !formData.ctaLink)) {
                  alert('Por favor, complete o criativo: Imagem, Título do Anúncio e Link de Destino.');
                  return;
                }
                setStep(step + 1);
              }}
              className="btn-primary"
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={salvar}
              disabled={loading}
              className="btn-primary"
              style={{ minWidth: 150 }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Salvando...</>
              ) : (
                <><CheckCircle size={18} /> Criar Anúncio</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
