const express = require('express');
const path = require('path');

const app = express();

// Abilita i permessi CORS in modo nativo senza la libreria 'cors'
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

// Serve index.html per qualsiasi altra rotta
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));
