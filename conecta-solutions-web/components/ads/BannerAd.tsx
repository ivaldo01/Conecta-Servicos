'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getAnunciosAtivos, registrarImpressao, registrarClique, Anuncio, TipoAnuncio } from '@/lib/anuncioService';
import { useAuth } from '@/lib/auth';

interface BannerAdProps {
  tipo: TipoAnuncio;
  className?: string;
  fallback?: React.ReactNode;
}

export default function BannerAd({ tipo, className = '', fallback = null }: BannerAdProps) {
  const { user } = useAuth();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressaoRegistrada, setImpressaoRegistrada] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Buscar anúncio ativo
  useEffect(() => {
    const buscarAnuncio = async () => {
      try {
        console.log('[BannerAd] Buscando anúncios tipo:', tipo);
        const anuncios = await getAnunciosAtivos(tipo, {});
        console.log('[BannerAd] Anúncios encontrados:', anuncios.length);
        
        if (anuncios.length > 0) {
          const randomIndex = Math.floor(Math.random() * anuncios.length);
          console.log('[BannerAd] Selecionado:', anuncios[randomIndex].titulo);
          setAnuncio(anuncios[randomIndex]);
        } else {
          console.log('[BannerAd] Nenhum anúncio encontrado');
        }
      } catch (err) {
        console.error('[BannerAd] Erro ao buscar anúncio:', err);
      } finally {
        setLoading(false);
      }
    };

    buscarAnuncio();
  }, [tipo]);

  // Registrar impressão quando banner entra na viewport
  useEffect(() => {
    if (!anuncio || impressaoRegistrada || !bannerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressaoRegistrada) {
            // Registrar impressão
            registrarImpressao(
              anuncio.id!,
              anuncio.anuncianteId,
              {
                userId: user?.uid || null,
                userTipo: user?.tipo || null,
                device: 'web',
                pagina: window.location.pathname,
                localizacao: null,
                custo: 0
              }
            ).catch((err) => {
              console.error('[BannerAd] Erro ao registrar impressão:', err);
            });
            
            setImpressaoRegistrada(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 } // 50% visível
    );

    observer.observe(bannerRef.current);

    return () => observer.disconnect();
  }, [anuncio, impressaoRegistrada]);

  // Registrar clique
  const handleClick = async () => {
    if (!anuncio) return;

    try {
      await registrarClique(
        anuncio.id!,
        anuncio.anuncianteId,
        undefined,
        {
          userId: user?.uid || null,
          device: 'web',
          pagina: window.location.pathname,
          custo: 0,
          converteu: false
        }
      );
    } catch (err) {
      console.error('[BannerAd] Erro ao registrar clique:', err);
    }
  };

  if (loading) {
    return (
      <div 
        ref={bannerRef}
        className={`banner-ad-skeleton ${className}`}
        style={{
          background: '#1F2937',
          borderRadius: 8,
          minHeight: tipo === 'banner_superior' ? 90 : tipo === 'banner_lateral' ? 250 : 200,
          animation: 'pulse 2s infinite'
        }}
      />
    );
  }

  if (!anuncio) {
    return (
      <div 
        className="banner-ad-empty"
        style={{
          width: '100%',
          maxWidth: 728,
          height: 90,
          background: '#f0f0f0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: 12
        }}
      >
        Espaço para anúncio
      </div>
    );
  }

  // Estilos por tipo
  const styles: Record<TipoAnuncio, React.CSSProperties> = {
    banner_superior: {
      width: '100%',
      maxWidth: 728,
      height: 90,
    },
    banner_lateral: {
      width: 300,
      height: 250,
    },
    card: {
      width: 300,
      height: 200,
    },
    banner_full: {
      width: '100%',
      height: 300,
    },
    modal: {
      width: 400,
      height: 400,
    },
    push: {
      width: '100%',
      padding: 16,
    },
    story: {
      width: 360,
      height: 640,
    }
  };

  return (
    <div
      ref={bannerRef}
      className={`banner-ad ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        cursor: 'pointer',
        ...styles[tipo]
      }}
    >
      {/* Badge "Patrocinado" */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.6)',
          color: '#FFF',
          fontSize: 10,
          borderRadius: 4,
          zIndex: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5
        }}
      >
        Patrocinado
      </div>

      {/* Link do anúncio */}
      <Link
        href={anuncio.ctaLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          textDecoration: 'none'
        }}
      >
        {/* Imagem ou Fallback */}
        {tipo !== 'push' ? (
          <div style={{
            width: '100%',
            height: '100%',
            background: anuncio.corPrimaria || '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            padding: 16,
            position: 'relative'
          }}>
            {anuncio.imagemUrl && (
              <img
                src={anuncio.imagemUrl}
                alt=""
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 1
                }}
                onError={(e) => {
                  console.log('[BannerAd] Imagem inválida, usando fallback');
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>
                {anuncio.tituloAnuncio || anuncio.titulo || 'Anúncio'}
              </div>
              {(anuncio.textoAnuncio || anuncio.descricao) && (
                <div style={{ fontSize: 14, opacity: 0.9 }}>{anuncio.textoAnuncio || anuncio.descricao}</div>
              )}
              <div style={{ 
                marginTop: 12, 
                padding: '8px 20px', 
                background: anuncio.corSecundaria || '#1E40AF',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 500,
                display: 'inline-block'
              }}>
                {anuncio.ctaTexto || 'Clique aqui'}
              </div>
            </div>
          </div>
        ) : (
          // Layout para Push Notification
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: anuncio.corPrimaria || '#3B82F6',
              padding: 16,
              borderRadius: 8,
              color: '#FFF'
            }}
          >
            {anuncio.imagemUrl && (
              <img
                src={anuncio.imagemUrl}
                alt=""
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{anuncio.tituloAnuncio}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>{anuncio.textoAnuncio}</div>
            </div>
            <span
              style={{
                padding: '8px 16px',
                background: anuncio.corSecundaria || '#1E40AF',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              {anuncio.ctaTexto}
            </span>
          </div>
        )}
      </Link>
    </div>
  );
}

// Componente para Modal (Popup)
export function ModalAd({ onClose }: { onClose: () => void }) {
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const buscarModal = async () => {
      try {
        const anuncios = await getAnunciosAtivos('modal');
        if (anuncios.length > 0) {
          setAnuncio(anuncios[0]);
          // Delay para mostrar o modal
          setTimeout(() => setShow(true), 2000);
        }
      } catch (err) {
        console.error('[ModalAd] Erro:', err);
      }
    };

    buscarModal();
  }, []);

  if (!show || !anuncio) return null;

  const handleClose = () => {
    setShow(false);
    onClose?.();
  };

  const handleClick = async () => {
    try {
      await registrarClique(anuncio.id!, anuncio.anuncianteId, undefined, {
        device: 'web',
        pagina: window.location.pathname,
        custo: 0,
        converteu: false
      });
    } catch (err) {
      console.error('[ModalAd] Erro clique:', err);
    }
    handleClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20
      }}
      onClick={handleClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: 400,
          width: '100%',
          background: '#FFF',
          borderRadius: 16,
          overflow: 'hidden',
          animation: 'slideIn 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão fechar */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            color: '#FFF',
            cursor: 'pointer',
            fontSize: 18,
            zIndex: 10
          }}
        >
          ×
        </button>

        {/* Badge */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '4px 12px',
            background: 'rgba(0,0,0,0.6)',
            color: '#FFF',
            fontSize: 11,
            borderRadius: 4,
            zIndex: 10,
            textTransform: 'uppercase'
          }}
        >
          Patrocinado
        </div>

        {/* Imagem */}
        <img
          src={anuncio.imagemUrl}
          alt={anuncio.tituloAnuncio}
          style={{ width: '100%', height: 300, objectFit: 'cover' }}
        />

        {/* Conteúdo */}
        <div style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 8px', color: '#111827' }}>{anuncio.tituloAnuncio}</h3>
          <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: 14 }}>
            {anuncio.textoAnuncio}
          </p>
          <Link
            href={anuncio.ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            style={{
              display: 'block',
              padding: '12px 24px',
              background: anuncio.corPrimaria || '#3B82F6',
              color: '#FFF',
              textAlign: 'center',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            {anuncio.ctaTexto}
          </Link>
        </div>
      </div>
    </div>
  );
}
