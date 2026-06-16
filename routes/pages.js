/**
 * routes/pages.js — SSR pages (wish view needs server-rendered OG tags for WhatsApp)
 */
const express = require('express');
const router  = express.Router();
const path    = require('path');
const Wish    = require('../models/Wish');
const SONGS   = require('../config/songs');

const META = {
  diwali:    { name: 'Diwali',          emoji: '🪔', color: '#FF6B35' },
  sankranti: { name: 'Makar Sankranti', emoji: '🪁', color: '#FFD700' },
  holi:      { name: 'Holi',            emoji: '🎨', color: '#E91E8C' },
  christmas: { name: 'Christmas',       emoji: '🎄', color: '#00BFA5' },
  newyear:   { name: 'New Year',        emoji: '🎆', color: '#7B2FF7' },
  birthday:  { name: 'Birthday',        emoji: '🎂', color: '#FF4081' },
  eid:       { name: 'Eid',             emoji: '🌙', color: '#4CAF50' },
  navratri:  { name: 'Navratri',        emoji: '🪷', color: '#FF9800' },
};

// HTML-escape helper — prevents XSS in server-rendered attributes
const esc = s => String(s || '')
  .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;');

router.get('/', (_, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
router.get('/privacy', (_, res) => res.sendFile(path.join(__dirname, '../public/privacy.html')));
router.get('/terms',   (_, res) => res.sendFile(path.join(__dirname, '../public/terms.html')));

/* ── Wish view ────────────────────────────────────────────────────────────── */
router.get('/wish/:shareId', async (req, res) => {
  try {
    const wish = await Wish.findOne({ shareId: req.params.shareId }).lean();

    if (!wish) return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));

    const meta     = META[wish.festival] || { name: 'Festival', emoji: '🎉', color: '#7B2FF7' };
    const BASE     = (process.env.BASE_URL || 'http://localhost:' + (process.env.PORT || 3000)).replace(/\/$/, '');
    const shareUrl = BASE + '/wish/' + wish.shareId;
    const title    = meta.emoji + ' ' + wish.senderName + ' sent you a ' + meta.name + ' wish!';
    const desc     = wish.message.length > 150 ? wish.message.slice(0, 147) + '...' : wish.message;

    let audioUrl = null;
    if (wish.audioType === 'custom')  audioUrl = wish.audioUrl;
    if (wish.audioType === 'default') audioUrl = SONGS.find(s => s.key === wish.defaultSongKey)?.url || null;

    // JSON.stringify is safe for embedding in <script> as long as we don't put it in an HTML attribute
    const wishJson = JSON.stringify({
      shareId:       wish.shareId,
      senderName:    wish.senderName,
      message:       wish.message,
      festival:      wish.festival,
      imageUrl:      wish.imageUrl,
      audioUrl,
      festivalName:  meta.name,
      festivalEmoji: meta.emoji,
      festivalColor: meta.color,
    // Escape </script> sequences inside JSON to prevent early tag close
    }).replace(/<\/script>/gi, '<\\/script>');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="noindex,nofollow">
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="${esc(shareUrl)}">
  <meta property="og:title"       content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image"       content="${esc(wish.imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name"   content="FestWish">
  <meta name="twitter:card"       content="summary_large_image">
  <meta name="twitter:image"      content="${esc(wish.imageUrl)}">
  <meta name="theme-color"        content="${esc(meta.color)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/wish.css">
  <script>window.__WISH_DATA__ = ${wishJson};</script>
</head>
<body>
  <div id="wish-app"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.4/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
  <script src="/js/wish.js"></script>
</body>
</html>`);

  } catch (err) {
    console.error('[wish page]', err.message);
    res.status(500).send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Error | FestWish</title>
<style>body{background:#0a0a1a;color:#fff;display:flex;flex-direction:column;
align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;gap:1rem;text-align:center;padding:2rem}
a{color:#7B2FF7;text-decoration:none;margin-top:1rem;display:inline-block;
padding:.75rem 2rem;background:linear-gradient(135deg,#7B2FF7,#FF4081);border-radius:50px;color:#fff;font-weight:700}
</style></head><body>
<div style="font-size:3rem">😔</div>
<h2>Wish could not be loaded</h2>
<p>The link may be invalid or expired.</p>
<a href="/">Create Your Own Wish</a>
</body></html>`);
  }
});

module.exports = router;
                                 
