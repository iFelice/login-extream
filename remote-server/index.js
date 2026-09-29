const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mappa in memoria per le sessioni temporanee (Codice PIN -> Dati)
const sessions = new Map();

// 1. La TV richiede un nuovo PIN temporaneo
app.get('/api/session/create', (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // Genera PIN a 6 cifre
  sessions.set(code, { status: 'pending', data: null, createdAt: Date.now() });

  // Pulisce le sessioni vecchie (> 10 minuti)
  setTimeout(() => sessions.delete(code), 10 * 60 * 1000);

  res.json({ code });
});

// 2. Lo smartphone invia i dati inseriti dall'utente
app.post('/api/session/submit', (req, res) => {
  const { code, server, username, password } = req.body;

  if (!sessions.has(code)) {
    return res.status(404).json({ error: 'Codice non valido o scaduto' });
  }

  sessions.set(code, {
    status: 'completed',
    data: { server, username, password }
  });

  res.json({ success: true });
});

// 3. La TV controlla se lo smartphone ha inviato i dati (Polling)
app.get('/api/session/status/:code', (req, res) => {
  const session = sessions.get(req.params.code);
  if (!session) {
    return res.status(404).json({ error: 'Sessione non trovata' });
  }

  res.json(session);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));
