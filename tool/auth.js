// One-time (weekly while app is in Testing) authorization.
// Starts a loopback server, opens the Google consent page, saves token.json.
// Usage: node scripts/auth.js
const http = require('http');
const { exec } = require('child_process');
const { SCOPES, TOKEN_PATH, createClient, saveToken } = require('./lib/auth');

const TIMEOUT_MS = 5 * 60 * 1000;

const server = http.createServer();
server.listen(0, '127.0.0.1', async () => {
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const client = createClient(redirectUri);
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  server.on('request', async (req, res) => {
    const params = new URL(req.url, redirectUri).searchParams;
    if (!params.has('code') && !params.has('error')) {
      res.writeHead(404).end();
      return;
    }
    if (params.get('error')) {
      res.end(`Avtorizatsiya bekor qilindi: ${params.get('error')}`);
      console.error('XATO:', params.get('error'));
      finish(1);
      return;
    }
    try {
      const { tokens } = await client.getToken({ code: params.get('code'), codeVerifier });
      saveToken(tokens);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Tayyor! Bu oynani yopib, Claude oynasiga qayting.</h2>');
      console.log(`OK: token saqlandi -> ${TOKEN_PATH}`);
      console.log(`refresh_token: ${tokens.refresh_token ? 'bor' : 'YO\'Q'}`);
      finish(0);
    } catch (e) {
      res.end('Token olishda xato. Terminalni qarang.');
      console.error('XATO:', e.message);
      finish(1);
    }
  });

  console.log('Brauzerda Google oynasi ochilmoqda...');
  console.log('Agar ochilmasa, shu havolani qo\'lda oching:\n' + url + '\n');
  exec(`cmd /c start "" "${url}"`);
});

const timer = setTimeout(() => {
  console.error('Vaqt tugadi (5 daqiqa). Qaytadan ishga tushiring.');
  finish(1);
}, TIMEOUT_MS);

function finish(code) {
  clearTimeout(timer);
  server.close();
  setTimeout(() => process.exit(code), 200);
}
