'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import '@/styles/admin-financeiro.css';

export default function DiagnosticoAdminPage() {
  const { user, dadosUsuario, ehAdmin, loading } = useAuth();
  const [firestoreData, setFirestoreData] = useState<any>(null);
  const [testePermissao, setTestePermissao] = useState<string>('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const verificarPermissoes = async () => {
      if (!user?.uid) return;

      try {
        // Buscar dados do Firestore
        const userRef = doc(db, 'usuarios', user.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          setFirestoreData(snap.data());
        }

        // Testar permissão na coleção activityLogs
        try {
          const { collection, query, limit, getDocs } = await import('firebase/firestore');
          const q = query(collection(db, 'activityLogs'), limit(1));
          await getDocs(q);
          setTestePermissao('sucesso');
        } catch (err: any) {
          setTestePermissao(err.message);
        }
      } finally {
        setCarregando(false);
      }
    };

    verificarPermissoes();
  }, [user]);

  if (loading || carregando) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  const camposAdmin = [
    { nome: 'isAdmin', valor: firestoreData?.isAdmin, tipo: 'boolean' },
    { nome: 'perfil', valor: firestoreData?.perfil, tipo: 'string' },
    { nome: 'tipo', valor: firestoreData?.tipo, tipo: 'string' },
    { nome: 'role', valor: firestoreData?.role, tipo: 'string' },
  ];

  const isAdminPorCampo = 
    firestoreData?.isAdmin === true ||
    firestoreData?.perfil === 'admin' ||
    firestoreData?.tipo === 'admin' ||
    firestoreData?.role === 'admin';

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <Shield size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Diagnóstico de Permissões
          </h1>
          <p className="admin-subtitle">Verificação de acesso administrativo</p>
        </div>
      </div>

      {/* Status do Auth Context */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className={`kpi-card ${ehAdmin ? 'success' : 'danger'}`}>
          <div className="kpi-icon">
            {ehAdmin ? <CheckCircle size={24} /> : <XCircle size={24} />}
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Auth Context</span>
            <span className="kpi-value">{ehAdmin ? 'É Admin' : 'NÃO é Admin'}</span>
          </div>
        </div>

        <div className={`kpi-card ${isAdminPorCampo ? 'success' : 'warning'}`}>
          <div className="kpi-icon">
            {isAdminPorCampo ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Firestore</span>
            <span className="kpi-value">{isAdminPorCampo ? 'Campos OK' : 'Falta Campo'}</span>
          </div>
        </div>

        <div className={`kpi-card ${testePermissao === 'sucesso' ? 'success' : 'danger'}`}>
          <div className="kpi-icon">
            {testePermissao === 'sucesso' ? <CheckCircle size={24} /> : <XCircle size={24} />}
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Teste Leitura</span>
            <span className="kpi-value">{testePermissao === 'sucesso' ? 'OK' : 'Erro'}</span>
          </div>
        </div>
      </div>

      {/* Info do Usuário */}
      <div className="data-table-container" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>👤 Informações do Usuário</h3>
        </div>
        <div style={{ padding: 20 }}>
          <p><strong>UID:</strong> <code style={{ background: '#0B0F1A', padding: '4px 8px', borderRadius: 4 }}>{user?.uid}</code></p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Nome:</strong> {dadosUsuario?.nome || 'N/A'}</p>
        </div>
      </div>

      {/* Campos de Admin */}
      <div className="data-table-container" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>🔑 Campos de Admin no Firestore</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Valor Atual</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {camposAdmin.map((campo) => (
              <tr key={campo.nome}>
                <td><code>{campo.nome}</code></td>
                <td>{campo.valor === undefined ? '<não definido>' : String(campo.valor)}</td>
                <td>
                  {(campo.nome === 'isAdmin' && campo.valor === true) ||
                   (campo.nome !== 'isAdmin' && campo.valor === 'admin') ? (
                    <span className="badge badge-green">✅ Válido</span>
                  ) : campo.valor !== undefined ? (
                    <span className="badge badge-yellow">⚠️ Não reconhecido</span>
                  ) : (
                    <span className="badge badge-gray">❌ Ausente</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solução */}
      {!isAdminPorCampo && (
        <div style={{
          padding: 20,
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 12,
          marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#F59E0B' }}>
            <AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Como corrigir
          </h3>
          <p style={{ margin: '0 0 8px 0' }}>Para se tornar admin, adicione um destes campos ao seu documento no Firestore:</p>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li><code>isAdmin: true</code> (tipo boolean)</li>
            <li><code>perfil: "admin"</code> (tipo string)</li>
            <li><code>tipo: "admin"</code> (tipo string)</li>
          </ul>
          <p style={{ margin: '12px 0 0 0', fontSize: 14 }}>
            <strong>Caminho:</strong> Firestore Database → usuarios → {user?.uid}
          </p>
        </div>
      )}

      {testePermissao !== 'sucesso' && (
        <div style={{
          padding: 20,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 12
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#EF4444' }}>
            <XCircle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Erro de Permissão
          </h3>
          <p style={{ margin: 0 }}><strong>Mensagem:</strong> {testePermissao}</p>
          <p style={{ margin: '12px 0 0 0', fontSize: 14 }}>
            As regras de segurança do Firestore precisam ser atualizadas. 
            Execute <code>firebase deploy --only firestore:rules</code> ou atualize manualmente no console.
          </p>
        </div>
      )}
    </div>
  );
}
