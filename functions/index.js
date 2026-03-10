const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.criarColaborador = onCall(async (request) => {
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
