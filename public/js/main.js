/**
 * main.js — FestWish homepage
 * FIXES vs previous version:
 *  1. uploadZone click uses changeBtn.contains(e.target) — works on child elements
 *  2. audio accept accepts audio/* broadly, validated by extension on change
 *  3. audioInput is inside <label> — no extra JS needed to open picker
 *  4. songs delegated listener set up ONCE outside renderSongs()
 *  5. getAudioDuration has 10s timeout + revokeObjectURL cleanup
 *  6. fetch errors produce readable messages — not "Failed to fetch"
 *  7. setLoading re-runs validate() on completion so button re-enables correctly
 */
(function () {
  'use strict';

  const state = {
    festival: null, imageFile: null,
    audioFile: null, selectedSongKey: null,
    songs: [], shareId: null, shareUrl: null, whatsappUrl: null,
  };

  /* ── DOM refs ──────────────────────────────────────────────────────────── */
  const festCards      = document.querySelectorAll('.festival-card');
  const uploadZone     = document.getElementById('upload-zone');
  const imgInput       = document.getElementById('image-input');
  const imgPreview     = document.getElementById('image-preview');
  const placeholder    = document.getElementById('upload-placeholder');
  const changeBtn      = document.getElementById('change-photo-btn');
  const senderInput    = document.getElementById('sender-name');
  const msgTextarea    = document.getElementById('wish-message');
  const nameCount      = document.getElementById('name-count');
  const msgCount       = document.getElementById('msg-count');
  const songsCarousel  = document.getElementById('songs-carousel');
  const audioInput     = document.getElementById('audio-input');
  const audioStatus    = document.getElementById('audio-status');
  const generateBtn    = document.getElementById('generate-btn');
  const btnText        = document.getElementById('btn-text');
  const btnLoader      = document.getElementById('btn-loader');
  const modal          = document.getElementById('success-modal');
  const shareUrlText   = document.getElementById('share-url-text');
  const copyBtn        = document.getElementById('copy-btn');
  const whatsappBtn    = document.getElementById('whatsapp-btn');
  const previewBtn     = document.getElementById('preview-btn');
  const showQrBtn      = document.getElementById('show-qr-btn');
  const qrImg          = document.getElementById('qr-img');
  const createAgainBtn = document.getElementById('create-another-btn');

  /* ══ 1. FESTIVAL SELECTION ════════════════════════════════════════════════ */
  festCards.forEach(card => {
    card.addEventListener('click', () => {
      festCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input[type=radio]').checked = true;
      state.festival = card.dataset.festival;
      validate();
    });
  });

  /* ══ 2. PHOTO UPLOAD ══════════════════════════════════════════════════════ */
  uploadZone.addEventListener('click', e => {
    // FIX: use .contains() so clicks on text inside changeBtn also work
    if (changeBtn.contains(e.target)) return;
    imgInput.click();
  });

  changeBtn.addEventListener('click', e => {
    e.stopPropagation();
    imgInput.click();
  });

  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  });

  imgInput.addEventListener('change', () => {
    if (imgInput.files && imgInput.files[0]) handleImageFile(imgInput.files[0]);
  });

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (JPG, PNG, WebP).', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10 MB.', 'error');
      return;
    }
    if (imgPreview.src && imgPreview.src.startsWith('blob:')) URL.revokeObjectURL(imgPreview.src);
    state.imageFile = file;
    imgPreview.src  = URL.createObjectURL(file);
    imgPreview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    changeBtn.classList.remove('hidden');
    uploadZone.classList.add('has-image');
    validate();
  }

  /* ══ 3. CHAR COUNTERS ═════════════════════════════════════════════════════ */
  senderInput.addEventListener('input', () => {
    nameCount.textContent = senderInput.value.length + '/60';
    validate();
  });
  msgTextarea.addEventListener('input', () => {
    msgCount.textContent = msgTextarea.value.length + '/500';
    validate();
  });

  /* ══ 4. SONGS CAROUSEL ════════════════════════════════════════════════════ */
  let previewAudio = null;

  async function loadSongs() {
    try {
      const res  = await fetch('/api/songs');
      const data = await res.json();
      if (!data.success) throw new Error('api error');
      state.songs = data.songs;
      renderSongs();
    } catch {
      songsCarousel.innerHTML = '<p class="songs-loading" style="color:rgba(255,255,255,0.4);padding:1rem 0">Could not load songs — upload your own below.</p>';
    }
  }

  function renderSongs() {
    songsCarousel.innerHTML = state.songs.map(s => `
      <div class="song-card" data-key="${s.key}" style="--card-color:${s.color}">
        <span class="selected-badge">&#10003;</span>
        <div class="song-cover-wrap">
          <img class="song-cover" src="${s.cover}" alt="${s.title}" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="song-cover-fallback" style="display:none;background:linear-gradient(135deg,${s.color}33,${s.color}88)">
            <span style="font-size:2rem">&#127925;</span>
          </div>
        </div>
        <div class="song-info">
          <div class="song-title">${s.title}</div>
          <div class="song-artist">${s.artist}</div>
        </div>
        <div class="song-actions">
          <button class="song-play-btn" data-key="${s.key}" data-url="${s.url}">&#9654; Preview</button>
          <button class="song-select-btn" data-key="${s.key}">Select</button>
        </div>
      </div>`).join('');
  }

  // FIX: single delegated listener, set up ONCE (not inside renderSongs)
  songsCarousel.addEventListener('click', e => {
    const play   = e.target.closest('.song-play-btn');
    const select = e.target.closest('.song-select-btn');
    if (play)   handleSongPreview(play.dataset.key, play.dataset.url, play);
    if (select) handleSongSelect(select.dataset.key);
  });

  function handleSongPreview(key, url, btn) {
    if (previewAudio && !previewAudio.paused) {
      previewAudio.pause();
      document.querySelectorAll('.song-play-btn').forEach(b => b.textContent = '\u25B6 Preview');
      if (previewAudio._key === key) { previewAudio = null; return; }
    }
    if (previewAudio) previewAudio.pause();
    previewAudio      = new Audio(url);
    previewAudio._key = key;
    previewAudio.volume = 0.6;
    previewAudio.play().catch(() => showToast('Tap Select to use this song.', 'info'));
    btn.textContent = '\u23F8 Pause';
    previewAudio.addEventListener('ended', () => { btn.textContent = '\u25B6 Preview'; });
  }

  function handleSongSelect(key) {
    if (state.audioFile) { state.audioFile = null; audioInput.value = ''; hideAudioStatus(); }
    state.selectedSongKey = key;
    document.querySelectorAll('.song-card').forEach(c =>
      c.classList.toggle('selected', c.dataset.key === key));
  }

  /* ══ 5. CUSTOM AUDIO UPLOAD ═══════════════════════════════════════════════ */
  // <label for="audio-input"> opens the picker natively — no extra JS needed
  audioInput.addEventListener('change', async () => {
    const file = audioInput.files && audioInput.files[0];
    if (!file) return;

    // FIX: accept by extension OR mime — Android browsers vary
    const okExt  = /\.mp3$/i.test(file.name);
    const okMime = file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.type.startsWith('audio/');
    if (!okExt && !okMime) {
      showAudioStatus('Only MP3 files are supported.', 'error');
      audioInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAudioStatus('Audio must be under 5 MB.', 'error');
      audioInput.value = '';
      return;
    }

    showAudioStatus('Checking duration...', 'info');
    const dur = await getAudioDuration(file);
    if (dur > 31) {
      showAudioStatus('Song is ' + Math.round(dur) + 's — max 30 seconds.', 'error');
      audioInput.value = '';
      return;
    }

    state.audioFile       = file;
    state.selectedSongKey = null;
    document.querySelectorAll('.song-card').forEach(c => c.classList.remove('selected'));
    showAudioStatus('\u2713 "' + file.name + '" (' + Math.round(dur) + 's) ready', 'success');
  });

  function getAudioDuration(file) {
    return new Promise(resolve => {
      const url   = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      let settled = false;
      const done  = dur => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve(isNaN(dur) ? 0 : dur);
      };
      audio.addEventListener('loadedmetadata', () => done(audio.duration));
      audio.addEventListener('error', () => done(0));
      setTimeout(() => done(0), 10000); // FIX: 10s timeout prevents hang
      audio.preload = 'metadata';
      audio.src     = url;
    });
  }

  function showAudioStatus(msg, type) {
    audioStatus.textContent = msg;
    audioStatus.className   = 'audio-upload-status ' + type;
    audioStatus.classList.remove('hidden');
  }
  function hideAudioStatus() {
    audioStatus.textContent = '';
    audioStatus.classList.add('hidden');
  }

  /* ══ 6. VALIDATION ════════════════════════════════════════════════════════ */
  function validate() {
    generateBtn.disabled = !(
      state.festival &&
      state.imageFile &&
      senderInput.value.trim() &&
      msgTextarea.value.trim()
    );
  }

  /* ══ 7. GENERATE WISH ════════════════════════════════════════════════════ */
  generateBtn.addEventListener('click', async () => {
    if (generateBtn.disabled) return;
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('festival',   state.festival);
      fd.append('senderName', senderInput.value.trim());
      fd.append('message',    msgTextarea.value.trim());
      fd.append('image',      state.imageFile, state.imageFile.name);
      if (state.audioFile)       fd.append('audio', state.audioFile, state.audioFile.name);
      else if (state.selectedSongKey) fd.append('defaultSongKey', state.selectedSongKey);

      let res;
      try {
        res = await fetch('/api/wishes', { method: 'POST', body: fd });
      } catch (netErr) {
        const isFile = location.protocol === 'file:';
        const isGH   = location.hostname.includes('github');
        throw new Error(
          isFile ? 'You opened this as a file. Open via http://localhost:3000 instead.' :
          isGH   ? 'GitHub cannot run Node.js. Deploy to Render and open your Render URL.' :
          'Server not reachable. Make sure "npm start" is running.'
        );
      }

      let data;
      try { data = await res.json(); }
      catch { throw new Error('Server error (HTTP ' + res.status + '). Check server logs.'); }

      if (!res.ok || !data.success) throw new Error(data.error || 'Server error ' + res.status);

      state.shareId     = data.shareId;
      state.shareUrl    = data.shareUrl;
      state.whatsappUrl = data.whatsappUrl;
      openModal();

    } catch (err) {
      console.error('[generate]', err);
      alert('\u274C ' + err.message);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(on) {
    generateBtn.disabled = on;
    btnText.classList.toggle('hidden', on);
    btnLoader.classList.toggle('hidden', !on);
    if (!on) validate(); // FIX: re-check so button re-enables after failure
  }

  /* ══ 8. SUCCESS MODAL ════════════════════════════════════════════════════ */
  function openModal() {
    shareUrlText.textContent = state.shareUrl;
    whatsappBtn.href         = state.whatsappUrl;
    modal.classList.remove('hidden');
    fireConfetti();
  }

  function fireConfetti() {
    if (typeof confetti === 'undefined') return;
    const c = ['#FFD600','#FF4081','#7B2FF7','#00BFA5'];
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.35 }, colors: c });
    setTimeout(() => confetti({ particleCount: 50, spread: 60, angle: 60,  origin: { x: 0.1, y: 0.4 }, colors: c }), 300);
    setTimeout(() => confetti({ particleCount: 50, spread: 60, angle: 120, origin: { x: 0.9, y: 0.4 }, colors: c }), 600);
  }

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.shareUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = state.shareUrl;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copyBtn.textContent = '\u2713';
    setTimeout(() => (copyBtn.textContent = '\uD83D\uDCCB'), 2000);
  });

  previewBtn.addEventListener('click', () => window.open('/wish/' + state.shareId, '_blank'));

  showQrBtn.addEventListener('click', async () => {
    if (!qrImg.classList.contains('hidden')) {
      qrImg.classList.add('hidden');
      showQrBtn.textContent = 'Show QR Code';
      return;
    }
    showQrBtn.textContent = 'Loading...';
    try {
      const data = await (await fetch('/api/wishes/' + state.shareId + '/qr')).json();
      if (data.success) { qrImg.src = data.qrCode; qrImg.classList.remove('hidden'); showQrBtn.textContent = 'Hide QR Code'; }
    } catch { showQrBtn.textContent = 'Show QR Code'; }
  });

  createAgainBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function resetForm() {
    Object.assign(state, { festival: null, imageFile: null, audioFile: null, selectedSongKey: null, shareId: null, shareUrl: null, whatsappUrl: null });
    festCards.forEach(c => c.classList.remove('selected'));
    imgPreview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    changeBtn.classList.add('hidden');
    uploadZone.classList.remove('has-image');
    if (imgPreview.src && imgPreview.src.startsWith('blob:')) URL.revokeObjectURL(imgPreview.src);
    imgInput.value = ''; senderInput.value = ''; msgTextarea.value = '';
    nameCount.textContent = '0/60'; msgCount.textContent = '0/500';
    audioInput.value = ''; hideAudioStatus();
    document.querySelectorAll('.song-card').forEach(c => c.classList.remove('selected'));
    validate();
  }

  /* ══ 9. TOAST ════════════════════════════════════════════════════════════ */
  function showToast(msg, type) {
    const t = document.createElement('div');
    t.className = 'fw-toast fw-toast-' + (type || 'info');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
  }

  /* ══ INIT ════════════════════════════════════════════════════════════════ */
  // Warn immediately if opened incorrectly
  (function checkEnv() {
    const isFile = location.protocol === 'file:';
    const isGH   = location.hostname.includes('github');
    if (isFile || isGH) {
      const b = document.createElement('div');
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;padding:12px 16px;font-size:13px;font-family:sans-serif;text-align:center;line-height:1.5';
      b.innerHTML = isFile
        ? '⚠️ <b>Open via server, not as a file.</b> In Termux run <code style="background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:3px">npm start</code> then open <b>http://localhost:3000</b> in your browser.'
        : '⚠️ <b>GitHub cannot run this app.</b> Deploy to <b>Render.com</b> and open your Render URL instead.';
      document.body.prepend(b);
    }
  })();

  loadSongs();
  validate();

})();
    
