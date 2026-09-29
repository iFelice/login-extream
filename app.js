const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();

// Middleware CORS nativo
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessions = new Map();

// 1. Chiamata dalla TV per creare un PIN
app.get('/api/session/create', (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  sessions.set(code, { status: 'pending', data: null, createdAt: Date.now() });

  setTimeout(() => sessions.delete(code), 10 * 60 * 1000);
  res.json({ code });
});

// 2. Chiamata dallo smartphone per inviare credenziali
app.post('/api/session/submit', (req, res) => {
  const { code, server, username, password } = req.body;

  if (!sessions.has(code)) {
    return res.status(404).json({ error: 'Codice PIN non valido o scaduto' });
  }

  sessions.set(code, {
    status: 'completed',
    data: { server, username, password }
  });

  res.json({ success: true });
});

// 3. Chiamata dalla TV per verificare lo stato
app.get('/api/session/status/:code', (req, res) => {
  const session = sessions.get(req.params.code);
  if (!session) {
    return res.status(404).json({ error: 'Sessione non trovata' });
  }

  res.json(session);
});

// 4. PROXY Xtream API Nativo (Compatibile al 100% con qualsiasi Node.js)
app.get('/api/proxy', (req, res) => {
  const { server, username, password, action, category_id } = req.query;
  if (!server || !username || !password) {
    return res.status(400).json({ error: 'Parametri mancanti (server, username, password)' });
  }

  let targetUrl = `${server.replace(/\/$/, '')}/player_api.php?username=${username}&password=${password}`;
  if (action) targetUrl += `&action=${action}`;
  if (category_id) targetUrl += `&category_id=${category_id}`;

  const client = targetUrl.startsWith('https') ? https : http;

  const proxyReq = client.get(targetUrl, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        res.json(json);
      } catch (e) {
        res.status(500).json({ error: 'Risposta non JSON dal server IPTV', raw: data.substring(0, 150) });
      }
    });
  });

  proxyReq.on('error', (err) => {
    res.status(500).json({ error: 'Errore di connessione al server IPTV', details: err.message });
  });
});

// Gestione rotte rimanenti
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));
