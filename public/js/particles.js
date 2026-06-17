// particles.js — homepage ambient background particles
(function () {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const COLORS = ['#FFD600','#7B2FF7','#FF4081','#00BFA5','#FF9800','#fff'];
  const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  const ps = Array.from({length:60}, () => { const p={color:COLORS[Math.floor(Math.random()*COLORS.length)]}; reset(p,true); return p; });
  function reset(p,init) {
    p.x=Math.random()*W; p.y=init?Math.random()*H:H+10;
    p.r=1.5+Math.random()*2.5; p.vx=(Math.random()-.5)*.4; p.vy=-.6-Math.random()*.9;
    p.alpha=0; p.maxAlpha=.3+Math.random()*.4; p.life=0; p.maxLife=120+Math.random()*130;
  }
  (function loop() {
    ctx.clearRect(0,0,W,H);
    ps.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.life++;
      p.alpha = p.life<20?p.life/20*p.maxAlpha:p.life>p.maxLife-20?(p.maxLife-p.life)/20*p.maxAlpha:p.maxAlpha;
      if(p.life>=p.maxLife||p.y<-10) reset(p,false);
      ctx.save(); ctx.globalAlpha=p.alpha;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.shadowBlur=8; ctx.shadowColor=p.color; ctx.fill(); ctx.restore();
    });
    requestAnimationFrame(loop);
  })();
})();
        
