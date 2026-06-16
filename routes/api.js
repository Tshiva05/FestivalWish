/**
 * routes/api.js
 * BUG FIXES:
 *  1. Uses resolveUrl() instead of file.path directly — handles SDK version differences
 *  2. Guards against null imageUrl (upload failed but multer didn't throw)
 *  3. Multer errors wrapped so they return JSON not HTML 500
 */
const express      = require('express');
const router       = express.Router();
const { nanoid }   = require('nanoid');
const sanitize     = require('sanitize-html');
const QRCode       = require('qrcode');
const Wish         = require('../models/Wish');
const { upload, resolveUrl } = require('../config/cloudinary');
const SONGS        = require('../config/songs');

const clean = s => sanitize(String(s || ''), { allowedTags: [], allowedAttributes: {} }).trim();

/* ── GET /api/songs ─────────────────────────────────────────────────────────── */
router.get('/songs', (req, res) => {
  res.json({ success: true, songs: SONGS });
});

/* ── POST /api/wishes ───────────────────────────────────────────────────────── */
const multerFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]);

router.post('/wishes', (req, res, next) => {
  multerFields(req, res, (err) => {
    if (err) {
      console.error('[multer]', err.message);
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
                .json({ success: false, error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const senderName    = clean(req.body.senderName);
    const message       = clean(req.body.message);
    const festival      = clean(req.body.festival);
    const defaultSongKey = clean(req.body.defaultSongKey);

    const VALID = ['diwali','sankranti','holi','christmas','newyear','birthday','eid','navratri'];

    if (!senderName)           return res.status(400).json({ success: false, error: 'Your name is required.' });
    if (!message)              return res.status(400).json({ success: false, error: 'Wish message is required.' });
    if (!VALID.includes(festival)) return res.status(400).json({ success: false, error: 'Please select a valid festival.' });
    if (!req.files?.image?.[0])    return res.status(400).json({ success: false, error: 'Please upload a photo.' });

    const imageFile = req.files.image[0];
    const audioFile = req.files?.audio?.[0];

    // FIX: resolve URL via helper, then guard against null
    const imageUrl = resolveUrl(imageFile);
    if (!imageUrl) {
      return res.status(500).json({ success: false, error: 'Image upload failed. Check Cloudinary credentials.' });
    }

    const wishData = {
      shareId:       nanoid(8),
      senderName:    senderName.slice(0, 60),
      message:       message.slice(0, 500),
      festival,
      imageUrl,
      imagePublicId: imageFile.filename || null,
      audioType:     'none',
    };

    if (audioFile) {
      const audioUrl = resolveUrl(audioFile);
      if (audioUrl) {
        wishData.audioType     = 'custom';
        wishData.audioUrl      = audioUrl;
        wishData.audioPublicId = audioFile.filename || null;
      }
    } else if (defaultSongKey) {
      const song = SONGS.find(s => s.key === defaultSongKey);
      if (song) {
        wishData.audioType      = 'default';
        wishData.defaultSongKey = defaultSongKey;
      }
    }

    const wish = await Wish.create(wishData);

    const BASE     = (process.env.BASE_URL || 'http://localhost:' + (process.env.PORT || 3000)).replace(/\/$/, '');
    const shareUrl = BASE + '/wish/' + wish.shareId;
    const waMsg    = '🎉 ' + senderName + ' sent you a special festival wish!\n\n' + shareUrl + '\n\nOpen for a magical surprise! 🎊';

    console.log('[wish created]', wish.shareId, 'festival=' + festival);

    return res.status(201).json({
      success:     true,
      shareId:     wish.shareId,
      shareUrl,
      whatsappUrl: 'https://wa.me/?text=' + encodeURIComponent(waMsg),
    });

  } catch (err) {
    console.error('[create wish]', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create wish. Please try again.' });
  }
});

/* ── GET /api/wishes/:shareId ───────────────────────────────────────────────── */
router.get('/wishes/:shareId', async (req, res) => {
  try {
    const wish = await Wish.findOneAndUpdate(
      { shareId: req.params.shareId },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!wish) return res.status(404).json({ success: false, error: 'Wish not found.' });

    let audioUrl = null;
    if (wish.audioType === 'custom')  audioUrl = wish.audioUrl;
    if (wish.audioType === 'default') audioUrl = SONGS.find(s => s.key === wish.defaultSongKey)?.url || null;

    return res.json({ success: true, wish: { ...wish, audioUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/* ── GET /api/wishes/:shareId/qr ────────────────────────────────────────────── */
router.get('/wishes/:shareId/qr', async (req, res) => {
  try {
    const wish = await Wish.findOne({ shareId: req.params.shareId }).lean();
    if (!wish) return res.status(404).json({ success: false, error: 'Wish not found.' });

    const BASE = (process.env.BASE_URL || 'http://localhost:' + (process.env.PORT || 3000)).replace(/\/$/, '');
    const qr   = await QRCode.toDataURL(BASE + '/wish/' + wish.shareId, {
      width: 300, margin: 2, color: { dark: '#1a1a2e', light: '#ffffff' },
    });
    return res.json({ success: true, qrCode: qr });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'QR failed.' });
  }
});

module.exports = router;
