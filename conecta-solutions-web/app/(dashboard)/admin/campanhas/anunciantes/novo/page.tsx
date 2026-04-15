'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Plus
} from 'lucide-react';
import '@/styles/admin-campanhas.css';
import { criarAnunciante } from '@/lib/anuncioService';

export default function NovoAnunciantePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Empresa
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    
    // Endereço
    endereco: {
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    
    // Contato
    contatoNome: '',
    contatoEmail: '',
    contatoTelefone: '',
    
    // Dados bancários (opcional)
    dadosBancarios: {
      banco: '',
      agencia: '',
      conta: '',
      tipo: 'corrente' as 'corrente' | 'poupanca',
      titular: ''
    },
    
    // Crédito inicial
    saldoInicial: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEnderecoChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, [field]: value }
    }));
  };

  const handleBancoChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dadosBancarios: { ...prev.dadosBancarios, [field]: value }
    }));
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const salvar = async () => {
    setLoading(true);
    try {
      const anuncianteData: any = {
        razaoSocial: formData.razaoSocial,
        nomeFantasia: formData.nomeFantasia,
        cnpj: formData.cnpj,
        email: formData.email,
        telefone: formData.telefone,
        contatoNome: formData.contatoNome,
        contatoEmail: formData.contatoEmail,
        contatoTelefone: formData.contatoTelefone,
        saldoCreditos: parseFloat(formData.saldoInicial) || 0,
        totalGasto: 0,
        totalFaturado: 0,
        status: 'ativo' as const
      };
      
      // Adicionar campos opcionais apenas se preenchidos
      if (formData.endereco.rua) {
        anuncianteData.endereco = formData.endereco;
      }
      if (formData.dadosBancarios.banco) {
        anuncianteData.dadosBancarios = formData.dadosBancarios;
      }

      await criarAnunciante(anuncianteData);
      alert('Anunciante cadastrado com sucesso!');
      router.push('/admin/campanhas/anunciantes');
    } catch (err: any) {
      console.error('Erro ao criar anunciante:', err);
      const errorMessage = err?.message || err?.code || 'Erro desconhecido';
      alert(`Erro ao cadastrar anunciante: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'Empresa', icon: Building2 },
    { number: 2, label: 'Endereço', icon: MapPin },
    { number: 3, label: 'Contato', icon: User },
    { number: 4, label: 'Financeiro', icon: CreditCard },
    { number: 5, label: 'Revisão', icon: CheckCircle }
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <Building2 size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Novo Anunciante
          </h1>
          <p className="admin-subtitle">Cadastre uma nova empresa parceira</p>
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
        {/* STEP 1: Empresa */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Dados da Empresa</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Razão Social *</label>
                <input
                  type="text"
                  value={formData.razaoSocial}
                  onChange={(e) => handleChange('razaoSocial', e.target.value)}
                  placeholder="Ex: Empresa XYZ Ltda"
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
                <label style={{ display: 'block', marginBottom: 8 }}>Nome Fantasia *</label>
                <input
                  type="text"
                  value={formData.nomeFantasia}
                  onChange={(e) => handleChange('nomeFantasia', e.target.value)}
                  placeholder="Ex: XYZ Marketing"
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
                <label style={{ display: 'block', marginBottom: 8 }}>CNPJ *</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="empresa@exemplo.com"
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
                  <label style={{ display: 'block', marginBottom: 8 }}>Telefone *</label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => handleChange('telefone', formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
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

        {/* STEP 2: Endereço */}
        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Endereço (Opcional)</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Rua</label>
                <input
                  type="text"
                  value={formData.endereco.rua}
                  onChange={(e) => handleEnderecoChange('rua', e.target.value)}
                  placeholder="Av. Exemplo"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Número</label>
                  <input
                    type="text"
                    value={formData.endereco.numero}
                    onChange={(e) => handleEnderecoChange('numero', e.target.value)}
                    placeholder="123"
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
                  <label style={{ display: 'block', marginBottom: 8 }}>Complemento</label>
                  <input
                    type="text"
                    value={formData.endereco.complemento}
                    onChange={(e) => handleEnderecoChange('complemento', e.target.value)}
                    placeholder="Sala 456"
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
                <label style={{ display: 'block', marginBottom: 8 }}>Bairro</label>
                <input
                  type="text"
                  value={formData.endereco.bairro}
                  onChange={(e) => handleEnderecoChange('bairro', e.target.value)}
                  placeholder="Centro"
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

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Cidade</label>
                  <input
                    type="text"
                    value={formData.endereco.cidade}
                    onChange={(e) => handleEnderecoChange('cidade', e.target.value)}
                    placeholder="São Paulo"
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
                  <label style={{ display: 'block', marginBottom: 8 }}>Estado</label>
                  <input
                    type="text"
                    value={formData.endereco.estado}
                    onChange={(e) => handleEnderecoChange('estado', e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: '#0B0F1A',
                      border: '1px solid #1F2937',
                      borderRadius: 8,
                      color: '#F9FAFB',
                      fontSize: 14,
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>CEP</label>
                  <input
                    type="text"
                    value={formData.endereco.cep}
                    onChange={(e) => handleEnderecoChange('cep', e.target.value.replace(/\D/g, ''))}
                    placeholder="00000-000"
                    maxLength={8}
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

        {/* STEP 3: Contato */}
        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Contato Principal</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Nome do Responsável *</label>
                <input
                  type="text"
                  value={formData.contatoNome}
                  onChange={(e) => handleChange('contatoNome', e.target.value)}
                  placeholder="João Silva"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8 }}>Email do Responsável *</label>
                  <input
                    type="email"
                    value={formData.contatoEmail}
                    onChange={(e) => handleChange('contatoEmail', e.target.value)}
                    placeholder="joao@empresa.com"
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
                  <label style={{ display: 'block', marginBottom: 8 }}>Telefone do Responsável *</label>
                  <input
                    type="tel"
                    value={formData.contatoTelefone}
                    onChange={(e) => handleChange('contatoTelefone', formatPhone(e.target.value))}
                    placeholder="(11) 98888-8888"
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

        {/* STEP 4: Financeiro */}
        {step === 4 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Dados Financeiros</h2>
            
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>Crédito Inicial</h3>
              <div>
                <label style={{ display: 'block', marginBottom: 8 }}>Saldo de Créditos Inicial (Opcional)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.saldoInicial}
                    onChange={(e) => handleChange('saldoInicial', e.target.value)}
                    placeholder="0,00"
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
                <small style={{ color: '#6B7280' }}>Créditos para o anunciante começar a veicular</small>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>Dados Bancários (Opcional)</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>Banco</label>
                    <input
                      type="text"
                      value={formData.dadosBancarios.banco}
                      onChange={(e) => handleBancoChange('banco', e.target.value)}
                      placeholder="Itaú"
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
                    <label style={{ display: 'block', marginBottom: 8 }}>Tipo de Conta</label>
                    <select
                      value={formData.dadosBancarios.tipo}
                      onChange={(e) => handleBancoChange('tipo', e.target.value)}
                      style={{
                        width: '100%',
                        padding: 12,
                        background: '#0B0F1A',
                        border: '1px solid #1F2937',
                        borderRadius: 8,
                        color: '#F9FAFB',
                        fontSize: 14
                      }}
                    >
                      <option value="corrente">Corrente</option>
                      <option value="poupanca">Poupança</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8 }}>Agência</label>
                    <input
                      type="text"
                      value={formData.dadosBancarios.agencia}
                      onChange={(e) => handleBancoChange('agencia', e.target.value)}
                      placeholder="0000"
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
                    <label style={{ display: 'block', marginBottom: 8 }}>Conta</label>
                    <input
                      type="text"
                      value={formData.dadosBancarios.conta}
                      onChange={(e) => handleBancoChange('conta', e.target.value)}
                      placeholder="00000-0"
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
                  <label style={{ display: 'block', marginBottom: 8 }}>Titular da Conta</label>
                  <input
                    type="text"
                    value={formData.dadosBancarios.titular}
                    onChange={(e) => handleBancoChange('titular', e.target.value)}
                    placeholder="Nome igual no banco"
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

        {/* STEP 5: Revisão */}
        {step === 5 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Revisão e Confirmação</h2>
            
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ padding: 20, background: '#0B0F1A', borderRadius: 12 }}>
                <h3 style={{ marginBottom: 16, fontSize: 16 }}>Dados da Empresa</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Razão Social:</span>
                    <span>{formData.razaoSocial}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Nome Fantasia:</span>
                    <span>{formData.nomeFantasia}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>CNPJ:</span>
                    <span>{formData.cnpj}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: 20, background: '#0B0F1A', borderRadius: 12 }}>
                <h3 style={{ marginBottom: 16, fontSize: 16 }}>Contato</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Responsável:</span>
                    <span>{formData.contatoNome}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Email:</span>
                    <span>{formData.contatoEmail}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9CA3AF' }}>Telefone:</span>
                    <span>{formData.contatoTelefone}</span>
                  </div>
                </div>
              </div>

              {formData.saldoInicial && (
                <div style={{ padding: 20, background: '#0B0F1A', borderRadius: 12 }}>
                  <h3 style={{ marginBottom: 16, fontSize: 16 }}>Crédito Inicial</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#9CA3AF' }}>Saldo:</span>
                    <span style={{ color: '#10B981', fontWeight: 600, fontSize: 18 }}>
                      R$ {parseFloat(formData.saldoInicial).toFixed(2)}
                    </span>
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
              onClick={() => setStep(step + 1)}
              className="btn-primary"
              disabled={
                (step === 1 && (!formData.razaoSocial || !formData.nomeFantasia || !formData.cnpj)) ||
                (step === 3 && (!formData.contatoNome || !formData.contatoEmail || !formData.contatoTelefone))
              }
            >
              Próximo
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={salvar}
              disabled={loading}
              className="btn-primary"
              style={{ minWidth: 180 }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Salvando...</>
              ) : (
                <><CheckCircle size={18} /> Cadastrar Anunciante</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
