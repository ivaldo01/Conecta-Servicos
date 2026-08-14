/* eslint-disable no-console */

const PROJECT_ID = "agenda-servicos-2139d";
const AUTH_URL = "http://127.0.0.1:9399";
const FIRESTORE_URL = `http://127.0.0.1:8380/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FUNCTIONS_URL = `http://127.0.0.1:5101/${PROJECT_ID}/southamerica-east1`;

function firestoreValue(value) {
  if (typeof value === "boolean") return {booleanValue: value};
  return {stringValue: value};
}

async function criarUsuario(sufixo) {
  const response = await fetch(
      `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: `rules-${sufixo}@example.test`,
          password: "senha-segura-123",
          returnSecureToken: true,
        }),
      },
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Falha ao criar usuario no Auth Emulator: ${JSON.stringify(body)}`);
  }

  return {uid: body.localId, token: body.idToken};
}

async function definirClaimAdmin(uid) {
  const response = await fetch(
      `${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update?key=fake-api-key`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer owner",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          localId: uid,
          customAttributes: JSON.stringify({admin: true}),
        }),
      },
  );

  if (!response.ok) {
    throw new Error(`Falha ao definir claim no Auth Emulator: ${await response.text()}`);
  }
}

async function entrar(email) {
  const response = await fetch(
      `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email,
          password: "senha-segura-123",
          returnSecureToken: true,
        }),
      },
  );
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Falha ao renovar token no Auth Emulator: ${JSON.stringify(body)}`);
  }
  return body.idToken;
}

async function gravarUsuario({token, documentId, fields, updateFields = []}) {
  const query = updateFields
      .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
      .join("&");
  const url = `${FIRESTORE_URL}/usuarios/${documentId}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, firestoreValue(value)]),
      ),
    }),
  });

  return response.status;
}

async function lerUsuario(documentId, token = null) {
  const headers = token ? {Authorization: `Bearer ${token}`} : {};
  const response = await fetch(`${FIRESTORE_URL}/usuarios/${documentId}`, {
    headers,
  });
  return response.status;
}

async function verificarDuplicidade(documento, telefone, token = null) {
  const headers = {"Content-Type": "application/json"};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${FUNCTIONS_URL}/verificarDadosDuplicados`, {
    method: "POST",
    headers,
    body: JSON.stringify({data: {documento, telefone}}),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Falha na funcao de duplicidade: ${JSON.stringify(body)}`);
  }
  return body.result;
}

function esperarStatus(nome, recebido, esperado) {
  if (recebido !== esperado) {
    throw new Error(`${nome}: esperado HTTP ${esperado}, recebido HTTP ${recebido}`);
  }
  console.log(`OK - ${nome} (HTTP ${recebido})`);
}

async function executar() {
  const usuario = await criarUsuario("comum");

  esperarStatus(
      "usuario cria o proprio perfil comum",
      await gravarUsuario({
        token: usuario.token,
        documentId: usuario.uid,
        fields: {
          nome: "Usuario de teste",
          tipo: "cliente",
          perfil: "cliente",
          cpf: "12345678901",
          telefone: "85999999999",
        },
      }),
      200,
  );

  esperarStatus(
      "usuario altera um campo comum do proprio perfil",
      await gravarUsuario({
        token: usuario.token,
        documentId: usuario.uid,
        fields: {nome: "Nome atualizado"},
        updateFields: ["nome"],
      }),
      200,
  );

  esperarStatus(
      "visitante nao autenticado nao pode ler perfil de usuario",
      await lerUsuario(usuario.uid),
      403,
  );

  esperarStatus(
      "usuario autenticado continua lendo perfis necessarios ao aplicativo",
      await lerUsuario(usuario.uid, usuario.token),
      200,
  );

  const documentoDuplicado = await verificarDuplicidade("12345678901", "");
  if (!documentoDuplicado.existe || documentoDuplicado.tipo !== "documento") {
    throw new Error("Funcao nao detectou documento duplicado sem expor o perfil");
  }
  console.log("OK - funcao detecta documento duplicado sem expor o perfil");

  const telefoneDuplicado = await verificarDuplicidade("", "85999999999");
  if (!telefoneDuplicado.existe || telefoneDuplicado.tipo !== "telefone") {
    throw new Error("Funcao nao detectou telefone duplicado sem expor o perfil");
  }
  console.log("OK - funcao detecta telefone duplicado sem expor o perfil");

  const dadosLivres = await verificarDuplicidade("98765432100", "85888888888");
  if (dadosLivres.existe) {
    throw new Error("Funcao marcou dados novos como duplicados");
  }
  console.log("OK - funcao permite documento e telefone ainda nao cadastrados");

  const tentativasDeElevacao = [
    ["isAdmin", true],
    ["role", "admin"],
    ["tipo", "admin"],
    ["perfil", "admin"],
  ];

  for (const [field, value] of tentativasDeElevacao) {
    esperarStatus(
        `usuario nao pode alterar ${field} para privilegio admin`,
        await gravarUsuario({
          token: usuario.token,
          documentId: usuario.uid,
          fields: {[field]: value},
          updateFields: [field],
        }),
        403,
    );
  }

  esperarStatus(
      "usuario nao pode criar perfil para outro UID",
      await gravarUsuario({
        token: usuario.token,
        documentId: "uid-de-outra-pessoa",
        fields: {nome: "Outro", tipo: "cliente", perfil: "cliente"},
      }),
      403,
  );

  const novoUsuario = await criarUsuario("elevacao-no-cadastro");
  esperarStatus(
      "usuario nao pode nascer com privilegio admin",
      await gravarUsuario({
        token: novoUsuario.token,
        documentId: novoUsuario.uid,
        fields: {
          nome: "Usuario malicioso",
          tipo: "cliente",
          perfil: "cliente",
          isAdmin: true,
        },
      }),
      403,
  );

  const administrador = await criarUsuario("claim-admin");
  await definirClaimAdmin(administrador.uid);
  administrador.token = await entrar("rules-claim-admin@example.test");

  esperarStatus(
      "custom claim admin autoriza operacao administrativa",
      await gravarUsuario({
        token: administrador.token,
        documentId: usuario.uid,
        fields: {isAdmin: true, perfil: "admin"},
        updateFields: ["isAdmin", "perfil"],
      }),
      200,
  );

  console.log("Todos os testes de protecao administrativa passaram.");
}

executar().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
