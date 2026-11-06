/*!
 * © Opita Digital — Todos los derechos reservados.
 * "Entrar con Google" (OAuth 2.0 / OpenID Connect, flujo de código).
 * Solo entran los correos autorizados en Ajustes.
 */
'use strict';

const { ErrorValidacion } = require('./store');

function crearGoogle({
  clientId, clientSecret,
  authUrl = 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl = 'https://oauth2.googleapis.com/token',
} = {}) {
  const configurado = Boolean(clientId && clientSecret);

  function urlAutorizacion(redirectUri, estado) {
    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: estado,
      prompt: 'select_account',
    });
    return `${authUrl}?${q}`;
  }

  // Cambia el código por el id_token. Como el token llega directo de Google
  // por HTTPS y con nuestro secreto, basta revisar sus datos (no hace falta
  // verificar la firma, según la documentación de Google).
  async function canjear(codigo, redirectUri) {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: codigo, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new ErrorValidacion('Google rechazó el inicio de sesión', 401);
    const { id_token: idToken } = await res.json();
    const partes = String(idToken || '').split('.');
    if (partes.length !== 3) throw new ErrorValidacion('Respuesta de Google no válida', 401);
    const datos = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(datos.iss)) throw new ErrorValidacion('Emisor no válido', 401);
    if (datos.aud !== clientId) throw new ErrorValidacion('Token para otra aplicación', 401);
    if (!datos.exp || datos.exp * 1000 < Date.now()) throw new ErrorValidacion('Token vencido', 401);
    if (!datos.email || datos.email_verified !== true) throw new ErrorValidacion('Correo de Google no verificado', 401);
    return { correo: String(datos.email).toLowerCase(), nombre: datos.name || '' };
  }

  return { configurado, urlAutorizacion, canjear };
}

module.exports = { crearGoogle };
