import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebaseConfig';

// CONFIGURAÇÃO CLOUDINARY (já preenchido)
const CLOUDINARY_CLOUD_NAME = 'dctnkaktn';
const CLOUDINARY_UPLOAD_PRESET = 'Conecta-Solutions';

async function enviarImagemParaCloudinary(uri, pasta = 'usuarios') {
    try {
        const formData = new FormData();

        formData.append('file', {
            uri,
            type: 'image/jpeg',
            name: `imagem_${Date.now()}.jpg`,
        });

        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', pasta);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        const data = await response.json();

        if (!response.ok || !data.secure_url) {
            console.log('Erro Cloudinary:', data);
            throw new Error(data?.error?.message || 'ERRO_UPLOAD_CLOUDINARY');
        }

        return data.secure_url;
    } catch (error) {
        console.log('Erro ao enviar imagem para Cloudinary:', error);
        throw error;
    }
}

// FOTO DE PERFIL
export async function uploadFotoPerfil(userId, uri) {
    if (!userId) throw new Error('USER_ID_OBRIGATORIO');
    if (!uri) throw new Error('URI_IMAGEM_OBRIGATORIA');

    try {
        const downloadURL = await enviarImagemParaCloudinary(
            uri,
            `usuarios/${userId}/perfil`
        );

        await updateDoc(doc(db, 'usuarios', userId), {
            fotoPerfil: downloadURL,
        });

        return downloadURL;
    } catch (error) {
        console.log('Erro ao fazer upload da foto de perfil:', error);
        throw error;
    }
}

// BANNER DO PROFISSIONAL
export async function uploadBannerPerfil(userId, uri) {
    if (!userId) throw new Error('USER_ID_OBRIGATORIO');
    if (!uri) throw new Error('URI_IMAGEM_OBRIGATORIA');

    try {
        const downloadURL = await enviarImagemParaCloudinary(
            uri,
            `usuarios/${userId}/banner`
        );

        await updateDoc(doc(db, 'usuarios', userId), {
            bannerPerfil: downloadURL,
        });

        return downloadURL;
    } catch (error) {
        console.log('Erro ao fazer upload do banner do perfil:', error);
        throw error;
    }
}

// GALERIA DO PROFISSIONAL
export async function uploadFotoGaleriaProfissional(userId, uri) {
    if (!userId) throw new Error('USER_ID_OBRIGATORIO');
    if (!uri) throw new Error('URI_IMAGEM_OBRIGATORIA');

    try {
        const downloadURL = await enviarImagemParaCloudinary(
            uri,
            `usuarios/${userId}/galeria`
        );

        await updateDoc(doc(db, 'usuarios', userId), {
            galeriaFotos: arrayUnion(downloadURL),
        });

        return downloadURL;
    } catch (error) {
        console.log('Erro ao fazer upload da foto da galeria:', error);
        throw error;
    }
}