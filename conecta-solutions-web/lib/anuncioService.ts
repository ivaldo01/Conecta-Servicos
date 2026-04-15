import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  limit,
  QueryConstraint,
  increment
} from 'firebase/firestore';

// ============================================================
// TIPOS - Anúncios e Anunciantes
// ============================================================

export type TipoAnuncio = 'banner_superior' | 'banner_lateral' | 'card' | 'banner_full' | 'modal' | 'push' | 'story';
export type ModeloCobranca = 'cpm' | 'cpc' | 'cpa' | 'pacote_fixo';
export type StatusAnuncio = 'rascunho' | 'pendente' | 'ativo' | 'pausado' | 'expirado' | 'reprovado';
export type StatusAnunciante = 'ativo' | 'inadimplente' | 'bloqueado' | 'pendente';

export interface Anuncio {
  id?: string;
  anuncianteId: string;
  titulo: string;
  descricao?: string;
  tipo: TipoAnuncio;
  modeloCobranca: ModeloCobranca;
  valorCobranca: number; // Valor por CPM/CPC/CPA ou valor do pacote
  orcamentoTotal?: number; // Limite de gasto
  orcamentoGasto: number;
  dataInicio: Timestamp | Date;
  dataFim: Timestamp | Date;
  status: StatusAnuncio;
  
  // Criativo
  imagemUrl: string;
  imagemMobileUrl?: string;
  tituloAnuncio: string;
  textoAnuncio: string;
  ctaTexto: string; // Texto do botão (ex: "Saiba mais", "Comprar agora")
  ctaLink: string;
  corPrimaria?: string;
  corSecundaria?: string;
  
  // Segmentação
  segmentacao: {
    todos: boolean;
    perfis?: ('cliente' | 'profissional')[];
    cidades?: string[];
    categorias?: string[]; // Categorias de serviço
    dispositivos?: ('web' | 'mobile' | 'desktop')[];
    planos?: string[]; // Planos de assinatura
  };
  
  // Métricas
  metricas: {
    impressoes: number;
    cliques: number;
    conversoes: number;
    ctr: number; // % cliques/impressões
    cpmMedio: number;
    cpcMedio: number;
    gastoTotal: number;
  };
  
  // Agendamento
  agendado: boolean;
  horarioExibicao?: {
    inicio: string; // HH:mm
    fim: string;
  };
  diasSemana?: number[]; // 0-6 (dom-sáb)
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Anunciante {
  id?: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  
  // Contato principal
  contatoNome: string;
  contatoEmail: string;
  contatoTelefone: string;
  
  // Dados bancários (para reembolso)
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    tipo: 'corrente' | 'poupanca';
    titular: string;
  };
  
  // Créditos e faturamento
  saldoCreditos: number;
  totalGasto: number;
  totalFaturado: number;
  
  // Status
  status: StatusAnunciante;
  
  // Documentação
  documentos?: {
    contratoSocial?: string;
    comprovanteEndereco?: string;
  };
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ImpressaoAnuncio {
  id?: string;
  anuncioId: string;
  anuncianteId: string;
  userId?: string;
  userTipo?: 'cliente' | 'profissional';
  timestamp: Timestamp;
  device: 'web' | 'mobile' | 'desktop';
  pagina: string;
  localizacao?: {
    cidade?: string;
    estado?: string;
  };
  custo: number; // Custo dessa impressão (CPM/1000)
}

export interface CliqueAnuncio {
  id?: string;
  anuncioId: string;
  anuncianteId: string;
  impressaoId?: string;
  userId?: string;
  timestamp: Timestamp;
  device: 'web' | 'mobile' | 'desktop';
  pagina: string;
  custo: number; // Custo do clique
  converteu: boolean; // Se houve conversão
  valorConversao?: number; // Valor da conversão
}

// ============================================================
// ANUNCIANTES - CRUD
// ============================================================

const anunciantesRef = collection(db, 'anunciantes');

export async function criarAnunciante(data: Omit<Anunciante, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    console.log('Criando anunciante com dados:', data);
    const docRef = await addDoc(anunciantesRef, {
      ...data,
      saldoCreditos: data.saldoCreditos || 0,
      totalGasto: 0,
      totalFaturado: 0,
      status: data.status || 'pendente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Anunciante criado com ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('Erro detalhado ao criar anunciante:', error);
    console.error('Código do erro:', error.code);
    console.error('Mensagem:', error.message);
    throw error;
  }
}

export async function atualizarAnunciante(id: string, data: Partial<Anunciante>): Promise<void> {
  const docRef = doc(db, 'anunciantes', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function excluirAnunciante(id: string): Promise<void> {
  await deleteDoc(doc(db, 'anunciantes', id));
}

export async function getAnunciante(id: string): Promise<Anunciante | null> {
  const docRef = doc(db, 'anunciantes', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Anunciante;
}

export async function listarAnunciantes(filtro?: { status?: StatusAnunciante }): Promise<Anunciante[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  
  if (filtro?.status) {
    constraints.push(where('status', '==', filtro.status));
  }
  
  const q = query(anunciantesRef, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Anunciante);
}

export function subscribeAnunciantes(callback: (anunciantes: Anunciante[]) => void) {
  const q = query(anunciantesRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Anunciante);
    callback(data);
  });
}

// ============================================================
// ANUNCIOS - CRUD
// ============================================================

const anunciosRef = collection(db, 'anuncios');

export async function criarAnuncio(data: Omit<Anuncio, 'id' | 'createdAt' | 'updatedAt' | 'metricas' | 'orcamentoGasto'>): Promise<string> {
  const docRef = await addDoc(anunciosRef, {
    ...data,
    orcamentoGasto: 0,
    status: data.status || 'rascunho',
    metricas: {
      impressoes: 0,
      cliques: 0,
      conversoes: 0,
      ctr: 0,
      cpmMedio: 0,
      cpcMedio: 0,
      gastoTotal: 0
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function atualizarAnuncio(id: string, data: Partial<Anuncio>): Promise<void> {
  const docRef = doc(db, 'anuncios', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function excluirAnuncio(id: string): Promise<void> {
  await deleteDoc(doc(db, 'anuncios', id));
}

export async function getAnuncio(id: string): Promise<Anuncio | null> {
  const docRef = doc(db, 'anuncios', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Anuncio;
}

export async function listarAnuncios(filtros?: {
  status?: StatusAnuncio;
  anuncianteId?: string;
  tipo?: TipoAnuncio;
}): Promise<Anuncio[]> {
  const constraints: QueryConstraint[] = [];
  
  if (filtros?.status) {
    constraints.push(where('status', '==', filtros.status));
  }
  if (filtros?.anuncianteId) {
    constraints.push(where('anuncianteId', '==', filtros.anuncianteId));
  }
  if (filtros?.tipo) {
    constraints.push(where('tipo', '==', filtros.tipo));
  }
  
  constraints.push(orderBy('createdAt', 'desc'));
  
  const q = query(anunciosRef, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Anuncio);
}

export function subscribeAnuncios(callback: (anuncios: Anuncio[]) => void, filtros?: {
  status?: StatusAnuncio;
  anuncianteId?: string;
}) {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  
  if (filtros?.status) {
    constraints.unshift(where('status', '==', filtros.status));
  }
  if (filtros?.anuncianteId) {
    constraints.unshift(where('anuncianteId', '==', filtros.anuncianteId));
  }
  
  const q = query(anunciosRef, ...constraints);
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Anuncio);
    callback(data);
  });
}

// ============================================================
// ANUNCIOS ATIVOS - Para exibição no app
// ============================================================

export async function getAnunciosAtivos(tipo: TipoAnuncio, userContext?: {
  perfil?: 'cliente' | 'profissional';
  cidade?: string;
  categoria?: string;
  device?: 'web' | 'mobile' | 'desktop';
  plano?: string;
}): Promise<Anuncio[]> {
  const now = Timestamp.now();
  
  const constraints: QueryConstraint[] = [
    where('status', '==', 'ativo'),
    where('tipo', '==', tipo),
    where('dataInicio', '<=', now),
    where('dataFim', '>=', now),
    limit(10)
  ];
  
  const q = query(anunciosRef, ...constraints);
  const snap = await getDocs(q);
  
  let anuncios = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Anuncio);
  
  // Filtrar por segmentação no cliente (Firestore não suporta queries complexas de array)
  if (userContext) {
    anuncios = anuncios.filter(anuncio => {
      const seg = anuncio.segmentacao;
      
      // Se segmentação é "todos", incluir
      if (seg.todos) return true;
      
      // Verificar perfil
      if (userContext.perfil && seg.perfis && !seg.perfis.includes(userContext.perfil)) {
        return false;
      }
      
      // Verificar cidade
      if (userContext.cidade && seg.cidades && !seg.cidades.includes(userContext.cidade)) {
        return false;
      }
      
      // Verificar dispositivo
      if (userContext.device && seg.dispositivos && !seg.dispositivos.includes(userContext.device)) {
        return false;
      }
      
      return true;
    });
  }
  
  return anuncios;
}

// ============================================================
// TRACKING - Impressões e Cliques
// ============================================================

const impressoesRef = collection(db, 'impressoesAnuncios');
const cliquesRef = collection(db, 'cliquesAnuncios');

export async function registrarImpressao(
  anuncioId: string,
  anuncianteId: string,
  data: Omit<ImpressaoAnuncio, 'id' | 'anuncioId' | 'anuncianteId' | 'timestamp'>
): Promise<void> {
  // Registrar impressão
  await addDoc(impressoesRef, {
    anuncioId,
    anuncianteId,
    ...data,
    timestamp: serverTimestamp()
  });
  
  // Atualizar métricas do anúncio
  const anuncioRef = doc(db, 'anuncios', anuncioId);
  const anuncioSnap = await getDoc(anuncioRef);
  
  if (anuncioSnap.exists()) {
    const anuncio = anuncioSnap.data() as Anuncio;
    const metricas = anuncio.metricas;
    const modelo = anuncio.modeloCobranca;
    const valorCobranca = anuncio.valorCobranca;
    
    // Calcular custo
    let custoImpressao = 0;
    if (modelo === 'cpm') {
      custoImpressao = valorCobranca / 1000; // CPM = custo por 1000 impressões
    }
    
    const novoOrcamentoGasto = (anuncio.orcamentoGasto || 0) + custoImpressao;
    const novasImpressoes = metricas.impressoes + 1;
    const novoCpmMedio = novoOrcamentoGasto / (novasImpressoes / 1000);
    
    await updateDoc(anuncioRef, {
      'metricas.impressoes': novasImpressoes,
      'metricas.cpmMedio': novoCpmMedio,
      'metricas.gastoTotal': novoOrcamentoGasto,
      orcamentoGasto: novoOrcamentoGasto,
      // Se atingiu orçamento, pausar
      status: anuncio.orcamentoTotal && novoOrcamentoGasto >= anuncio.orcamentoTotal ? 'pausado' : anuncio.status,
      updatedAt: serverTimestamp()
    });
    
    // Atualizar saldo do anunciante
    const anuncianteRef = doc(db, 'anunciantes', anuncianteId);
    await updateDoc(anuncianteRef, {
      saldoCreditos: increment(-custoImpressao),
      totalGasto: increment(custoImpressao),
      updatedAt: serverTimestamp()
    });
  }
}

export async function registrarClique(
  anuncioId: string,
  anuncianteId: string,
  impressaoId: string | undefined,
  data: Omit<CliqueAnuncio, 'id' | 'anuncioId' | 'anuncianteId' | 'impressaoId' | 'timestamp'>
): Promise<void> {
  // Registrar clique
  await addDoc(cliquesRef, {
    anuncioId,
    anuncianteId,
    impressaoId,
    ...data,
    timestamp: serverTimestamp()
  });
  
  // Atualizar métricas do anúncio
  const anuncioRef = doc(db, 'anuncios', anuncioId);
  const anuncioSnap = await getDoc(anuncioRef);
  
  if (anuncioSnap.exists()) {
    const anuncio = anuncioSnap.data() as Anuncio;
    const metricas = anuncio.metricas;
    const modelo = anuncio.modeloCobranca;
    const valorCobranca = anuncio.valorCobranca;
    
    // Calcular custo
    let custoClique = 0;
    if (modelo === 'cpc') {
      custoClique = valorCobranca;
    }
    
    const novoOrcamentoGasto = (anuncio.orcamentoGasto || 0) + custoClique;
    const novosCliques = metricas.cliques + 1;
    const novoCtr = (novosCliques / metricas.impressoes) * 100;
    const novoCpcMedio = novoOrcamentoGasto / novosCliques;
    
    await updateDoc(anuncioRef, {
      'metricas.cliques': novosCliques,
      'metricas.ctr': novoCtr,
      'metricas.cpcMedio': novoCpcMedio,
      'metricas.gastoTotal': novoOrcamentoGasto,
      orcamentoGasto: novoOrcamentoGasto,
      status: anuncio.orcamentoTotal && novoOrcamentoGasto >= anuncio.orcamentoTotal ? 'pausado' : anuncio.status,
      updatedAt: serverTimestamp()
    });
    
    // Atualizar saldo do anunciante
    if (custoClique > 0) {
      const anuncianteRef = doc(db, 'anunciantes', anuncianteId);
      await updateDoc(anuncianteRef, {
        saldoCreditos: increment(-custoClique),
        totalGasto: increment(custoClique),
        updatedAt: serverTimestamp()
      });
    }
  }
}

