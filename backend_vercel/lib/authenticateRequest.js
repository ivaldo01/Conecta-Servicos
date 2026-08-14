function enviarErro(res, status, error) {
    res.status(status).json({ error });
    return null;
}

async function authenticateRequest(req, res, admin, options = {}) {
    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return enviarErro(res, 401, 'Autenticação obrigatória');
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(match[1]);
        if (options.admin === true && decodedToken.admin !== true) {
            return enviarErro(res, 403, 'Permissão administrativa obrigatória');
        }
        return decodedToken;
    } catch (error) {
        console.warn('[auth] Token Firebase inválido:', error.code || error.message);
        return enviarErro(res, 401, 'Token de autenticação inválido ou expirado');
    }
}

module.exports = { authenticateRequest };
