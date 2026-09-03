require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json({ limit: '3mb' }));

/* Force browsers/CDNs to always fetch a fresh copy of the app instead of
   serving a stale cached version. */
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
}));

/* ---------------- database ---------------- */
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI is not set. The app will not be able to save data.');
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err.message));
}

const kvSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });
const KV = mongoose.model('KV', kvSchema);

/* ---------------- generic key-value store API ----------------
   Mirrors the shape of the old window.storage calls: the whole
   app's data (config, subjects, students, questions, scores, etc.)
   is stored as a handful of JSON documents keyed by name. */
app.get('/api/kv/:key', async (req, res) => {
  try {
    const doc = await KV.findOne({ key: req.params.key });
    res.json({ value: doc ? doc.value : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/kv/:key', async (req, res) => {
  try {
    await KV.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value: req.body.value },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ---------------- AI question generation (server-side, uses your API key) ---------------- */
app.post('/api/generate-questions', async (req, res) => {
  const { subjectName, scheme, kind, count, topics, className } = req.body || {};
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'AI question generation is not configured on this server. Set ANTHROPIC_API_KEY.' });
  }
  if (!subjectName || !scheme || !kind || !count) {
    return res.status(400).json({ error: 'Missing subjectName, scheme, kind, or count.' });
  }
  try {
    const topicLine = (topics && topics.trim())
      ? `Focus mainly on these topics from the scheme (still stay within the scheme overall): ${topics.trim()}.\n`
      : '';
    const kindLabel = kind === 'test' ? `class test for ${className || ''}` : kind === 'exam' ? `examination for ${className || ''}` : 'entrance examination for prospective new intake students';
    const prompt = `You are setting a Nigerian secondary school ${kindLabel} for the subject "${subjectName}", based strictly on the scheme of work below.
${topicLine}Write exactly ${count} multiple-choice questions, each with 4 options (A-D) and exactly one correct option, at an appropriate secondary-school difficulty. Avoid repeating the same question idea twice.
Scheme of work:
"""
${scheme}
"""
Respond with ONLY a JSON array (no markdown fences, no commentary), where each item is exactly:
{"q":"question text","A":"option A","B":"option B","C":"option C","D":"option D","correct":"A"}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (data.error) {
      console.error('Anthropic API error:', data.error);
      return res.status(500).json({ error: data.error.message || 'AI provider error' });
    }
    const text = (data.content || []).map(b => b.text || '').join('\n');
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const arr = JSON.parse(clean);
    res.json({ questions: arr });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI generation failed.' });
  }
});

app.get('/healthz', (req, res) => res.json({ ok: true, dbConnected: mongoose.connection.readyState === 1 }));

/* fallback to the SPA for any other route */
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('OECMS portal server running on port ' + PORT));
