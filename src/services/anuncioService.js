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
    console.log('🔍 [anuncioService] Buscando anúncios tipo:', tipo);
    console.log('🔍 [anuncioService] Contexto:', contexto);

    const agora = Timestamp.now();
    console.log('🔍 [anuncioService] Timestamp atual:', agora.toDate());

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

    let snapshot;
    try {
      snapshot = await getDocs(q);
      console.log('🔍 [anuncioService] Total encontrado no Firestore:', snapshot.size);

      // Se não encontrou nada, tentar sem filtros de data
      if (snapshot.size === 0) {
        console.log('🔍 [anuncioService] 0 resultados com datas, tentando sem datas...');
        const qSimples = query(
          collection(db, ANUNCIOS_COLLECTION),
          where('status', '==', 'ativo'),
          where('tipo', '==', tipo),
          limit(20)
        );
        snapshot = await getDocs(qSimples);
        console.log('🔍 [anuncioService] Total sem filtros de data:', snapshot.size);
      }
    } catch (queryError) {
      console.error('🔍 [anuncioService] ❌ Erro na query:', queryError.message);
      console.error('🔍 [anuncioService] Código:', queryError.code);

      // Fallback: query simples sem datas
      console.log('🔍 [anuncioService] Tentando query simplificada (erro)...');
      const qSimples = query(
        collection(db, ANUNCIOS_COLLECTION),
        where('status', '==', 'ativo'),
        where('tipo', '==', tipo),
        limit(20)
      );
      snapshot = await getDocs(qSimples);
      console.log('🔍 [anuncioService] Total com query simples:', snapshot.size);
    }

    let anuncios = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('🔍 [anuncioService] Anúncios antes da segmentação:', anuncios.length);
    if (anuncios.length > 0) {
      console.log('🔍 [anuncioService] Primeiro anúncio:', anuncios[0].titulo, '| Status:', anuncios[0].status, '| Tipo:', anuncios[0].tipo);
    }
    if (anuncios.length > 0) {
      console.log('🔍 [anuncioService] Primeiro anúncio:', anuncios[0].titulo, '| Seg:', anuncios[0].segmentacao);
    }

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
      console.log('🔍 [anuncioService] Após segmentação:', anuncios.length);
    }

    // Ordenar por relevância/prioridade aleatória
    const resultado = anuncios.sort(() => Math.random() - 0.5);
    console.log('🔍 [anuncioService] Retornando:', resultado.length, 'anúncios');
    return resultado;

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

    // Registrar impressão (apenas criar documento, sem atualizar métricas)
    await addDoc(collection(db, IMPRESSOES_COLLECTION), impressao);
    console.log('✅ Impressão registrada para anúncio:', anuncioId);

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

    // Registrar clique (apenas criar documento, sem atualizar métricas)
    await addDoc(collection(db, CLIQUES_COLLECTION), clique);
    console.log('✅ Clique registrado para anúncio:', anuncioId);

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
    console.log('🎯 [getAnuncioRandom] Iniciando busca tipo:', tipo);
    const anuncios = await getAnunciosAtivos(tipo, contexto);

    if (anuncios.length === 0) {
      console.log('🎯 [getAnuncioRandom] ❌ Nenhum anúncio disponível');
      return null;
    }

    // Selecionar um aleatório
    const anuncio = anuncios[Math.floor(Math.random() * anuncios.length)];
    console.log('🎯 [getAnuncioRandom] ✅ Anúncio selecionado:', anuncio.titulo, '| ID:', anuncio.id);

    return {
      ...anuncio,
      id: anuncio.id
    };

  } catch (error) {
    console.error('🎯 [getAnuncioRandom] ❌ Erro:', error);
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
