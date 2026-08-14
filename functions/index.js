const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

/**
 * Retorna valores de busca sem repeticoes, preservando o formato recebido e
 * incluindo uma versao somente com digitos para documentos e telefones.
 * @param {unknown} valor Valor recebido do cliente.
 * @return {string[]} Valores seguros para consulta.
 */
function valoresNormalizados(valor) {
  if (typeof valor !== "string") return [];
  const original = valor.trim().slice(0, 40);
  if (!original) return [];
  const digitos = original.replace(/\D/g, "");
  return [...new Set([original, digitos].filter(Boolean))];
}

/**
 * Verifica se algum campo possui um dos valores, ignorando apenas o perfil
 * autenticado que esta editando os proprios dados.
 * @param {string[]} campos Campos legados que podem conter o valor.
 * @param {string[]} valores Valores normalizados para consulta.
 * @param {string|null} uidIgnorado UID autenticado a ignorar.
 * @return {Promise<boolean>} Verdadeiro quando existe outro documento.
 */
async function existeValorEmOutroUsuario(campos, valores, uidIgnorado) {
  for (const campo of campos) {
    for (const valor of valores) {
      const snapshot = await db.collection("usuarios")
          .where(campo, "==", valor)
          .limit(2)
          .get();
      if (snapshot.docs.some((doc) => doc.id !== uidIgnorado)) return true;
    }
  }
  return false;
}

exports.verificarDadosDuplicados = onCall(
    {region: "southamerica-east1", enforceAppCheck: false},
    async (request) => {
      const dados = request.data || {};
      const documento = valoresNormalizados(dados.documento);
      const telefone = valoresNormalizados(dados.telefone);

      if (documento.length === 0 && telefone.length === 0) {
        throw new HttpsError(
            "invalid-argument",
            "Informe documento ou telefone para verificacao.",
        );
      }

      const uidIgnorado = request.auth ? request.auth.uid : null;

      if (documento.length > 0 && await existeValorEmOutroUsuario(
          ["cpfCnpj", "cpf", "cnpj"], documento, uidIgnorado,
      )) return {existe: true, tipo: "documento"};

      if (telefone.length > 0 && await existeValorEmOutroUsuario(
          ["telefone", "whatsapp"], telefone, uidIgnorado,
      )) return {existe: true, tipo: "telefone"};

      return {existe: false};
    },
);

/**
 * Verifica os campos administrativos usados pelo modelo legado.
 * @param {object|undefined} data Dados do perfil no Firestore.
 * @return {boolean} Verdadeiro quando o perfil e administrativo.
 */
function documentoEhAdmin(data) {
  return data && (
    data.isAdmin === true ||
    data.role === "admin" ||
    data.tipo === "admin" ||
    data.perfil === "admin"
  );
}

/**
 * Migra a propria conta administrativa legada para Firebase Custom Claims.
 *
 * Esta funcao nao aceita UID pelo corpo: somente a conta autenticada pode
 * sincronizar a propria permissao. O campo legado e consultado exclusivamente
 * pelo Admin SDK e a funcao nunca concede admin a um perfil comum.
 */
exports.sincronizarMinhaPermissaoAdmin = onCall(
    {region: "southamerica-east1"},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "Usuario nao autenticado.",
        );
      }

      const uid = request.auth.uid;
      const usuarioSnap = await db.collection("usuarios").doc(uid).get();

      if (!usuarioSnap.exists || !documentoEhAdmin(usuarioSnap.data())) {
        throw new HttpsError(
            "permission-denied",
            "A conta nao possui permissao administrativa legada.",
        );
      }

      const usuarioAuth = await admin.auth().getUser(uid);
      const claimsAtuais = usuarioAuth.customClaims || {};

      if (claimsAtuais.admin !== true) {
        await admin.auth().setCustomUserClaims(uid, {
          ...claimsAtuais,
          admin: true,
        });
      }

      await db.collection("usuarios").doc(uid).set({
        adminClaimMigrada: true,
        adminClaimMigradaEm:
          admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});

      return {
        ok: true,
        tokenDeveSerAtualizado: true,
      };
    },
);

exports.criarColaborador = onCall(
    {region: "southamerica-east1"},
    async (request) => {
      const auth = request.auth;
      const data = request.data;

      if (!auth) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado.");
      }

      const clinicaId = auth.uid;

      const {
        nome,
        email,
        senha,
        servicosSelecionados = [],
      } = data || {};

      if (!nome || !email || !senha) {
        throw new HttpsError(
            "invalid-argument",
            "Nome, e-mail e senha são obrigatórios.",
        );
      }

      if (
        !Array.isArray(servicosSelecionados) ||
        servicosSelecionados.length === 0
      ) {
        throw new HttpsError(
            "invalid-argument",
            "Selecione pelo menos um serviço.",
        );
      }

      if (senha.length < 6) {
        throw new HttpsError(
            "invalid-argument",
            "A senha deve ter no mínimo 6 caracteres.",
        );
      }

      const clinicaRef = db.collection("usuarios").doc(clinicaId);
      const clinicaSnap = await clinicaRef.get();

      if (!clinicaSnap.exists) {
        throw new HttpsError("not-found", "Clínica não encontrada.");
      }

      let novoUsuario;

      try {
        novoUsuario = await admin.auth().createUser({
          email: email.trim().toLowerCase(),
          password: senha,
          displayName: nome.trim(),
          disabled: false,
        });
      } catch (error) {
        if (error.code === "auth/email-already-exists") {
          throw new HttpsError(
              "already-exists",
              "Este e-mail já está em uso.",
          );
        }

        throw new HttpsError(
            "internal",
            error.message || "Erro ao criar usuário.",
        );
      }

      const novoColabId = novoUsuario.uid;
      const agora = admin.firestore.FieldValue.serverTimestamp();

      const colaboradorPrincipal = {
        nome: nome.trim(),
        nomeCompleto: nome.trim(),
        email: email.trim().toLowerCase(),
        tipo: "profissional",
        perfil: "colaborador",
        clinicaId,
        servicosHabilitados: servicosSelecionados,
        ativo: true,
        createdAt: agora,
      };

      const colaboradorNaClinica = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        servicosHabilitados: servicosSelecionados,
        ativo: true,
        dataCriacao: agora,
      };

      const batch = db.batch();

      const usuarioRef = db.collection("usuarios").doc(novoColabId);
      const subcolabRef = db
          .collection("usuarios")
          .doc(clinicaId)
          .collection("colaboradores")
          .doc(novoColabId);

      batch.set(usuarioRef, colaboradorPrincipal);
      batch.set(subcolabRef, colaboradorNaClinica);

      await batch.commit();

      return {
        ok: true,
        colaboradorId: novoColabId,
        message: "Colaborador criado com sucesso.",
      };
    });
