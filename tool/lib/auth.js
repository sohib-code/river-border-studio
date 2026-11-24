// Shared OAuth helpers: load client, load/save token, return an authorized client.
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const ROOT = path.resolve(__dirname, '..', '..');
const SECRET_PATH = path.join(ROOT, 'client_secret.json');
const TOKEN_PATH = path.join(ROOT, 'token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/youtube', // read + edit metadata, playlists, thumbnails
  'https://www.googleapis.com/auth/youtube.upload', // upload videos
  'https://www.googleapis.com/auth/yt-analytics.readonly', // analytics reports
];

function loadClientConfig() {
  if (!fs.existsSync(SECRET_PATH)) {
    throw new Error(`client_secret.json topilmadi: ${SECRET_PATH}`);
  }
  const json = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'));
  const cfg = json.installed || json.web;
  if (!cfg) throw new Error('client_secret.json ichida "installed" bo\'limi yo\'q');
  return cfg;
}

function createClient(redirectUri) {
  const cfg = loadClientConfig();
  return new google.auth.OAuth2(cfg.client_id, cfg.client_secret, redirectUri);
}

function saveToken(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

// Returns an OAuth2 client with stored credentials; refreshed tokens are persisted.
function getAuthorizedClient() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json yo\'q. Avval: node scripts/auth.js');
  }
  const client = createClient();
  const stored = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  client.setCredentials(stored);
  client.on('tokens', (t) => saveToken({ ...stored, ...t }));
  return client;
}

module.exports = { SCOPES, TOKEN_PATH, createClient, saveToken, getAuthorizedClient };
