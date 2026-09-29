const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve la cartella 'public' contenente il form HTML
app.use(express.static(path.join(__dirname, 'public')));

// Mappa in memoria per le sessioni temporanee
const sessions = new Map();

// 1. Chiamata dalla TV per generare un nuovo PIN
app.get('/api/session/create', (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  sessions.set(code, { status: 'pending', data: null, createdAt: Date.now() });

  // Elimina dopo 10 minuti
  setTimeout(() => sessions.delete(code), 10 * 60 * 1000);

  res.json({ code });
});

// 2. Chiamata dallo smartphone per inviare le credenziali
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

// 3. Chiamata dalla TV per verificare se i dati sono stati inviati
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
