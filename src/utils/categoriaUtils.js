import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    limit,
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export function limparTextoCategoria(texto = '') {
    return String(texto)
        .trim()
        .replace(/\s+/g, ' ');
}

export function capitalizarCategoria(texto = '') {
    return limparTextoCategoria(texto)
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
        .join(' ');
}

export function removerAcentos(texto = '') {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function gerarSlugCategoria(texto = '') {
    return removerAcentos(limparTextoCategoria(texto))
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function mapearIconeCategoria(nome = '') {
    const valor = removerAcentos(nome).toLowerCase();

    if (valor.includes('eletric')) return 'flash-outline';
    if (valor.includes('encan')) return 'build-outline';
    if (valor.includes('pint')) return 'color-palette-outline';
    if (valor.includes('pedre')) return 'hammer-outline';
    if (valor.includes('limpeza')) return 'sparkles-outline';
    if (valor.includes('faxina')) return 'sparkles-outline';
    if (valor.includes('diarista')) return 'sparkles-outline';
    if (valor.includes('jardin')) return 'leaf-outline';
    if (valor.includes('marcen')) return 'grid-outline';
    if (valor.includes('ar condicionado')) return 'snow-outline';
    if (valor.includes('refriger')) return 'snow-outline';
    if (valor.includes('cabeleir')) return 'cut-outline';
    if (valor.includes('barbeir')) return 'person-outline';
    if (valor.includes('manicure')) return 'hand-left-outline';
    if (valor.includes('pedicure')) return 'hand-left-outline';
    if (valor.includes('informat')) return 'laptop-outline';
    if (valor.includes('tecnico')) return 'construct-outline';
    if (valor.includes('celular')) return 'phone-portrait-outline';
    if (valor.includes('computador')) return 'desktop-outline';
    if (valor.includes('cozinha')) return 'restaurant-outline';
    if (valor.includes('chef')) return 'restaurant-outline';
    if (valor.includes('motorista')) return 'car-outline';
    if (valor.includes('frete')) return 'car-outline';
    if (valor.includes('mecanic')) return 'car-sport-outline';
    if (valor.includes('costura')) return 'shirt-outline';
    if (valor.includes('moda')) return 'shirt-outline';
    if (valor.includes('massag')) return 'body-outline';
    if (valor.includes('estetica')) return 'flower-outline';
    if (valor.includes('design')) return 'color-wand-outline';
    if (valor.includes('fotograf')) return 'camera-outline';
    if (valor.includes('video')) return 'videocam-outline';
    if (valor.includes('music')) return 'musical-notes-outline';
    if (valor.includes('professor')) return 'school-outline';
    if (valor.includes('aula')) return 'school-outline';

    return 'briefcase-outline';
}

export function normalizarCategoria(nomeInformado = '') {
    const nomeLimpo = limparTextoCategoria(nomeInformado);

    if (!nomeLimpo) {
        throw new Error('Informe uma especialidade válida.');
    }

    const nome = capitalizarCategoria(nomeLimpo);
    const slug = gerarSlugCategoria(nomeLimpo);
    const icone = mapearIconeCategoria(nome);

    if (!slug) {
        throw new Error('Não foi possível gerar o slug da categoria.');
    }

    return {
        nome,
        slug,
        icone,
    };
}

export async function buscarCategoriaPorSlug(slug) {
    const q = query(
        collection(db, 'categorias'),
        where('slug', '==', slug),
        limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    const categoriaDoc = snapshot.docs[0];

    return {
        id: categoriaDoc.id,
        ...categoriaDoc.data(),
    };
}

export async function garantirCategoriaExiste(nomeInformado = '') {
    const categoriaNormalizada = normalizarCategoria(nomeInformado);

    const categoriaExistente = await buscarCategoriaPorSlug(categoriaNormalizada.slug);

    if (categoriaExistente) {
        return {
            ...categoriaExistente,
            jaExistia: true,
        };
    }

    const novaCategoria = {
        nome: categoriaNormalizada.nome,
        slug: categoriaNormalizada.slug,
        icone: categoriaNormalizada.icone,
        criadaEm: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'categorias'), novaCategoria);

    return {
        id: docRef.id,
        ...novaCategoria,
        jaExistia: false,
    };
}

export async function prepararDadosCategoriaParaProfissional(especialidade = '') {
    const categoria = await garantirCategoriaExiste(especialidade);

    return {
        especialidade: categoria.nome,
        categoriaId: categoria.id,
        categoriaSlug: categoria.slug,
        categoriaIcone: categoria.icone,
    };
}