'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  FirestoreError
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  Target,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import '@/styles/admin-campanhas.css';

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
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
