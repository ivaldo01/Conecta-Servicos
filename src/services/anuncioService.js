// ============================================================
// SERVIÇO DE ANÚNCIOS - Mobile (React Native)
// Busca anúncios ativos do Firestore e registra métricas
// ============================================================

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  limit,
  orderBy,
  Timestamp,
  increment,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const ANUNCIOS_COLLECTION = 'anuncios';
const IMPRESSOES_COLLECTION = 'impressoesAnuncios';
const CLIQUES_COLLECTION = 'cliquesAnuncios';

// ============================================================
// BUSCAR ANÚNCIOS ATIVOS
// ============================================================
export async function getAnunciosAtivos(tipo = 'banner_superior', contexto = {}) {
  try {
    const agora = Timestamp.now();
    
    // Query base: anúncios ativos do tipo especificado
    let q = query(
      collection(db, ANUNCIOS_COLLECTION),
      where('status', '==', 'ativo'),
      where('tipo', '==', tipo),
      where('dataInicio', '<=', agora),
      where('dataFim', '>=', agora),
      orderBy('prioridade', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(q);
    let anuncios = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filtrar por segmentação do usuário
    if (contexto && anuncios.length > 0) {
      anuncios = anuncios.filter(anuncio => {
        const seg = anuncio.segmentacao || {};
        
        // Se for segmentação "todos", permite
        if (seg.todos) return true;
        
        // Verificar perfil do usuário
        if (contexto.perfil && seg.perfis && seg.perfis.length > 0) {
          if (!seg.perfis.includes(contexto.perfil)) return false;
        }
        
        // Verificar cidade
        if (contexto.cidade && seg.cidades && seg.cidades.length > 0) {
          if (!seg.cidades.includes(contexto.cidade)) return false;
        }
        
        // Verificar categoria
        if (contexto.categoria && seg.categorias && seg.categorias.length > 0) {
          if (!seg.categorias.includes(contexto.categoria)) return false;
        }
        
        // Verificar dispositivo
        if (contexto.device && seg.dispositivos && seg.dispositivos.length > 0) {
          if (!seg.dispositivos.includes(contexto.device)) return false;
        }
        
        // Verificar plano
        if (contexto.plano && seg.planos && seg.planos.length > 0) {
          if (!seg.planos.includes(contexto.plano)) return false;
        }
        
        return true;
      });
    }
    
    // Ordenar por relevância/prioridade aleatória
    return anuncios.sort(() => Math.random() - 0.5);
    
  } catch (error) {
    console.error('[AnuncioService] Erro ao buscar anúncios:', error);
    return [];
  }
}

// ============================================================
// REGISTRAR IMPRESSÃO (VIEW)
// ============================================================
export async function registrarImpressao(anuncioId, anuncianteId, dados = {}) {
  try {
    const impressao = {
      anuncioId,
      anuncianteId,
      userId: dados.userId || null,
      device: dados.device || 'mobile',
      pagina: dados.pagina || 'home',
      custo: dados.custo || 0,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };
    
    // Registrar impressão
    await addDoc(collection(db, IMPRESSOES_COLLECTION), impressao);
    
    // Atualizar métricas do anúncio
    await updateDoc(doc(db, ANUNCIOS_COLLECTION, anuncioId), {
      'metricas.impressoes': increment(1),
      updatedAt: serverTimestamp()
    });
    
    // Atualizar métricas do anunciante
    if (anuncianteId) {
      await updateDoc(doc(db, 'anunciantes', anuncianteId), {
        'metricas.impressoes': increment(1),
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('[AnuncioService] Erro ao registrar impressão:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// REGISTRAR CLIQUE
// ============================================================
export async function registrarClique(anuncioId, anuncianteId, dados = {}) {
  try {
    const clique = {
      anuncioId,
      anuncianteId,
      userId: dados.userId || null,
      device: dados.device || 'mobile',
      pagina: dados.pagina || 'home',
      custo: dados.custo || 0,
      converteu: dados.converteu || false,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };
    
    // Registrar clique
    await addDoc(collection(db, CLIQUES_COLLECTION), clique);
    
    // Atualizar métricas do anúncio
    await updateDoc(doc(db, ANUNCIOS_COLLECTION, anuncioId), {
      'metricas.cliques': increment(1),
      updatedAt: serverTimestamp()
    });
    
    // Atualizar métricas do anunciante
    if (anuncianteId) {
      await updateDoc(doc(db, 'anunciantes', anuncianteId), {
        'metricas.cliques': increment(1),
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('[AnuncioService] Erro ao registrar clique:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// BUSCAR UM ANÚNCIO ALEATÓRIO
// ============================================================
export async function getAnuncioRandom(tipo = 'banner_superior', contexto = {}) {
  try {
    const anuncios = await getAnunciosAtivos(tipo, contexto);
    
    if (anuncios.length === 0) return null;
    
    // Retorna um aleatório
    return anuncios[Math.floor(Math.random() * anuncios.length)];
    
  } catch (error) {
    console.error('[AnuncioService] Erro ao buscar anúncio:', error);
    return null;
  }
}

// ============================================================
// OBTER CONTEXTO DO USUÁRIO PARA SEGMENTAÇÃO
// ============================================================
export function getContextoUsuario(usuario) {
  if (!usuario) return { device: 'mobile' };
  
  return {
    perfil: usuario.tipo || usuario.perfil || 'cliente',
    cidade: usuario.cidade || usuario.endereco?.cidade || null,
    categoria: usuario.categoria || null,
    device: 'mobile',
    plano: usuario.planoAtivo || null,
    userId: usuario.uid || usuario.id || null
  };
}

// ============================================================
// VERIFICAR SE ANÚNCIO FOI VISTO HOJE (evitar spam)
// ============================================================
export async function foiVistoHoje(anuncioId, userId) {
  if (!userId) return false;
  
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, IMPRESSOES_COLLECTION),
      where('anuncioId', '==', anuncioId),
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(hoje)),
      limit(1)
    );
    
    const snap = await getDocs(q);
    return !snap.empty;
    
  } catch (error) {
    console.error('[AnuncioService] Erro ao verificar visualização:', error);
    return false;
  }
}

export default {
  getAnunciosAtivos,
  getAnuncioRandom,
  registrarImpressao,
  registrarClique,
  getContextoUsuario,
  foiVistoHoje
};
