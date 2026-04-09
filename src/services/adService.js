// Serviço de anúncios - implementação base para web/PWA
// Nota: AdMob não funciona em PWA, apenas em apps nativos

import { mostrarAds } from "../constants/plans";

/**
 * Verifica se deve mostrar anúncios baseado no plano do usuário
 * @param {string} planoId - ID do plano ativo do usuário
 * @returns {boolean} - true se deve mostrar anúncios, false se não deve
 */
export const shouldShowAds = (planoId = null) => {
    // Se não houver plano, mostrar anúncios (grátis)
    if (!planoId) return true;

    // Verificar se o plano permite mostrar ads
    return mostrarAds(planoId);
};

export const getAdUnitId = () => {
    return null;
};

export const initializeAds = async () => {
    // No-op para web
    return false;
};

export const requestAdsConsent = async () => {
    return { canRequestAds: false };
};
