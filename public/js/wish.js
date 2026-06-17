/**
 * wish.js — FestWish cinematic wish experience
 * FIXES vs previous version:
 *  1. gsap.set() called BEFORE timeline so initial states are correct
 *  2. setupAudio() called after first user interaction, not inside GSAP timeline
 *  3. wish-card scroll enabled — overflow hidden removed from body in wish.css
 *  4. curtain-open CSS class works even when GSAP unavailable
 */
(function () {
  'use strict';

  const THEMES = {
    diwali:    { colors: ['#FFD600','#FF6B35','#FF9800'], bgFrom: '#1a0533', bgTo: '#0d0122' },
    holi:      { colors: ['#E91E8C','#4CAF50','#2196F3','#FF9800'], bgFrom: '#0d1a0a', bgTo: '#05100d' },
    christmas: { colors: ['#00BFA5','#E53935','#FFFFFF'], bgFrom: '#001a10', bgTo: '#000d08' },
    newyear:   { colors: ['#7B2FF7','#FFD600','#FF4081'], bgFrom: '#0a0520', bgTo: '#050010' },
    birthday:  { colors: ['#FF4081','#FFD600','#00BFA5'], bgFrom: '#1a0010', bgTo: '#0d000a' },
    sankranti: { colors: ['#FFD600','#FF9800','#FFEB3B'], bgFrom: '#1a1000', bgTo: '#0d0800' },
    navratri:  { colors: ['#FF9800','#E91E8C','#9C27B0'], bgFrom: '#1a0020', bgTo: '#0d0010' },
    eid:       { colors: ['#4CAF50','#FFD600','#00BFA5'], bgFrom: '#001a0d', bgTo: '#000d07' },
  };

  const wish  = window.__WISH_DATA__;
  const app   = document.getElementById('wish-app');

  if (!wish || !wish.shareId) {
    app.innerHTML = '<div class="error-screen"><div style="font-size:3rem">😔</div><h2>Wish Not Found</h2><p>This link may be invalid or expired.</p><a href="/">Create a New Wish</a></div>';
    return;
  }

  const theme = THEMES[wish.festival] || THEMES.diwali;

  /* ── Build DOM ──────────────────────────────────────────────────────────── */
  function buildUI() {
    app.innerHTML = `
      <div class="wish-bg">
        <canvas id="bg-canvas"></canvas>
        <div class="wish-bg-overlay"></div>
      </div>
      <canvas id="particles-canvas"></canvas>
      <div id="curtain-stage">
        <div class="curtain curtain-left"><div class="curtain-folds"></div></div>
        <div class="curtain curtain-right"><div class="curtain-folds"></div></div>
      </div>
      <div class="wish-card" id="wish-card">
        <div class="festival-badge" id="festival-badge">
          <span>${wish.festivalEmoji}</span><span>${wish.festivalName}</span>
        </div>
        <div class="photo-frame" id="photo-frame">
          <div class="photo-glow"></div>
          <div class="photo-glow-inner"></div>
          <img class="photo-img" id="photo-img" src="${wish.imageUrl}" alt="${wish.senderName}" crossorigin="anonymous">
        </div>
        <p class="wish-message" id="wish-message">"${wish.message}"</p>
        <p class="wish-sender" id="wish-sender">— with love from <span class="sender-name">${wish.senderName}</span></p>
      </div>
      <div class="cta-bar" id="cta-bar">
        <a href="/" class="cta-main-btn">&#10024; Create Your Own Wish</a>
        <div class="cta-share-row">
          <a href="${getWAUrl()}" target="_blank" rel="noopener" class="cta-share-btn wa">&#128172; Share</a>
          <button class="cta-share-btn copy" id="copy-link-btn">&#128203; Copy Link</button>
        </div>
      </div>`;

    document.getElementById('copy-link-btn').addEventListener('click', async () => {
      const btn = document.getElementById('copy-link-btn');
      try { await navigator.clipboard.writeText(location.href); }
      catch { prompt('Copy this link:', location.href); }
      btn.textContent = '\u2713 Copied!';
      setTimeout(() => (btn.textContent = '\uD83D\uDCCB Copy Link'), 2000);
    });
  }

  function getWAUrl() {
    const t = wish.festivalEmoji + ' ' + wish.senderName + ' sent you a ' + wish.festivalName + ' wish!\n\n' + location.href + '\n\nOpen for a magical surprise! \uD83C\uDF8A';
    return 'https://wa.me/?text=' + encodeURIComponent(t);
  }

  /* ── Background canvas ──────────────────────────────────────────────────── */
  function initBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
    resize(); window.addEventListener('resize', resize);

    const orbs = theme.colors.map((color, i) => ({
      x: (i * 0.4 + 0.2) * innerWidth, y: (i * 0.3 + 0.2) * innerHeight,
      r: 200 + i * 80, color, t: Math.random() * Math.PI * 2,
    }));

    (function loop() {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, theme.bgFrom); g.addColorStop(1, theme.bgTo);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      orbs.forEach(o => {
        o.t += 0.006;
        o.x += Math.sin(o.t) * 0.5; o.y += Math.cos(o.t * 0.7) * 0.5;
        const rg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        rg.addColorStop(0, hexRgba(o.color, 0.18)); rg.addColorStop(1, 'transparent');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill();
      });
      requestAnimationFrame(loop);
    })();
  }

  function hexRgba(hex, a) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  /* ── Particles ──────────────────────────────────────────────────────────── */
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
    resize(); window.addEventListener('resize', resize);

    const ps = Array.from({length:50}, () => {
      const o = { color: theme.colors[Math.floor(Math.random()*theme.colors.length)] };
      resetP(o, W, H, true); return o;
    });

    function resetP(p, W, H, init) {
      p.x = Math.random()*W; p.y = init ? Math.random()*H : H+10;
      p.r = 1+Math.random()*3; p.vx = (Math.random()-.5)*.3; p.vy = -.5-Math.random();
      p.alpha = 0; p.maxAlpha = .4+Math.random()*.4; p.life = 0; p.maxLife = 120+Math.random()*100;
    }

    (function loop() {
      ctx.clearRect(0,0,W,H);
      ps.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.life++;
        p.alpha = p.life<20 ? p.life/20*p.maxAlpha :
                  p.life>p.maxLife-20 ? (p.maxLife-p.life)/20*p.maxAlpha : p.maxAlpha;
        if (p.life>=p.maxLife||p.y<-10) resetP(p,W,H,false);
        ctx.save(); ctx.globalAlpha=p.alpha;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.shadowBlur=6; ctx.shadowColor=p.color; ctx.fill(); ctx.restore();
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ── Audio (FIX: setup after user gesture, not inside GSAP timeline) ─────── */
  let audioObj = null, audioReady = false;

  function setupAudio() {
    if (!wish.audioUrl || audioReady) return;
    audioReady = true;
    audioObj = new Audio(wish.audioUrl);
    audioObj.loop = true; audioObj.volume = 0;

    const toast = document.createElement('div');
    toast.className = 'music-unlock-toast';
    toast.textContent = '\uD83C\uDFB5 Tap anywhere for music';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);

    tryPlay();
    const unlock = () => { tryPlay(); document.removeEventListener('touchstart', unlock); document.removeEventListener('click', unlock); };
    document.addEventListener('touchstart', unlock);
    document.addEventListener('click', unlock);
  }

  function tryPlay() {
    if (!audioObj) return;
    audioObj.play().then(() => {
      document.querySelector('.music-unlock-toast')?.remove();
      fadeIn();
    }).catch(() => {});
  }

  function fadeIn() {
    let v = 0;
    const t = setInterval(() => { v = Math.min(v+.02, .45); audioObj.volume=v; if(v>=.45) clearInterval(t); }, 100);
  }

  /* ── Floating lights ────────────────────────────────────────────────────── */
  function startLights() {
    setInterval(() => {
      const l = document.createElement('div');
      l.className = 'floating-light';
      const c = theme.colors[Math.floor(Math.random()*theme.colors.length)];
      const d = 4+Math.random()*6;
      l.style.cssText = 'left:'+Math.random()*100+'%;width:'+(2+Math.random()*4)+'px;height:'+(2+Math.random()*4)+'px;background:'+c+';box-shadow:0 0 10px '+c+';animation-duration:'+d+'s;animation-delay:-'+(Math.random()*d)+'s';
      app.appendChild(l);
      setTimeout(() => l.remove(), d*1000);
    }, 350);
  }

  /* ── Fireworks ──────────────────────────────────────────────────────────── */
  function fireworks() {
    if (typeof confetti === 'undefined') return;
    const b = o => confetti({ particleCount:60, spread:70, startVelocity:45, colors:theme.colors, ...o });
    b({origin:{x:.5,y:.3}});
    setTimeout(()=>b({origin:{x:.2,y:.5},angle:60}), 400);
    setTimeout(()=>b({origin:{x:.8,y:.5},angle:120}), 700);
    setTimeout(()=>b({origin:{x:.5,y:.5},spread:120,particleCount:80}), 1200);
  }

  /* ── Sparkles ────────────────────────────────────────────────────────────── */
  function addSparkles() {
    const frame = document.getElementById('photo-frame');
    if (!frame) return;
    const r = Math.min(frame.offsetWidth/2, 140)+15;
    for (let i=0; i<8; i++) {
      const s = document.createElement('div');
      s.className = 'photo-sparkle';
      const c = theme.colors[i%theme.colors.length], d = 4+Math.random()*3;
      s.style.cssText = '--start-deg:'+(i*45)+'deg;--orbit-r:'+r+'px;top:50%;left:50%;margin:-3px 0 0 -3px;background:'+c+';box-shadow:0 0 8px '+c+';animation-duration:'+d+'s;animation-delay:-'+(Math.random()*d)+'s';
      frame.appendChild(s);
    }
  }

  /* ── Cinematic reveal ────────────────────────────────────────────────────── */
  function reveal() {
    const curtainL = document.querySelector('.curtain-left');
    const curtainR = document.querySelector('.curtain-right');
    const card     = document.getElementById('wish-card');
    const photo    = document.getElementById('photo-frame');
    const badge    = document.getElementById('festival-badge');
    const msg      = document.getElementById('wish-message');
    const sender   = document.getElementById('wish-sender');
    const cta      = document.getElementById('cta-bar');

    if (typeof gsap !== 'undefined') {
      // FIX: set initial states explicitly so elements don't flash at wrong opacity
      gsap.set(card,   { opacity: 0 });
      gsap.set(photo,  { opacity: 0, scale: 0.8 });
      gsap.set(badge,  { opacity: 0, y: -10 });
      gsap.set(msg,    { opacity: 0, y: 15 });
      gsap.set(sender, { opacity: 0, y: 15 });
      gsap.set(cta,    { opacity: 0, y: 20 });

      const tl = gsap.timeline({ delay: 0.3 });
      tl.to(curtainL, { x: '-100%', duration: 1.8, ease: 'power3.inOut' }, 0)
        .to(curtainR, { x: '100%',  duration: 1.8, ease: 'power3.inOut' }, 0)
        .to(card,   { opacity: 1,    duration: 0.1 }, 1.5)
        .to(photo,  { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }, 1.5)
        .to(badge,  { opacity: 1, y: 0, duration: 0.5 }, 2.1)
        .to(msg,    { opacity: 1, y: 0, duration: 0.7 }, 2.4)
        .to(sender, { opacity: 1, y: 0, duration: 0.5 }, 2.9)
        .to(cta,    { opacity: 1, y: 0, duration: 0.5 }, 3.3)
        .call(() => { fireworks(); startLights(); addSparkles(); setupAudio(); }, null, 1.8)
        .call(() => { const s = document.getElementById('curtain-stage'); if(s) s.style.display='none'; }, null, 3.5);
    } else {
      // CSS fallback
      card.style.opacity = '0';
      setTimeout(() => {
        document.getElementById('curtain-stage').classList.add('curtain-open');
        setTimeout(() => {
          card.style.opacity   = '1';
          card.style.transform = 'translateY(0)';
          card.style.transition = 'opacity .8s, transform .8s';
          photo.classList.add('animate-in');
          badge.classList.add('animate-in');
          msg.classList.add('animate-in');
          sender.classList.add('animate-in');
          cta.classList.add('show');
          fireworks(); startLights(); addSparkles(); setupAudio();
        }, 2000);
      }, 400);
    }
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */
  buildUI();
  initBgCanvas();
  initParticles();

  if (document.readyState === 'complete') reveal();
  else window.addEventListener('load', reveal);

})();
        
