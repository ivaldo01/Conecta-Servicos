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
  deleteDoc
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
  Target
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

  useEffect(() => {
    const q = query(collection(db, 'campanhas'), orderBy('criadaEm', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Campanha[];
      setCampanhas(data);
    });
    return () => unsubscribe();
  }, []);

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
