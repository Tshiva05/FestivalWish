/**
 * FestWish — server.js
 * BUG FIXES vs previous version:
 *  1. CSP now allows res.cloudinary.com for images + audio
 *  2. CSP connectSrc allows cdn.pixabay.com for song previews
 *  3. Server listens BEFORE mongoose.connect (Render health checks pass)
 */
require('dotenv').config();

const express     = require('express');
const mongoose    = require('mongoose');
const helmet      = require('helmet');
const cors        = require('cors');
const compression = require('compression');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const BASE = (process.env.BASE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');

/* ── Security / CSP ────────────────────────────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
      ],
      styleSrc: [
        "'self'", "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      // FIX: must include cloudinary domains so uploaded images render
      imgSrc: [
        "'self'", "data:", "blob:", "https:",
        "https://res.cloudinary.com",
        "https://images.unsplash.com",
      ],
      // FIX: must include cloudinary + pixabay so audio plays
      mediaSrc: [
        "'self'", "blob:", "https:",
        "https://res.cloudinary.com",
        "https://cdn.pixabay.com",
      ],
      // FIX: allow song preview fetches from Pixabay
      connectSrc: [
        "'self'",
        "https://cdn.pixabay.com",
        "https://res.cloudinary.com",
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({ origin: '*' }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/* ── Rate limiting ─────────────────────────────────────────────────────────── */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' },
}));

/* ── Static frontend ───────────────────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

/* ── Routes ────────────────────────────────────────────────────────────────── */
app.use('/api', require('./routes/api'));
app.use('/',    require('./routes/pages'));

/* ── Sitemap + robots ──────────────────────────────────────────────────────── */
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${BASE}/</loc></url></urlset>`);
});
app.get('/robots.txt', (req, res) =>
  res.type('text/plain').send('User-agent: *\nDisallow: /api/\nSitemap: ' + BASE + '/sitemap.xml'));

/* ── Error handler ─────────────────────────────────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Server error.' });
});

/* ── Start: listen FIRST, then connect DB ──────────────────────────────────── */
app.listen(PORT, '0.0.0.0', () => {
  console.log('\nFestWish running -> http://localhost:' + PORT);
  console.log('BASE_URL = ' + BASE + '\n');
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/festwish', {
  serverSelectionTimeoutMS: 10000,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB error:', err.message);
  console.error('Set MONGODB_URI in .env or Render environment\n');
});

module.exports = app;
