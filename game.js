/* 긴급 출동! 생태계 구조대 — 과학 4-2 2. 생물과 환경 8차시 개인용 미션 게임 */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const stage = $('#stage');

const KEY = 'ecoRescue_v1';
const ICON_ON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b4636" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#ffd25a"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const ICON_OFF = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b4636" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#e6d9b5"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

/* ---------------- state ---------------- */
const S = Object.assign({ name: '', num: '', leaves: 0, keys: 0, ckpt: 0, notes: {}, choices: [], promise: {}, r1: null, r2: null, sound: true, done: false },
  JSON.parse(localStorage.getItem(KEY) || '{}'));
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
function hud() {
  $('#hud').classList.remove('hidden');
  $('#hudName').textContent = (S.num ? S.num + '번 ' : '') + (S.name || '구조대원');
  $('#hudLeaves').textContent = S.leaves;
  $$('#hudKeys i').forEach((el, i) => { const L = ['생', '태', '계'][i]; el.textContent = i < S.keys ? L : '?'; el.classList.toggle('on', i < S.keys); });
  $('#btnSound').innerHTML = S.sound ? ICON_ON : ICON_OFF;
}
function addLeaves(n) {
  if (!n) return; S.leaves += n; save(); hud();
  const el = $('#hudLeaves'); el.parentElement.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 400 });
  toast(`나뭇잎 +${n}`);
}
let toastT; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1300); }

/* ---------------- audio (Web Audio: works on iPad/Chromebook/PC) ---------------- */
let AC = null, master = null, bgGain = null;
const BUF = {}, LOADING = {};
const ALL_AUDIO = ['click', 'correct', 'wrong', 'key', 'whoosh', 'munch', 'ouch', 'clear', 'unlock', 'beep', 'sos', 'stamp', 'splash', 'combo', 'place', 'pickup', 'build_done', 'hop', 'bgm_ocean', 'bgm_forest', 'bgm_vault', 'bgm_win', 'v_intro', 'v_m1', 'v_jelly', 'v_game1', 'v_game2', 'v_m2', 'v_m3', 'v_bye'];
function ctx() {
  if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination); bgGain = AC.createGain(); bgGain.gain.value = 0; bgGain.connect(master); }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function loadBuf(n) {
  if (BUF[n]) return Promise.resolve(BUF[n]);
  if (!LOADING[n]) LOADING[n] = fetch('audio/' + n + '.mp3').then(r => r.arrayBuffer()).then(ab => new Promise((ok, no) => ctx().decodeAudioData(ab, ok, no))).then(b => (BUF[n] = b)).catch(() => null);
  return LOADING[n];
}
function preloadAll() { ALL_AUDIO.forEach(loadBuf); }
function playBuf(n, vol = 1, dest = null, loop = false) {
  if (!S.sound || !AC) return null;
  const b = BUF[n]; if (!b) { loadBuf(n); return null; }
  const src = AC.createBufferSource(); src.buffer = b; src.loop = loop;
  const g = AC.createGain(); g.gain.value = vol; src.connect(g); g.connect(dest || master); src.start(); src._g = g; return src;
}
function sfx(n, vol = .7) { if (!S.sound || !AC) return; if (BUF[n]) playBuf(n, vol); else loadBuf(n).then(() => playBuf(n, vol)); }
let bgSrc = null, bgName = null; const bgVol = .26;
function ramp(param, to, sec) { const t = AC.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + sec); }
function bgm(n) {
  if (n === bgName) return; bgName = n;
  if (!AC) return;
  if (bgSrc) { const old = bgSrc; ramp(old._g.gain, 0, .6); setTimeout(() => { try { old.stop(); } catch (e) { } }, 700); bgSrc = null; }
  if (!n) return;
  loadBuf(n).then(() => { if (bgName !== n || !S.sound) return; bgSrc = playBuf(n, 0, bgGain, true); if (bgSrc) { bgGain.gain.value = bgVol; ramp(bgSrc._g.gain, 1, 1); } });
}
let voSrc = null, voPlaying = false;
function voice(n) {
  if (voSrc) { try { voSrc.stop(); } catch (e) { } voSrc = null; voPlaying = false; }
  if (!S.sound || !n || !AC) return;
  loadBuf(n).then(() => {
    voSrc = playBuf(n, 1); if (!voSrc) return; voPlaying = true; ramp(bgGain.gain, .07, .25);
    const me = voSrc; me.onended = () => { if (voSrc === me) { voPlaying = false; ramp(bgGain.gain, bgVol, .5); } };
  });
}
function blip() {
  if (!S.sound || !AC) return;
  try { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = 520 + Math.random() * 380;
    g.gain.setValueAtTime(.035, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + .06); o.connect(g); g.connect(master); o.start(); o.stop(AC.currentTime + .07); } catch (e) { }
}
$('#btnSound').onclick = () => {
  S.sound = !S.sound; save(); hud(); ctx();
  if (!S.sound) { master.gain.value = 0; if (voSrc) { try { voSrc.stop(); } catch (e) { } } }
  else { master.gain.value = 1; const n = bgName; bgName = null; bgm(n); }
};

/* ---------------- motion helpers ---------------- */
function scene(html, cls = '') {
  stage.innerHTML = '';
  const d = document.createElement('div'); d.className = 'scene ' + cls; d.innerHTML = html;
  stage.appendChild(d); window.scrollTo(0, 0);
  return d;
}
async function wipe(fn) { const w = $('#wipe'); sfx('whoosh', .35); w.classList.add('on'); await sleep(460); if (fn) await fn(); w.classList.remove('on'); await sleep(200); }
const cv = $('#confetti'), cx = cv.getContext('2d'); let parts = [], raf = 0;
function sizeCv() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener('resize', sizeCv); sizeCv();
function confetti(n = 70, kind = 'mix') {
  const cols = ['#ffd25a', '#ff8c7a', '#6cc070', '#8fd6f0', '#b9a6e8', '#fff'];
  for (let i = 0; i < n; i++) parts.push({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 5, r: Math.random() * 7 + 5, c: rand(cols), a: Math.random() * 6, va: (Math.random() - .5) * .3, leaf: kind === 'leaf' || (kind === 'mix' && Math.random() < .35), life: 1 });
  if (!raf) loop();
  function loop() {
    cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .45; p.vx *= .99; p.a += p.va; p.life -= .008;
      cx.save(); cx.globalAlpha = Math.max(0, p.life); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.leaf ? '#6cc070' : p.c;
      if (p.leaf) { cx.beginPath(); cx.ellipse(0, 0, p.r * 1.4, p.r * .7, 0, 0, Math.PI * 2); cx.fill(); cx.strokeStyle = '#4f9b52'; cx.beginPath(); cx.moveTo(-p.r, 0); cx.lineTo(p.r, 0); cx.stroke(); }
      else cx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6);
      cx.restore(); });
    parts = parts.filter(p => p.y < innerHeight + 40 && p.life > 0);
    if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }
}
function flyKey(letter) {
  const el = document.createElement('div'); el.textContent = letter;
  Object.assign(el.style, { position: 'fixed', left: '50%', top: '45%', zIndex: 70, fontFamily: 'Jua', fontSize: '90px', width: '130px', height: '130px', borderRadius: '50%', background: '#ffd25a', display: 'grid', placeItems: 'center', boxShadow: '0 8px 0 #d9a92c', transform: 'translate(-50%,-50%)' });
  document.body.appendChild(el);
  const t = $$('#hudKeys i')[S.keys - 1].getBoundingClientRect();
  el.animate([{ transform: 'translate(-50%,-50%) scale(1)', left: '50%', top: '45%' }, { transform: 'translate(-50%,-50%) scale(.25)', left: t.left + t.width / 2 + 'px', top: t.top + t.height / 2 + 'px' }], { duration: 900, easing: 'cubic-bezier(.6,-0.3,.4,1.2)' }).onfinish = () => { el.remove(); hud(); };
}
const btn = (t, cls = '') => `<button class="btn ${cls}">${t}</button>`;
function waitClick(el) { return new Promise(r => { el.addEventListener('click', () => { sfx('click', .5); r(); }, { once: true }); }); }

/* ---------------- dialog ---------------- */
function talk(lines, { v = null, img = null, who = 'img/mascot.webp', name = '꼬북이' } = {}) {
  return new Promise(res => {
    const d = scene(`${img ? `<div class="scenebg"><img src="${img}" alt=""></div>` : ''}
      <div class="talk"><img class="who" src="${who}" alt=""><div class="bubble"><span class="nm">${name}</span><div class="tx"></div><span class="more">▼</span></div></div>
      <p class="hint" style="text-align:center">말풍선을 누르면 다음으로 넘어가요</p>`);
    voice(v);
    const tx = $('.tx', d), more = $('.more', d); let i = 0, typing = false, full = '', timer = null;
    function type() {
      full = lines[i]; typing = true; more.style.visibility = 'hidden'; let k = 0; tx.innerHTML = '';
      clearInterval(timer);
      timer = setInterval(() => {
        k++; tx.innerHTML = full.slice(0, k);
        if (k % 2 === 0 && !voPlaying) blip();
        if (k >= full.length) { clearInterval(timer); typing = false; more.style.visibility = 'visible'; }
      }, 34);
    }
    type();
    $('.talk', d).onclick = () => {
      if (typing) { clearInterval(timer); tx.innerHTML = full; typing = false; more.style.visibility = 'visible'; return; }
      sfx('click', .4); i++;
      if (i < lines.length) type(); else res();
    };
  });
}

/* ---------------- building blocks ---------------- */
function quiz({ tag = '퀴즈', tc = '', q, img = null, opts, ans, hint, explain, pts = 30, vq = null }) {
  return new Promise(res => {
    let tries = 0;
    const d = scene(`<div class="card"><div class="title-tag ${tc}">${tag}</div>
      <div class="row">${img ? `<div class="col" style="flex:.8"><img class="pic sq" src="${img}" alt=""></div>` : ''}
      <div class="col"><h2 class="q">${q}</h2><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="l">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}</div></div></div>
      <div class="fb"></div></div>`);
    if (vq) voice(vq);
    $$('.opt', d).forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (i === ans) {
        b.classList.add('right'); $$('.opt', d).forEach(x => x.disabled = true); sfx('correct'); confetti(60);
        addLeaves(tries ? 10 : pts);
        $('.fb', d).innerHTML = `<div class="card paper" style="margin-top:20px;animation:rise .4s"><div class="title-tag forest">딩동댕! 정답</div>${explain}</div><div class="next-row">${btn('다음 ▶')}</div>`;
        $('.fb', d).scrollIntoView({ behavior: 'smooth', block: 'center' });
        waitClick($('.fb .btn', d)).then(() => res(tries));
      } else {
        tries++; b.classList.add('wrong'); b.disabled = true; sfx('wrong');
        const c = $('.card', d); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
        $('.fb', d).innerHTML = `<div class="talk" style="cursor:default"><img class="who" style="width:110px" src="img/mascot.webp"><div class="bubble" style="min-height:0;padding:22px 26px"><span class="nm">힌트</span><div class="tx" style="font-size:21px">${hint}</div></div></div>`;
      }
    });
  });
}
function info({ tag = '알아보기', tc = 'forest', title = '', html = '', img = null, src = '', next = '다음 ▶' }) {
  return new Promise(res => {
    const d = scene(`<div class="card"><div class="title-tag ${tc}">${tag}</div>${title ? `<h2 class="q">${title}</h2>` : ''}
      <div class="row">${img ? `<div class="col" style="flex:.8"><img class="pic sq" src="${img}" alt=""></div>` : ''}<div class="col">${html}</div></div>
      ${src ? `<div class="src">출처: ${src}</div>` : ''}</div><div class="next-row">${btn(next)}</div>`);
    waitClick($('.next-row .btn', d)).then(res);
  });
}
function write({ tag = '나의 생각', tc = 'gold', q, ph = '여기에 써요', key, ex = [], note = '실험관찰 27쪽에도 옮겨 써요', min = 4 }) {
  return new Promise(res => {
    const d = scene(`<div class="card paper"><div class="title-tag ${tc}">${tag}</div><h2 class="q">${q}</h2>
      ${ex.length ? `<div class="grid g3" style="margin-bottom:12px">${ex.map(e => `<button class="chip">${e}</button>`).join('')}</div><p class="hint">예시를 눌러도 되고, 내 말로 바꿔 써도 좋아요.</p>` : ''}
      <textarea rows="3" placeholder="${ph}">${S.notes[key] || ''}</textarea><p class="hint">${note}</p></div>
      <div class="next-row">${btn('저장하고 다음 ▶')}</div>`);
    const ta = $('textarea', d), b = $('.next-row .btn', d);
    $$('.chip', d).forEach(c => c.onclick = () => { sfx('click', .4); ta.value = (ta.value ? ta.value.trim() + ', ' : '') + c.textContent; ta.dispatchEvent(new Event('input')); });
    const chk = () => b.disabled = ta.value.trim().length < min; ta.oninput = chk; chk();
    b.onclick = () => { S.notes[key] = ta.value.trim(); save(); sfx('stamp', .5); addLeaves(15); res(); };
  });
}
async function missionCard(n, title, sub, color, img, v) {
  await wipe(() => {
    const d = scene(`<div class="scenebg" style="position:relative"><img src="${img}" style="max-height:62vh;filter:saturate(1.1)" alt="">
      <div style="position:absolute;left:4%;bottom:8%;right:4%">
        <div class="jua" style="display:inline-block;background:${color};color:#fff;font-size:24px;padding:8px 22px;border-radius:999px;transform:rotate(-3deg);box-shadow:0 5px 0 rgba(0,0,0,.18);animation:pop .6s">MISSION ${n}</div>
        <div class="jua" style="font-size:clamp(44px,7vw,84px);color:#fff;text-shadow:0 6px 0 rgba(0,0,0,.25);margin-top:6px;animation:rise .8s .15s both">${title}</div>
        <div class="jua" style="font-size:22px;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.25);animation:rise .8s .35s both">${sub}</div></div></div>
      <div class="next-row">${btn('출동 ▶', 'sun big')}</div>`);
    d.dataset.k = 'mc';
  });
  sfx('sos', .45);
  await waitClick($('.next-row .btn'));
}
async function getKey(i) {
  const L = ['생', '태', '계'][i];
  S.keys = Math.max(S.keys, i + 1); save();
  bgm(null);
  const d = scene(`<div class="card" style="text-align:center"><div class="title-tag gold">MISSION ${i + 1} CLEAR!</div>
    <h2 class="q" style="margin-top:14px">열쇠 글자 ${i + 1}번째를 얻었어요!</h2><div class="bigkey">${L}</div>
    <p class="big">모은 글자는 마지막 금고를 여는 열쇠예요.</p></div><div class="next-row">${btn('섬 지도로 ▶', 'sun big')}</div>`);
  sfx('clear', .8); confetti(140); setTimeout(() => sfx('key'), 900);
  await waitClick($('.next-row .btn', d)); flyKey(L); await sleep(700);
}

/* ---------------- arcade: 꼬북이 먹이 찾기 ---------------- */
const IMG = {}; [['turtle', 'turtle'], ['jelly', 'sp_jelly'], ['bag', 'bag']].forEach(([n, f]) => { IMG[n] = new Image(); IMG[n].src = `img/${f}.webp`; });
function arcade({ secs = 25, bagRate = .55, label = '1라운드', endless = false }) {
  return new Promise(res => {
    const d = scene(`<div class="card" style="padding:16px"><div class="title-tag">${label}</div>
      <div class="arcade"><canvas width="960" height="540"></canvas>
      <div class="ahud"><span>남은 시간 <b class="t">${secs}</b>초</span><span><img class="hi" src="img/sp_jelly.webp"> <b class="j">0</b> &nbsp; <img class="hi" src="img/bag.webp"> <b class="b">0</b></span></div><div class="center"><b class="cd"></b></div></div>
      <p class="hint" style="text-align:center;margin:10px 0 0">화면을 누른 채 움직이거나 ↑↓←→ 키로 꼬북이를 움직여요. 해파리는 먹고, 비닐봉지는 피해요!</p></div>
      ${endless ? `<div class="next-row">${btn('그만하기', 'ghost')}</div>` : ''}`);
    const c = $('canvas', d), g = c.getContext('2d'), W = 960, H = 540;
    const P = { x: 170, y: 270, tx: 170, ty: 270, hurt: 0, eat: 0 };
    let items = [], bubbles = [], pops = [], jelly = 0, bag = 0, t = 0, spawn = 0, running = false, last = 0, alive = true, over = false;
    for (let i = 0; i < 40; i++) bubbles.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 5 + 2, v: Math.random() * 30 + 15 });
    function pos(e) { const r = c.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return { x: (p.clientX - r.left) / r.width * W, y: (p.clientY - r.top) / r.height * H }; }
    const mv = e => { const p = pos(e); P.tx = Math.max(60, Math.min(560, p.x)); P.ty = Math.max(40, Math.min(H - 40, p.y)); e.preventDefault(); };
    c.addEventListener('pointerdown', mv); c.addEventListener('pointermove', e => { if (e.buttons || e.pointerType !== 'mouse') mv(e); else mv(e); });
    c.addEventListener('touchmove', mv, { passive: false });
    const keys = {}; const kd = e => { keys[e.key] = e.type === 'keydown'; }; addEventListener('keydown', kd); addEventListener('keyup', kd);
    function draw(dt) {
      // water
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#a9ecf2'); gr.addColorStop(1, '#2fa6c4'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = .18; g.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) { const x = (i * 230 + t * 20) % (W + 300) - 150; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x - 80, H); g.lineTo(x - 150, H); g.fill(); }
      g.restore();
      // sand & seaweed
      g.fillStyle = '#f3dfa8'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, H - 26 - Math.sin(x * .02) * 8); g.lineTo(W, H); g.fill();
      for (let i = 0; i < 9; i++) { const bx = 60 + i * 110; g.strokeStyle = i % 2 ? '#5cbf7a' : '#3fa864'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, H - 20); for (let k = 1; k <= 5; k++) g.lineTo(bx + Math.sin(t * 2 + i + k) * 10, H - 20 - k * 22); g.stroke(); }
      bubbles.forEach(b => { b.y -= b.v * dt; if (b.y < -10) { b.y = H + 10; b.x = Math.random() * W; } g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(b.x + Math.sin(t * 2 + b.r) * 4, b.y, b.r, 0, 7); g.stroke(); });
      items.forEach(it => { const im = IMG[it.k]; const s = it.k === 'jelly' ? 74 : 80; g.save(); g.translate(it.x, it.y + Math.sin(t * 3 + it.p) * 10); g.rotate(Math.sin(t * 2 + it.p) * .15); g.drawImage(im, -s / 2, -s * im.height / im.width / 2, s, s * im.height / im.width); g.restore(); });
      // turtle
      g.save(); g.translate(P.x, P.y); g.rotate(Math.max(-.4, Math.min(.4, (P.ty - P.y) * .01)));
      if (P.hurt > 0) { g.translate(Math.sin(t * 60) * 5, 0); g.filter = 'sepia(1) hue-rotate(-50deg) saturate(3)'; }
      const tw = 150 * (1 + P.eat * .25); g.drawImage(IMG.turtle, -tw / 2, -tw * IMG.turtle.height / IMG.turtle.width / 2, tw, tw * IMG.turtle.height / IMG.turtle.width); g.restore();
      pops.forEach(p => { p.y -= 40 * dt; p.a -= dt; g.globalAlpha = Math.max(0, p.a); g.font = '34px Jua'; g.fillStyle = p.c || '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeText(p.t, p.x, p.y); g.fillText(p.t, p.x, p.y); g.globalAlpha = 1; });
      pops = pops.filter(p => p.a > 0);
    }
    function frame(ts) {
      if (!alive) return;
      const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts; t += dt;
      if (keys.ArrowUp) P.ty -= 420 * dt; if (keys.ArrowDown) P.ty += 420 * dt; if (keys.ArrowLeft) P.tx -= 420 * dt; if (keys.ArrowRight) P.tx += 420 * dt;
      P.tx = Math.max(60, Math.min(560, P.tx)); P.ty = Math.max(40, Math.min(H - 40, P.ty));
      const sp = P.hurt > 0 ? 3 : 9; P.x += (P.tx - P.x) * Math.min(1, sp * dt); P.y += (P.ty - P.y) * Math.min(1, sp * dt);
      P.hurt = Math.max(0, P.hurt - dt); P.eat = Math.max(0, P.eat - dt * 3);
      if (running) {
        spawn -= dt;
        if (spawn <= 0) { spawn = .5 + Math.random() * .3; items.push({ k: Math.random() < bagRate ? 'bag' : 'jelly', x: W + 60, y: 60 + Math.random() * (H - 140), v: 190 + Math.random() * 140 + t * 3, p: Math.random() * 6 }); }
        items.forEach(it => it.x -= it.v * dt);
        items = items.filter(it => {
          if (it.x < -80) return false;
          if (Math.hypot(it.x - P.x, it.y - P.y) < 62) {
            if (it.k === 'jelly') { jelly++; P.eat = 1; sfx('munch', .5); pops.push({ x: it.x, y: it.y, t: '냠!', c: '#ff6b8a', a: 1 }); }
            else { bag++; P.hurt = .7; sfx('ouch', .6); pops.push({ x: it.x, y: it.y, t: '앗!', c: '#7d6a58', a: 1 }); }
            $('.j', d).textContent = jelly; $('.b', d).textContent = bag; return false;
          }
          return true;
        });
        if (!endless) { const left = Math.max(0, secs - (t - t0)); $('.t', d).textContent = Math.ceil(left); if (left <= 0) finish(); }
      }
      draw(dt); requestAnimationFrame(frame);
    }
    let t0 = 0;
    async function start() { const cd = $('.cd', d); for (const n of ['3', '2', '1', '출발!']) { cd.textContent = n; cd.animate([{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300 }); sfx('click', .5); await sleep(700); } cd.textContent = ''; running = true; t0 = t; }
    function finish() { if (over) return; over = true; running = false; sfx('clear', .6); setTimeout(() => { alive = false; removeEventListener('keydown', kd); removeEventListener('keyup', kd); res({ jelly, bag }); }, 900); }
    if (endless) { $('.t', d).textContent = '∞'; waitClick($('.next-row .btn', d)).then(() => { alive = false; res({ jelly, bag }); }); }
    requestAnimationFrame(frame); start();
  });
}

/* ---------------- screens ---------------- */
async function title() {
  bgm(null);
  const has = S.ckpt > 0 && S.name;
  const d = scene(`<div class="title-wrap">
    <div style="position:relative"><div id="ocean3d" style="border-radius:40px;overflow:hidden;box-shadow:0 10px 0 rgba(120,90,60,.18);aspect-ratio:1/1;background:url(img/title.webp) center/cover"></div></div>
    <div><div class="sign"><div class="sub">과학 4-2 · 2. 생물과 환경</div><h1>긴급 출동!<br><span>생태계 구조대</span></h1><div class="sub">생태계 보전을 위해서 어떻게 해야 할까?</div></div>
    <div class="form">
      <label>내 번호와 이름을 알려 줘!</label>
      <div style="display:flex;gap:10px"><input id="inNum" type="number" min="1" max="40" placeholder="번호" style="width:30%" value="${S.num || ''}"><input id="inName" placeholder="이름" value="${S.name || ''}"></div>
      <button class="btn sun big" id="go">${has ? '이어서 하기 ▶' : '모험 시작 ▶'}</button>
      ${has ? `<button class="btn ghost" id="restart">처음부터 다시</button>` : ''}
      <p class="hint">이어폰을 끼면 더 재밌어요. 소리는 오른쪽 위 스피커 버튼으로 끄고 켤 수 있어요.</p>
    </div></div></div>`);
  import('./voxel.js').then(M => M.titleScene($('#ocean3d', d))).catch(e => console.warn(e));
  return new Promise(res => {
    const go = restart => {
      const nm = $('#inName', d).value.trim(); const nu = $('#inNum', d).value.trim();
      if (!nm) { $('#inName', d).classList.add('shake'); $('#inName', d).focus(); sfx('wrong'); return; }
      if (restart) { const snd = S.sound; Object.assign(S, { leaves: 0, keys: 0, ckpt: 0, notes: {}, choices: [], promise: {}, r1: null, r2: null, done: false, sound: snd }); }
      S.name = nm; S.num = nu; save(); sfx('click');
      ctx(); preloadAll();
      res();
    };
    $('#go', d).onclick = () => go(false);
    const r = $('#restart', d); if (r) r.onclick = () => go(true);
  });
}

async function islandMap(done) {
  bgm('bgm_ocean'); hud();
  const pins = [
    { n: 1, x: 62, y: 86, ic: 'img/mascot.webp', lb: '미션 1 · 바다의 SOS' },
    { n: 2, x: 42, y: 40, ic: 'img/sp_goral.webp', lb: '미션 2 · 생태계 지킴이 도감' },
    { n: 3, x: 84, y: 30, ic: 'img/vault.webp', lb: '미션 3 · 비밀 금고' }];
  const d = scene(`<div class="goal">오늘의 목표: 생태계를 지키기 위해 <span class="hl2">나</span>와 <span class="hl3">국가·사회</span>가 할 수 있는 일을 알고, 나의 실천을 정해요!</div>
    <div class="map"><img src="img/title.webp" alt="">
    ${pins.map(p => `<button class="pin ${p.n <= done ? 'done' : p.n === done + 1 ? 'next' : 'lock'}" data-n="${p.n}" style="left:${p.x}%;top:${p.y}%"><div class="dot">${p.n <= done ? '<span class="jua" style="font-size:20px">완료</span>' : `<img src="${p.ic}" alt="">`}</div><div class="lb">${p.lb}</div></button>`).join('')}
    </div><p class="hint" style="text-align:center">반짝이는 곳을 눌러 출동해요!</p>`);
  return new Promise(res => $$('.pin.next', d).forEach(p => p.onclick = () => { sfx('click'); res(); }));
}

/* ---- prologue ---- */
async function prologue() {
  bgm('bgm_ocean'); hud(); sfx('sos', .5);
  await talk([`삐뽀삐뽀! 긴급 출동!`, `안녕, 나는 꼬북이야!`, `바다랑 숲 친구들이 위험에 빠졌어.`, `나랑 같이 생태계 구조대가 되어 줄래?`], { v: 'v_intro', img: 'img/title.webp' });
  await quiz({ tag: 'SOS 신호 도착!', tc: 'coral', img: 'img/title.webp',
    q: `<span class="hl2">2026년 8월 27일</span>, 제주 중문색달해수욕장에서 바다거북들이 바다로 돌아갔어. 그중 여러 마리는 바다에서 <span class="hl">다쳐서 구조된</span> 거북이였대.<br><b>바다거북들은 왜 다쳤을까?</b>`,
    opts: ['길을 잃고 너무 멀리 헤엄쳐서', '버려진 그물·낚싯줄, 쓰레기에 걸리거나 삼켜서', '먹이를 너무 많이 먹어서'], ans: 1,
    hint: '바다에는 사람이 버린 물건이 많이 떠다녀요. 거북이 몸에 무엇이 걸릴 수 있을까?',
    explain: `<p class="big">바다거북은 <span class="hl">버려진 그물·낚싯줄(폐어구)</span>과 <span class="hl">바다 쓰레기</span>에 몸이 걸리거나, 쓰레기를 삼켜서 다쳐요. 사람들이 구조하고 치료해서 다시 바다로 보내 주었어요.</p><p class="big">바다거북 7종은 <b>모두 멸종위기종</b>이에요.</p><div class="src">출처: 해양수산부 보도자료(2026.8.26), KBS 뉴스(2026.8.27)</div>` });
  S.ckpt = Math.max(S.ckpt, 0.5); save();
}

/* ---- mission 1 ---- */
async function mission1() {
  await missionCard(1, '바다의 SOS', '바다거북을 살리기 위해 우리가 할 수 있는 일은?', '#3bb8a8', 'img/jelly.webp', 'v_m1');
  bgm('bgm_ocean');
  await talk(['바다에서 SOS 신호가 왔어!', '구조대, 출동!'], { v: 'v_m1', img: 'img/title.webp' });
  await talk(['으앙, 저게 해파리야, 비닐봉지야?', '너무 헷갈려!'], { v: 'v_jelly', img: 'img/jelly.webp' });
  await quiz({ tag: '꼬북이가 헷갈려!', img: 'img/jelly.webp', q: '바다거북이 아주 좋아하는 먹이는 <span class="hl2">해파리</span>야.<br>그런데 바다거북은 왜 <span class="hl">비닐봉지</span>를 삼키게 될까?',
    opts: ['비닐봉지가 달콤하고 맛있어서', '물속 비닐봉지가 해파리처럼 보여서', '비닐봉지를 장난감으로 생각해서'], ans: 1,
    hint: '그림을 다시 봐! 물속에서 해파리와 비닐봉지는 모양이 어때?',
    explain: '<p class="big">물속 비닐봉지는 해파리처럼 하늘하늘 떠다녀서 바다거북이 <span class="hl">먹이로 착각</span>해요. 삼킨 플라스틱은 <b>소화되지 않고 배 속에 쌓여서</b>, 배가 부르다고 착각해 진짜 먹이를 못 먹게 돼요.</p>' });
  await talk(['내가 해파리만 먹을 수 있게 도와줘!', '비닐봉지는 피해야 해!'], { v: 'v_game1' });
  const r1 = await arcade({ secs: 25, bagRate: .55, label: '꼬북이 먹이 찾기 · 1라운드' });
  S.r1 = r1; save(); addLeaves(Math.min(40, r1.jelly * 2));
  await info({ tag: '1라운드 결과', tc: 'coral', title: `해파리 ${r1.jelly}개를 먹고, 비닐봉지 ${r1.bag}개를 삼켰어요.`,
    html: `<p class="big">아무리 조심해도 바다에 비닐봉지가 너무 많으면 피하기 어려워요. 진짜 바다거북도 마찬가지예요.</p><p class="big">그럼 진짜 바다거북 배 속에는 플라스틱이 얼마나 있을까요? <b>숫자 탐정</b>이 되어 봐요!</p>`, img: 'img/turtle.webp' });
  await quiz({ tag: '숫자 탐정', img: 'img/cardnews.webp', q: '우리나라 바닷가에서 죽은 채 발견된 <span class="hl2">바다거북 34마리</span>를 과학자들이 조사했어요.<br><b>몇 마리의 배 속에서 플라스틱이 나왔을까요?</b>',
    opts: ['4마리', '14마리', '28마리'], ans: 2, hint: '교과서 52쪽 카드 뉴스를 봐요! "죽은 바다거북 10마리 중 ○마리"',
    explain: `<div class="turtles">${Array.from({ length: 10 }, (_, i) => `<img src="img/turtle.webp" class="${i < 8 ? '' : 'ok'}">`).join('')}</div>
      <p class="big"><span class="hl">34마리 중 28마리</span>, 10마리 중 약 8마리예요! 모두 <b>1,280조각</b>, 한 마리당 평균 <b>38조각</b>의 플라스틱을 삼켰어요.</p><div class="src">출처: 한국해양과학기술원 부검 조사(2022) – 경향신문(2025.9.10), WWF 한국본부(2025.5.22)</div>` });
  await write({ tag: '실험관찰 ①', q: '바다거북을 보호하려면 어떤 노력이 필요할까요? 한 줄로 써 봐요.', key: 'n1', ex: ['플라스틱 사용 줄이기', '바다에 쓰레기 버리지 않기', '비닐봉지 대신 장바구니 쓰기'] });
  await beach();
  await recycle();
  await straw();
  await cafe();
  await write({ tag: '실험관찰 ②', q: '바다거북을 살리기 위해 내가 할 수 있는 일을 써 봐요. (카페에서 한 실천도 좋아요!)', key: 'n2', ex: (S.choices.length ? S.choices : ['빨대 안 받기', '텀블러 쓰기', '장바구니 쓰기']).slice(0, 3).map(x => x === '텀블러' ? '텀블러 쓰기' : x === '머그잔' ? '매장에서는 머그잔 쓰기' : x), note: '실험관찰 27쪽 ②번에도 옮겨 써요' });
  await talk(['와, 네가 고른 실천 덕분에 바다 쓰레기가 확 줄었어!', '다시 한 번 해 보자!'], { v: 'v_game2' });
  const rate = Math.max(.1, .55 - .09 * S.choices.length);
  const r2 = await arcade({ secs: 25, bagRate: rate, label: '꼬북이 먹이 찾기 · 2라운드 (실천 후)' });
  S.r2 = r2; save(); addLeaves(Math.min(40, r2.jelly * 2));
  await info({ tag: '1라운드 vs 2라운드', tc: 'forest', title: '우리의 실천이 바다를 바꿔요!',
    html: `<div class="grid g2"><div class="stat"><span>1라운드 (실천 전)</span><b>비닐봉지 ${S.r1.bag}개</b><span>해파리 ${S.r1.jelly}개</span></div><div class="stat"><span>2라운드 (실천 후)</span><b style="color:#4f9b52">비닐봉지 ${r2.bag}개</b><span>해파리 ${r2.jelly}개</span></div></div>
      <p class="big">카페에서 거절한 일회용품: <b>${S.choices.length ? S.choices.join(', ') : '없음'}</b></p><p class="big">바다로 가는 플라스틱이 줄면 바다거북이 플라스틱을 덜 삼키게 돼요.</p>` });
  await quiz({ tag: '실천에도 힘의 세기가 있다?!', img: 'img/straw.webp', q: '빨대 쓰레기를 줄이는 <span class="hl">가장 힘센 방법</span>은 무엇일까요?',
    opts: ['다 쓴 빨대를 분리배출하기', '빨대를 씻어서 다시 쓰기', '처음부터 빨대를 받지 않기'], ans: 2, hint: '좋은 방법들이지만, 쓰레기가 아예 생기지 않는 방법은?',
    explain: `<div class="opts" style="gap:8px"><div class="opt right"><span class="l">1</span>처음부터 안 쓰기·줄이기 — 쓰레기가 아예 안 생겨요</div><div class="opt"><span class="l">2</span>다시 쓰기 — 쓰레기가 늦게 생겨요</div><div class="opt"><span class="l">3</span>분리배출 — 꼭 해야 하지만, 모두 다시 쓰이지는 않아요</div></div>
      <p class="big" style="margin-top:12px">2026년 기후에너지환경부: 모든 국민이 매일 <b>일회용 컵 1개(약 20g)</b>만 줄여도 가정에서 나오는 폐플라스틱의 <span class="hl">10%</span>를 줄일 수 있어요!</p><div class="src">출처: 기후에너지환경부 보도자료(2026.4.12)</div>` });
  await linkChain();
  await getKey(0); S.ckpt = 1; save();
}

async function straw() {
  const caps = ['길에 빨대를 버려요', '비에 쓸려 하수구로', '하천과 강으로 흘러가요', '바다까지 가요', '잘게 부서져요 (미세플라스틱)', '물고기가 조각을 먹어요'];
  let order = shuffle([1, 2, 3, 4, 5, 6]), picked = [], tries = 0;
  return new Promise(res => {
    const d = scene(`<div class="card"><div class="title-tag">빨대의 여행</div><h2 class="q">길에 버린 빨대 하나는 어디로 갈까요? <span class="hl2">일어나는 순서대로</span> 1번부터 눌러요!</h2>
      <div class="grid g3">${order.map(n => `<div class="tile" data-n="${n}"><img src="img/straw${n}.webp" alt=""><div class="cap">${caps[n - 1]}</div></div>`).join('')}</div>
      <div class="next-row">${btn('다시 고르기', 'ghost')}</div><div class="fb"></div></div>`);
    const tiles = $$('.tile', d);
    const reset = () => { picked = []; tiles.forEach(t => { t.classList.remove('sel', 'bad', 'good'); const nm = $('.num', t); if (nm) nm.remove(); }); };
    $('.next-row .btn', d).onclick = () => { sfx('click', .4); reset(); };
    tiles.forEach(t => t.onclick = () => {
      if (t.classList.contains('sel') || picked.length >= 6) return;
      sfx('click', .5); picked.push(+t.dataset.n); t.classList.add('sel'); t.insertAdjacentHTML('beforeend', `<div class="num">${picked.length}</div>`);
      if (picked.length === 6) {
        const ok = picked.every((n, i) => n === i + 1);
        if (ok) {
          tiles.forEach(x => x.classList.add('good')); sfx('correct'); confetti(90); addLeaves(tries ? 15 : 40);
          $('.fb', d).innerHTML = `<div class="card paper" style="margin-top:18px"><div class="title-tag forest">정답!</div><p class="big">내가 버린 빨대 하나가 → 강과 바다를 거쳐 → 잘게 부서지고 → 물고기 배 속으로 → <span class="hl">결국 우리 식탁까지</span> 돌아와요. 생태계의 생물은 먹고 먹히는 관계로 <b>모두 연결</b>되어 있어요.</p></div><div class="next-row">${btn('다음 ▶')}</div>`;
          waitClick($('.fb .btn', d)).then(res);
        } else {
          tries++; sfx('wrong'); picked.forEach((n, i) => { const t2 = tiles.find(x => +x.dataset.n === n); t2.classList.add(n === i + 1 ? 'good' : 'bad'); });
          $('.fb', d).innerHTML = `<p class="big" style="text-align:center">초록 테두리는 맞았고, 빨간 테두리는 순서가 달라요. 잠시 후 다시 골라요!</p>`;
          setTimeout(() => { reset(); $('.fb', d).innerHTML = ''; }, 1800);
        }
      }
    });
  });
}

async function actions() {
  const list = ['빨대 안 받기', '장바구니 들고 다니기', '다회용 물병(텀블러) 쓰기', '물티슈 대신 손수건', '마스크 끈 잘라서 버리기', '깨끗이 씻어 분리배출', '바닷가 쓰레기 되가져오기', '일회용 컵 대신 내 컵'];
  return new Promise(res => {
    const sel = new Set(S.choices);
    const d = scene(`<div class="card paper"><div class="title-tag gold">실험관찰 ②</div><h2 class="q">바다거북을 살리기 위해 <b>내가 할 수 있는 일</b> <span class="hl">3가지</span>를 골라요!</h2>
      <div class="grid g4">${list.map(t => `<button class="chip ${sel.has(t) ? 'on' : ''}">${t}</button>`).join('')}</div>
      <p class="big" style="margin-top:14px">내 생각을 하나 더 써 볼까요? (선택)</p><textarea rows="2" placeholder="예) 나는 급식 우유를 마실 때 빨대 대신 컵에 따라 마실래요">${S.notes.n2 || ''}</textarea>
      <p class="hint">실험관찰 27쪽 ②번에도 옮겨 써요</p></div><div class="next-row"><span class="jua cnt" style="font-size:22px;align-self:center"></span>${btn('이걸로 실천! ▶')}</div>`);
    const b = $('.next-row .btn', d), cnt = $('.cnt', d);
    const upd = () => { cnt.textContent = `${sel.size} / 3`; b.disabled = sel.size !== 3; };
    $$('.chip', d).forEach(c => c.onclick = () => { const t = c.textContent; if (sel.has(t)) { sel.delete(t); c.classList.remove('on'); } else if (sel.size < 3) { sel.add(t); c.classList.add('on'); c.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 250 }); } else { sfx('wrong', .4); return; } sfx('click', .5); upd(); });
    upd();
    b.onclick = () => { S.choices = [...sel]; S.notes.n2 = $('textarea', d).value.trim(); save(); sfx('stamp', .6); addLeaves(15); res(); };
  });
}

async function linkChain() {
  await quiz({ tag: '연결 고리를 찾아라!', q: '바다거북은 <span class="hl2">해파리</span>를 먹고, 해파리는 <span class="hl2">물고기 알과 새끼</span>를 먹어요.<br><b>바다거북이 사라지면 해파리는 어떻게 될까요?</b>',
    img: 'img/jelly.webp', opts: ['해파리가 많아질 수 있어요', '해파리가 적어질 수 있어요'], ans: 0, hint: '해파리를 먹던 동물이 사라지면, 해파리를 잡아먹는 동물이 줄어들어요. 그러면?',
    explain: `<div class="grid g4">${[['img/turtle.webp', '바다거북이 줄어요'], ['img/sp_jelly.webp', '해파리가 많아져요'], ['img/straw6.webp', '물고기 알·새끼가 줄어요'], ['img/bird.webp', '바닷새와 사람도 곤란해요']].map(([im, t], i) => `<div class="chip" style="cursor:default;animation:rise .4s ${i * .35}s both"><img src="${im}" style="height:70px;max-width:100%;object-fit:contain;border-radius:12px;display:block;margin:0 auto 6px">${t}${i < 3 ? ' →' : ''}</div>`).join('')}</div>
      <p class="big" style="margin-top:12px">한 생물에게 일어난 일이 <b>도미노처럼</b> 다른 생물에게 이어져요. 앞에서 배운 <b>먹이 관계</b> 기억나죠?</p>` });
  // fill blank ③
  return new Promise(res => {
    const bank = shuffle(['플라스틱', '생태계', '해파리', '종이', '바다거북만']);
    const ans = ['플라스틱', '생태계']; let fill = [];
    const d = scene(`<div class="card paper"><div class="title-tag gold">실험관찰 ③</div><h2 class="q">바다거북을 살리기 위한 노력은 생태계 보전과 어떤 관련이 있을까요? 빈칸을 채워요!</h2>
      <p class="big jua" style="font-size:clamp(22px,3vw,30px);line-height:2">바다거북을 살리기 위해 <span class="b0 chip" style="cursor:default;min-width:120px;display:inline-block">?</span> 사용을 줄이면 다른 생물과 <span class="b1 chip" style="cursor:default;min-width:120px;display:inline-block">?</span>를 보전하는 데에도 도움이 돼요.</p>
      <div class="grid g5">${bank.map(w => `<button class="chip w">${w}</button>`).join('')}</div><p class="hint">완성한 문장을 실험관찰 27쪽 ③번에 옮겨 써요</p></div><div class="fb"></div>`);
    const show = () => { [0, 1].forEach(i => $('.b' + i, d).textContent = fill[i] || '?'); };
    $$('.w', d).forEach(b => b.onclick = () => {
      if (fill.length >= 2) return; sfx('click', .5); fill.push(b.textContent); b.classList.add('done'); show();
      if (fill.length === 2) {
        if (fill[0] === ans[0] && fill[1] === ans[1]) {
          sfx('correct'); confetti(70); addLeaves(25); $('.b0', d).classList.add('good'); $('.b1', d).classList.add('good'); S.notes.n3 = '바다거북을 살리기 위해 플라스틱 사용을 줄이면 다른 생물과 생태계를 보전하는 데에도 도움이 된다.'; save();
          $('.fb', d).innerHTML = `<div class="next-row">${btn('미션 완료! ▶', 'sun big')}</div>`; waitClick($('.fb .btn', d)).then(res);
        } else { sfx('wrong'); $('.card', d).classList.add('shake'); setTimeout(() => { fill = []; show(); $$('.w', d).forEach(x => x.classList.remove('done')); $('.card', d).classList.remove('shake'); }, 900); }
      }
    });
  });
}

/* ---- mission 2 ---- */
async function mission2() {
  await missionCard(2, '생태계 지킴이 도감', '나라와 사회는 생태계를 지키려고 무엇을 할까?', '#6cc070', 'img/bridge.webp', 'v_m2');
  bgm('bgm_forest');
  await talk(['이번엔 숲으로 가자!', '산양 친구가 기다리고 있어.'], { v: 'v_m2', img: 'img/goral.webp' });
  await quiz({ tag: '산양의 길이 막혔어요!', tc: 'forest', img: 'img/goral.webp', q: '2023년 겨울, 강원도 산에 <span class="hl2">눈이 아주 많이</span> 내렸어요. 멸종위기 동물 <span class="hl3">산양</span>은 먹이를 찾아 낮은 곳으로 내려가야 했는데…<br><b>산양의 길을 막은 것은?</b>',
    opts: ['산에 길게 세운 철망 울타리', '꽁꽁 얼어붙은 강', '사람들이 다니는 등산로'], ans: 0, hint: '사람이 만든 것이에요. 그림 속 산양 옆에 무엇이 있나요?',
    explain: `<p class="big">돼지 전염병(아프리카돼지열병)을 막으려고 세운 긴 울타리가 산양의 길도 막았어요. 그 겨울에만 산양 <span class="hl">785마리</span>가 죽은 채 발견됐어요. (평소 겨울엔 30마리쯤)</p>` });
  await fence();
  await info({ tag: '사람들의 노력', title: '끊어진 길을 다시 이어요', html: `<div class="timeline">
      <div class="tl"><h4>2023년 겨울</h4><p>눈 속에서 산양 785마리가 죽은 채 발견</p></div>
      <div class="tl"><h4>2024년 겨울</h4><p>먹이 주기, 울타리 44곳 열기 → 31마리로 크게 줄었어요</p></div>
      <div class="tl"><h4>2025년 11월</h4><p>설악산부터 울타리 철거 시작!</p></div>
      <div class="tl"><h4>2026년 지금</h4><p>철거가 계속되고 있어요 (아직 갈 길이 멀어요)</p></div></div>
      <p class="big" style="margin-top:14px">동물이 다니는 길이 끊기면 생태계가 위험해요. <b>끊어진 길을 이어 주는 것</b>도 국가와 사회의 생태계 보전 노력이에요.</p>`,
    src: '환경부(2025.4.10), 기후에너지환경부(2025.11.4), 한국일보(2025.11.27, 2026.10.15)' });
  await bridge();
  await quiz({ tag: '길 위의 길, 생태통로', tc: 'forest', img: 'img/bridge.webp', q: '국립공원 생태통로 16곳에 카메라를 달고 <b>10년 동안</b> 살펴봤어요.<br><b>몇 마리의 동물이 지나갔을까요?</b>',
    opts: ['약 100마리', '약 1,000마리', '약 10만 마리'], ans: 2, hint: '고라니, 너구리, 다람쥐, 멧돼지… 아주 많은 동물이 밤낮으로 지나가요!',
    explain: `<div class="grid g3"><div class="stat"><b style="color:#4f9b52">98,652마리</b><span>84종이 10년 동안 이용</span></div><div class="stat"><b style="color:#27978a">18%↓</b><span>만든 지 5년 지난 생태통로 주변 로드킬</span></div><div class="stat"><b>119,862건</b><span>2025년 우리나라 로드킬 (고라니가 가장 많아요)</span></div></div>
      <p class="big" style="margin-top:10px">오대산 월정사 가는 길의 생태통로는 로드킬이 <span class="hl">87.3%</span>나 줄었어요!</p><div class="src">출처: 국립공원공단(2026.4.8), 한국NGO신문(2026.6.7), 국립생태원 자료(2026.10.15 보도)</div>` });
  await matchGame();
  await treaty();
  await hope();
  await sortGame();
  await getKey(1); S.ckpt = 2; save();
}

function matchGame() {
  const L = [['물고기가 다니는 길', 0], ['투명한 벽의 무늬 스티커', 1], ['생태계 보호 구역', 2], ['물고기를 잡지 못하는 기간', 3]];
  const R = shuffle([['둑에 막힌 물고기가 오르내릴 수 있게 해요', 0], ['투명한 벽을 못 보고 부딪히는 새를 지켜요', 1], ['생물이 사는 곳을 통째로 지켜요 (예: 한려해상 국립공원)', 2], ['물고기가 알을 낳고 새끼가 자라는 때를 지켜요', 3]]);
  return new Promise(res => {
    const d = scene(`<div class="card"><div class="title-tag forest">짝 맞추기</div><h2 class="q">국가와 사회가 만든 장치예요. 누구를, 어떻게 지켜 줄까요? 왼쪽을 누르고 오른쪽 짝을 눌러요!</h2>
      <img class="pic" src="img/textbook53.webp" style="max-width:620px;margin:0 auto 14px" alt="교과서 53쪽 사진">
      <div class="match"><div class="opts">${L.map(([t, i]) => `<button class="chip l" data-i="${i}">${t}</button>`).join('')}</div><div class="opts">${R.map(([t, i]) => `<button class="chip r" data-i="${i}">${t}</button>`).join('')}</div></div><div class="fb"></div></div>`);
    let cur = null, done = 0, miss = 0;
    $$('.chip.l', d).forEach(b => b.onclick = () => { if (b.classList.contains('good')) return; $$('.chip.l', d).forEach(x => x.classList.remove('on')); b.classList.add('on'); cur = b; sfx('click', .4); });
    $$('.chip.r', d).forEach(b => b.onclick = () => {
      if (!cur || b.classList.contains('good')) return;
      if (cur.dataset.i === b.dataset.i) { cur.classList.remove('on'); cur.classList.add('good'); b.classList.add('good'); sfx('correct', .5); done++; cur = null;
        if (done === 4) { confetti(80); addLeaves(miss ? 15 : 30); $('.fb', d).innerHTML = `<p class="big" style="text-align:center">국가와 사회는 생물이 <b>이동하고, 쉬고, 새끼를 낳을 수 있게</b> 도와요!</p><div class="next-row">${btn('다음 ▶')}</div>`; waitClick($('.fb .btn', d)).then(res); } }
      else { miss++; sfx('wrong'); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 500); }
    });
  });
}
function treaty() {
  return new Promise(res => {
    const d = scene(`<div class="card"><div class="title-tag">바다는 모두 이어져 있어요</div>
      <p class="big">다른 나라의 쓰레기가 우리 바다로 오기도 하고, 우리 쓰레기가 다른 나라로 가기도 해요. 그래서 나라들이 함께 <span class="hl2">약속(국제 협약)</span>을 만들고 있어요.</p>
      <div class="timeline"><div class="tl"><h4>2024년 11월</h4><p>부산 회의 – 합의 못 했어요</p></div><div class="tl"><h4>2025년 8월</h4><p>스위스 제네바 – 또 합의 못 했어요</p></div><div class="tl"><h4>2026년</h4><p>새 의장을 뽑고 의견을 다시 모아요</p></div><div class="tl"><h4>2027년 3월</h4><p>다음 큰 회의가 열릴 예정이에요</p></div></div>
      <h2 class="q" style="margin-top:16px">내 생각은? 나라끼리 약속하기가 왜 어려울까요?</h2>
      <div class="opts"><button class="opt"><span class="l">A</span>나라마다 플라스틱으로 하는 일(산업)이 달라서</button><button class="opt"><span class="l">B</span>나라마다 돈과 기술이 달라서</button><button class="opt"><span class="l">C</span>모두의 생각을 하나로 모으기 어려워서</button></div>
      <div class="fb"></div><div class="src">출처: 데일리환경(2026.9.22), 기후에너지환경부(2026.4.28)</div></div>`);
    $$('.opt', d).forEach(b => b.onclick = () => {
      $$('.opt', d).forEach(x => x.disabled = true); b.classList.add('right'); sfx('correct', .5); addLeaves(10);
      $('.fb', d).innerHTML = `<div class="card paper" style="margin-top:14px"><p class="big">좋은 생각이에요! 정답이 하나인 문제는 아니에요. 실제로 이런 까닭들이 모두 얽혀 있어요. 그래도 나라들은 포기하지 않고 계속 이야기하고 있어요. 우리나라도 2026년 <b>플라스틱 줄이기 계획</b>을 세우고, 카페 안 일회용 종이컵 금지를 준비하고 있어요.</p></div><div class="next-row">${btn('다음 ▶')}</div>`;
      waitClick($('.fb .btn', d)).then(res);
    });
  });
}
function hope() {
  const cards = [['반달가슴곰', 'img/a_bear.webp', '2000년대 초 지리산에 약 5마리', '2025년 말 약 96마리!'], ['황새', 'img/a_stork.webp', '1970년대 우리나라에서 사라짐', '2026년 10월 야생에 약 300마리!'], ['따오기', 'img/a_ibis.webp', '2019년 처음 자연으로', '440마리 방사, 야생에서 3세대 탄생!']];
  return new Promise(res => {
    const d = scene(`<div class="card"><div class="title-tag forest">다시 돌아온 친구들</div><h2 class="q">사라질 뻔한 동물들이 돌아왔어요! 카드를 눌러 뒤집어 보세요.</h2>
      <img class="pic" src="img/hope.webp" style="max-height:32vh;margin-bottom:14px" alt="">
      <div class="grid g3">${cards.map(c => `<div class="flip"><div class="in"><div class="f"><img src="${c[1]}" style="height:150px;filter:drop-shadow(0 6px 0 rgba(0,0,0,.15))" alt="">${c[0]}<small style="font-size:15px;opacity:.85">눌러서 뒤집기</small></div><div class="b"><b>${c[0]}</b><p>${c[2]}</p><p style="font-family:Jua;font-size:22px;color:#ff8c7a">→ ${c[3]}</p></div></div></div>`).join('')}</div>
      <div class="fb"></div><div class="src">출처: 뉴스펭귄(2026.8.15, 국립공원공단 자료), 소년중앙(2026.10.18), 경남도민일보(2026.5.7)</div></div>`);
    let n = 0;
    $$('.flip', d).forEach(f => f.onclick = () => { if (f.classList.contains('open')) return; f.classList.add('open'); sfx('key', .5); n++;
      if (n === 3) { confetti(100, 'leaf'); addLeaves(15); $('.fb', d).innerHTML = `<p class="big" style="text-align:center;margin-top:14px">사람이 힘을 모으면 <span class="hl">사라졌던 생물도 다시 돌아올 수 있어요!</span></p><div class="next-row">${btn('다음 ▶')}</div>`; waitClick($('.fb .btn', d)).then(res); } });
  });
}
function sortGame() {
  const items = shuffle([['물 아껴 쓰기', 0], ['냉난방 온도 지켜 에너지 아끼기', 0], ['음식 남기지 않기', 0], ['생태통로 만들기', 1], ['걷기·자전거·대중교통 이용', 0], ['생태계 보호 구역 정하기', 1], ['친환경 비누·세제 쓰기', 0], ['물고기 잡지 않는 기간 정하기', 1], ['나라끼리 오염 줄이기 약속', 1], ['일회용품 줄이고 분리배출', 0]]);
  return new Promise(res => {
    let q = items.slice(), right = 0, wrong = 0, combo = 0; const total = items.length, got = { 0: [], 1: [] };
    const d = scene(`<div class="card"><div class="title-tag gold">실험관찰 · 조사해요</div><h2 class="q">누구의 노력일까요? 알맞은 바구니를 눌러요!</h2>
      <div class="tbar"><i class="pb" style="width:0%"></i></div><div class="sortcard">?</div>
      <div class="bins"><button class="bin me" data-k="0"><img src="img/i_me.webp" alt="">나·우리의 노력<small>개인이 할 수 있어요</small></button><button class="bin gov" data-k="1"><img src="img/i_gov.webp" alt="">국가·사회의 노력<small>나라·지역이 정해요</small></button></div><div class="fb"></div></div>`);
    const card = $('.sortcard', d);
    const showNext = () => { if (!q.length) return end(); card.textContent = q[0][0]; card.animate([{ transform: 'translateY(-30px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,1.4,.4,1)' }); };
    $$('.bin', d).forEach(b => b.onclick = () => {
      if (!q.length) return; const [t, k] = q[0];
      if (+b.dataset.k === k) { right++; combo++; got[k].push(t); q.shift(); sfx(combo >= 3 ? 'combo' : 'correct', .5); card.animate([{ transform: 'none' }, { transform: `translate(${k ? 160 : -160}px,120px) scale(.3)`, opacity: 0 }], { duration: 300 }); $('.pb', d).style.width = (right / total * 100) + '%'; setTimeout(showNext, 280); }
      else { wrong++; combo = 0; sfx('wrong'); card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 450); q.push(q.shift()); toast(k ? '나라·지역이 정하는 일이에요!' : '나도 할 수 있는 일이에요!'); setTimeout(showNext, 700); }
    });
    function end() {
      confetti(120); addLeaves(Math.max(10, 50 - wrong * 5)); S.notes.sort = got; save();
      d.querySelector('.card').innerHTML = `<div class="title-tag gold">실험관찰 · 조사해요 정리</div><div class="row"><div class="col"><h3 class="jua hl2" style="font-size:24px"><img src="img/i_me.webp" style="height:50px;vertical-align:middle"> 나·우리의 노력</h3><p class="big">${got[0].join('<br>')}</p></div><div class="col"><h3 class="jua hl3" style="font-size:24px"><img src="img/i_gov.webp" style="height:50px;vertical-align:middle"> 국가·사회의 노력</h3><p class="big">${got[1].join('<br>')}</p></div></div><p class="hint">실험관찰 27쪽 "조사해요"에 두 가지씩 옮겨 써요</p>`;
      d.insertAdjacentHTML('beforeend', `<div class="next-row">${btn('미션 완료! ▶', 'sun big')}</div>`); waitClick($('.next-row .btn', d)).then(res);
    }
    showNext();
  });
}

/* ---- mission 3 ---- */
async function mission3() {
  await missionCard(3, '비밀 금고', '퀴즈를 통과하고 마지막 열쇠로 금고를 열어라!', '#f0b23c', 'img/vault.webp', 'v_m3');
  bgm('bgm_vault');
  await talk(['마지막 미션이야.', '비밀 금고를 열 수 있겠어?'], { v: 'v_m3', img: 'img/vault.webp' });
  await write({ tag: '우리 동네 생태 탐정', tc: 'gold', q: '우리 동네(학교 주변)에서 본 생태계를 지키는 노력을 써 봐요.', key: 'local', ex: ['숲에 나무 심기·가로수 심기', '하천 청소 활동', '공원 쓰레기 줍기'], note: '교과서 53쪽 "한눈에 쏙 생각이 쑥" 2번이에요' });
  await oxRound();
  await getKey(2);
  await vault(); S.ckpt = 3; save();
}
function oxRound() {
  const Q = [['생태계 보전을 위해 우리가 할 수 있는 노력에는 에너지 절약, 일회용품 줄이기, 분리배출, 대중교통 이용 등이 있어요.', 'O', '모두 우리가 생활 속에서 할 수 있는 노력이에요.'],
    ['생태통로는 사람이 산책하라고 만든 다리예요.', 'X', '생태통로는 끊어진 서식지를 이어서 동물이 안전하게 지나가게 하는 길이에요.'],
    ['국가나 사회는 생태계 보호 구역이나 보호 기간을 정해서 생물을 지켜요.', 'O', '한려해상 국립공원 같은 보호 구역, 물고기를 잡지 못하는 기간이 예예요.'],
    ['분리배출만 잘하면 일회용 플라스틱을 마음껏 써도 괜찮아요.', 'X', '분리배출도 필요하지만, 가장 힘센 방법은 처음부터 줄이는 거예요.'],
    ['바다거북을 살리려고 플라스틱 사용을 줄이면 다른 생물과 생태계를 보전하는 데에도 도움이 돼요.', 'O', '생물은 먹이 관계로 연결되어 있어서 한 생물을 지키면 생태계 전체를 지켜요.']];
  return new Promise(res => {
    let q = Q.map((x, i) => [...x, i]), first = new Set(), combo = 0, tmr = null, solved = 0;
    const d = scene(`<div class="card"><div class="title-tag gold">스피드 OX 퀴즈</div><div style="display:flex;justify-content:space-between" class="jua"><span class="qn" style="font-size:22px"></span><span class="cb" style="font-size:22px;color:#ff8c7a"></span></div>
      <div class="tbar"><i class="tb"></i></div><h2 class="q qq" style="min-height:3.2em;text-align:center"></h2>
      <div class="ox"><button class="o">O</button><button class="x">X</button></div><div class="fb"></div></div>`);
    const show = () => {
      if (!q.length) { clearTimeout(tmr); confetti(120); return finish(); }
      const [t] = q[0]; $('.qq', d).textContent = t; $('.qn', d).textContent = `${solved + 1} / 5`; $('.cb', d).textContent = combo >= 2 ? `${combo} 콤보!` : ''; $('.fb', d).innerHTML = '';
      const tb = $('.tb', d); tb.style.transition = 'none'; tb.style.width = '100%'; void tb.offsetWidth; tb.style.transition = 'width 12s linear'; tb.style.width = '0%';
      clearTimeout(tmr); tmr = setTimeout(() => answer(null), 12000); lock = false;
    };
    let lock = false;
    const answer = a => {
      if (lock) return; lock = true; clearTimeout(tmr); const [t, ans, ex, id] = q[0];
      if (a === ans) { combo++; solved++; q.shift(); sfx(combo >= 2 ? 'combo' : 'correct', .6); if (!first.has(id)) addLeaves(20); confetti(40);
        $('.fb', d).innerHTML = `<p class="big" style="text-align:center;color:#4f9b52">정답! ${ex}</p>`; setTimeout(show, 1900); }
      else { combo = 0; first.add(id); q.push(q.shift()); sfx('wrong'); $('.card', d).classList.add('shake'); setTimeout(() => $('.card', d).classList.remove('shake'), 450);
        $('.fb', d).innerHTML = `<p class="big" style="text-align:center;color:#ff8c7a">${a === null ? '시간 초과!' : '아쉬워요!'} 정답은 <b>${ans}</b>. ${ex}<br><small>이 문제는 마지막에 한 번 더 나와요.</small></p>`; setTimeout(show, 3200); }
    };
    $('.o', d).onclick = () => answer('O'); $('.x', d).onclick = () => answer('X');
    function finish() { d.querySelector('.card').innerHTML = `<div class="title-tag gold">OX 통과!</div><h2 class="q" style="text-align:center">5문제를 모두 통과했어요!</h2>`; d.insertAdjacentHTML('beforeend', `<div class="next-row">${btn('마지막 열쇠 받기 ▶', 'sun big')}</div>`); waitClick($('.next-row .btn', d)).then(res); }
    show();
  });
}
function vault() {
  const SEQ = ['생', '태', '계'], KEYS = shuffle(['계', '숲', '생', '물', '태', '환']);
  return new Promise(res => {
    const d = scene(`<div class="card"><div class="title-tag gold">비밀 금고를 열어라!</div><div class="vault"><img class="pic sq vimg" src="img/vault.webp" alt="">
      <div><p class="big" style="text-align:center">모은 열쇠 글자 3개를 <b>미션 순서대로</b> 눌러요!</p><div class="slots"><i></i><i></i><i></i></div>
      <div class="pad">${KEYS.map(k => `<button>${k}</button>`).join('')}</div></div></div></div><div class="fb"></div>`);
    let st = 0; const slots = $$('.slots i', d);
    $$('.pad button', d).forEach(b => b.onclick = () => {
      if (st >= 3) return;
      if (b.textContent === SEQ[st]) { sfx('click'); slots[st].textContent = SEQ[st]; slots[st].classList.add('on'); st++;
        if (st === 3) openVault(); }
      else { sfx('beep'); $('.card', d).classList.add('shake'); setTimeout(() => $('.card', d).classList.remove('shake'), 450); st = 0; slots.forEach(s => { s.textContent = ''; s.classList.remove('on'); }); toast('삐빅! 미션 1 → 2 → 3 순서로!'); }
    });
    async function openVault() {
      bgm(null); sfx('unlock', .9); const im = $('.vimg', d);
      im.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08) rotate(-3deg)' }, { transform: 'scale(1.15) rotate(3deg)', filter: 'brightness(1.6)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 2200 });
      await sleep(2200); confetti(200); addLeaves(50);
      $('.fb', d).innerHTML = `<div class="card" style="margin-top:18px;text-align:center;animation:rise .6s"><div class="title-tag coral">금고가 열렸어요!</div><div class="jua" style="font-size:clamp(60px,10vw,110px);color:#4f9b52;animation:pop .8s">생태계</div>
        <p class="big jua" style="font-size:26px">일회용품의 사용을 줄이면 <span class="hl">생태계</span>를 보전하는 데 도움이 됩니다.</p><p class="hint">교과서 53쪽 "한눈에 쏙 생각이 쑥" 1번 정답!</p></div><div class="next-row">${btn('나의 약속 정하기 ▶', 'sun big')}</div>`;
      $('.fb', d).scrollIntoView({ behavior: 'smooth' }); waitClick($('.fb .btn', d)).then(res);
    }
  });
}
function promise() {
  const sug = { when: ['점심시간에', '편의점에 갈 때', '교실을 나갈 때', '양치할 때', '주말에'], where: ['급식실에서', '계산대에서', '교실에서', '화장실에서', '바닷가·공원에서'], what: ['음식 남기지 않기', '빨대·비닐봉지 안 받기', '전등 끄기', '물 잠그기', '쓰레기 되가져오기'] };
  return new Promise(res => {
    const P = Object.assign({ when: '', where: '', what: '' }, S.promise);
    const d = scene(`<div class="card paper"><div class="title-tag coral">나의 작은 약속 (이번 주)</div><h2 class="q">언제·어디서·무엇을 할지 정하면 더 잘 지킬 수 있어요!</h2>
      ${['when', 'where', 'what'].map((k, i) => `<p class="jua" style="font-size:22px;margin:12px 0 6px">${['언제', '어디서', '무엇을'][i]}</p><div class="grid g5">${sug[k].map(s => `<button class="chip s" data-k="${k}">${s}</button>`).join('')}</div><input class="pin-in" data-k="${k}" style="margin-top:8px;font-family:Jua;font-size:20px;border:3px solid #e6d9b5;border-radius:16px;padding:10px 14px;width:100%" placeholder="직접 써도 돼요" value="${P[k]}">`).join('')}
      <div class="card" style="margin-top:18px;text-align:center;background:#fff"><p class="big jua prev" style="font-size:26px"></p></div></div><div class="next-row">${btn('약속 도장 쾅! ▶', 'coral big')}</div>`);
    const b = $('.next-row .btn', d);
    const upd = () => { $$('.pin-in', d).forEach(i => P[i.dataset.k] = i.value.trim()); $('.prev', d).innerHTML = `<span class="hl2">${P.when || '언제'}</span> <span class="hl3">${P.where || '어디서'}</span> '<span class="hl">${P.what || '무엇을'}</span>' 꼭 지킬게요!`; b.disabled = !(P.when && P.where && P.what); };
    $$('.chip.s', d).forEach(c => c.onclick = () => { sfx('click', .4); $(`.pin-in[data-k="${c.dataset.k}"]`, d).value = c.textContent; $$(`.chip.s[data-k="${c.dataset.k}"]`, d).forEach(x => x.classList.remove('on')); c.classList.add('on'); upd(); });
    $$('.pin-in', d).forEach(i => i.oninput = upd); upd();
    b.onclick = () => { S.promise = P; save(); sfx('stamp'); confetti(60); addLeaves(20); res(); };
  });
}

/* ---- certificate ---- */
function rankOf(n) { return n >= 600 ? '전설의 구조대장' : n >= 450 ? '으뜸 구조대원' : n >= 300 ? '든든한 구조대원' : '새싹 구조대원'; }
async function makeCert() {
  await document.fonts.load('40px Jua'); await document.fonts.load('20px "Gowun Dodum"');
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1130; const g = c.getContext('2d');
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const [masc, bgim] = await Promise.all([load('img/mascot.webp'), load('img/title.webp')]);
  g.fillStyle = '#fffaea'; g.fillRect(0, 0, 1600, 1130);
  if (bgim) { g.globalAlpha = .13; g.drawImage(bgim, 0, 0, 1600, 1600 * bgim.height / bgim.width); g.globalAlpha = 1; }
  // leaf border
  g.strokeStyle = '#6cc070'; g.lineWidth = 22; g.strokeRect(36, 36, 1528, 1058); g.strokeStyle = '#f0b23c'; g.lineWidth = 6; g.strokeRect(70, 70, 1460, 990);
  for (let i = 0; i < 40; i++) { const x = 60 + i * 38.5; [[x, 38], [x, 1092]].forEach(([a, b]) => { g.save(); g.translate(a, b); g.rotate(i); g.fillStyle = i % 2 ? '#8fd17a' : '#4f9b52'; g.beginPath(); g.ellipse(0, 0, 14, 7, 0, 0, 7); g.fill(); g.restore(); }); }
  g.fillStyle = '#c9820a'; g.font = '92px Jua'; g.textAlign = 'center'; g.fillText('생태계 구조대 임명장', 800, 210);
  g.fillStyle = '#5b4636'; g.font = '30px Jua'; g.fillText('과학 4-2 · 2. 생물과 환경 · 생태계 보전', 800, 262);
  g.textAlign = 'left'; g.font = '58px Jua'; g.fillStyle = '#27978a'; g.fillText(`${S.num ? S.num + '번 ' : ''}${S.name}`, 150, 380);
  g.fillStyle = '#5b4636'; g.font = '34px Jua'; g.fillText(`등급: ${rankOf(S.leaves)}  ·  나뭇잎 ${S.leaves}개`, 150, 440);
  const body = '위 어린이는 바다거북과 산양, 그리고 모든 생물이 함께 사는 생태계를 지키는 방법을 배우고, 나와 국가·사회가 할 수 있는 노력을 조사하였으며, 생태계를 지키는 실천을 약속하였기에 생태계 구조대원으로 임명합니다.';
  g.font = '34px "Gowun Dodum"'; let y = 520, line = '';
  for (const w of body.split(' ')) { const tryL = line ? line + ' ' + w : w; if (g.measureText(tryL).width > 1000) { g.fillText(line, 150, y); y += 54; line = w; } else line = tryL; } g.fillText(line, 150, y);
  const pr = S.promise.when ? `${S.promise.when} ${S.promise.where} '${S.promise.what}' 꼭 지킬게요!` : '';
  g.fillStyle = '#fff3c4'; g.beginPath(); g.roundRect ? g.roundRect(140, y + 50, 1040, 120, 30) : g.rect(140, y + 50, 1040, 120); g.fill();
  g.fillStyle = '#ff8c7a'; g.font = '30px Jua'; g.fillText('나의 약속', 175, y + 98); g.fillStyle = '#5b4636'; g.font = '34px Jua'; g.fillText(pr.length > 38 ? pr.slice(0, 38) + '…' : pr, 175, y + 145);
  const dt = new Date(); g.font = '30px Jua'; g.fillStyle = '#7d6a58'; g.fillText(`${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일   4학년 소망반 생태계 구조대`, 150, 1000);
  if (masc) g.drawImage(masc, 1200, 360, 300, 300 * masc.height / masc.width);
  // stamp
  g.save(); g.translate(1340, 900); g.rotate(-.2); g.strokeStyle = '#e0453a'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 110, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 92, 0, 7); g.stroke();
  g.fillStyle = '#e0453a'; g.font = '40px Jua'; g.textAlign = 'center'; g.fillText('생태계', 0, -8); g.fillText('구조대', 0, 40); g.restore();
  return c;
}
async function certificate() {
  bgm('bgm_win');
  const c = await makeCert(); const url = c.toDataURL('image/png');
  const fname = `생태계구조대_임명장_${S.num || ''}${S.name}.png`;
  const d = scene(`<div class="card"><div class="title-tag coral">임명장 발급</div><h2 class="q" style="text-align:center">${S.name} 대원의 생태계 구조대 임명장</h2>
    <img id="certImg" src="${url}" alt="임명장">
    <div class="next-row" style="justify-content:center"><button class="btn sun big" id="dl">임명장 저장하기</button></div>
    <div class="steps"><div class="step"><b>임명장 저장하기</b>[임명장 저장하기]를 눌러요. 저장이 안 되면 임명장 그림을 꾹 눌러 "이미지 저장"을 해요.</div></div></div>
    <div class="next-row">${btn('다 했어요 ▶')}</div>`);
  sfx('stamp'); confetti(220);
  $('#dl', d).onclick = async () => {
    sfx('click');
    try {
      const blob = await (await fetch(url)).blob(); const file = new File([blob], fname, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPad|iPhone|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: '생태계 구조대 임명장' }); }
      else { const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); }
      toast('임명장을 저장했어요!');
    } catch (e) { toast('그림을 꾹 눌러 저장해 주세요'); }
  };
  
  S.done = true; S.ckpt = 4; save();
  await waitClick($('.next-row:last-child .btn', d));
}
async function finale() {
  bgm('bgm_ocean');
  await talk(['오늘 정말 고마웠어.', '다 같이 블루킷 대결에서 만나자!', '안녕!'], { v: 'v_bye', img: 'img/hope.webp' });
  while (true) {
    const d = scene(`<div class="card" style="text-align:center"><div class="title-tag">임무 완료!</div><img src="img/mascot.webp" style="width:180px;animation:bob 2s infinite" alt="">
      <h2 class="q">곧 다 같이 <span class="hl">블루킷 대결</span>을 해요!</h2><p class="big">선생님이 화면에 게임 코드를 띄우면 <b>play.blooket.com</b>에 들어가 코드를 입력해요.</p>
      <p class="big">나뭇잎: <b class="hl3">${S.leaves}개</b> · 등급: <b>${rankOf(S.leaves)}</b></p></div>
      <div class="next-row" style="justify-content:center">${btn('기다리는 동안 먹이 찾기 무한 모드', 'sun')}${btn('임명장 다시 보기', 'ghost')}</div>`);
    const [b1, b2] = $$('.next-row .btn', d);
    const ch = await new Promise(r => { b1.onclick = () => r(1); b2.onclick = () => r(2); });
    sfx('click');
    if (ch === 1) { bgm('bgm_ocean'); await arcade({ endless: true, bagRate: .3, label: '무한 모드' }); }
    else await certificate();
  }
}

/* ---------------- three.js title ocean ---------------- */
async function ocean3D(host) {
  try {
    const T = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const w = host.clientWidth, h = host.clientHeight;
    const r = new T.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(w, h); host.appendChild(r.domElement); host.style.background = 'linear-gradient(#bfefff,#7fd3e8)';
    const sc = new T.Scene(); sc.fog = new T.Fog(0xbfefff, 14, 38);
    const cam = new T.PerspectiveCamera(48, w / h, .1, 100); cam.position.set(0, 6, 16);
    sc.add(new T.HemisphereLight(0xffffff, 0x6fc8b0, 1.2)); const sun = new T.DirectionalLight(0xfff1c9, 1.4); sun.position.set(5, 10, 6); sc.add(sun);
    const geo = new T.PlaneGeometry(60, 60, 90, 90); geo.rotateX(-Math.PI / 2);
    const water = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0x46c6d8, roughness: .35, metalness: .05, flatShading: true, transparent: true, opacity: .95 })); sc.add(water);
    const base = geo.attributes.position.array.slice();
    // island
    const isl = new T.Mesh(new T.CylinderGeometry(3.2, 4.2, 1.6, 24), new T.MeshStandardMaterial({ color: 0xf3dfa8, flatShading: true })); isl.position.set(-4, .2, -6); sc.add(isl);
    const grass = new T.Mesh(new T.CylinderGeometry(2.6, 3, .6, 24), new T.MeshStandardMaterial({ color: 0x8fd17a, flatShading: true })); grass.position.set(-4, 1.2, -6); sc.add(grass);
    for (let i = 0; i < 3; i++) { const tr = new T.Mesh(new T.ConeGeometry(.8, 2, 7), new T.MeshStandardMaterial({ color: 0x4f9b52, flatShading: true })); tr.position.set(-4.8 + i * .9, 2.4, -6.3 + (i % 2) * .6); sc.add(tr); }
    // floating things: jellyfish & bags
    const floats = [];
    for (let i = 0; i < 14; i++) {
      const isBag = i % 3 === 0; let m;
      if (isBag) m = new T.Mesh(new T.IcosahedronGeometry(.45, 0), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .75, flatShading: true }));
      else { m = new T.Group(); const head = new T.Mesh(new T.SphereGeometry(.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xf6a5d0, transparent: true, opacity: .85, emissive: 0x6a2a50, emissiveIntensity: .2 })); m.add(head);
        for (let k = 0; k < 4; k++) { const tn = new T.Mesh(new T.CylinderGeometry(.03, .03, .7), new T.MeshStandardMaterial({ color: 0xf8c6e2 })); tn.position.set(Math.cos(k * 1.6) * .2, -.35, Math.sin(k * 1.6) * .2); m.add(tn); } }
      m.position.set((Math.random() - .5) * 18, .3, (Math.random() - .5) * 12); m.userData = { p: Math.random() * 6, s: .3 + Math.random() * .5, bag: isBag }; sc.add(m); floats.push(m);
    }
    // mascot sprite
    const tex = await new T.TextureLoader().loadAsync('img/mascot.webp'); tex.colorSpace = T.SRGBColorSpace;
    const spr = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true })); spr.scale.set(3.4, 3.4 * 520 / 340, 1); spr.position.set(2.5, 2.2, 3); sc.add(spr);
    let t = 0; const clock = new T.Clock(); let alive = true;
    const ro = new ResizeObserver(() => { const W = host.clientWidth, H = host.clientHeight; if (!W) return; r.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix(); }); ro.observe(host);
    (function anim() {
      if (!document.body.contains(host)) { alive = false; ro.disconnect(); r.dispose(); return; }
      const dt = clock.getDelta(); t += dt;
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const x = base[i], z = base[i + 2]; p[i + 1] = Math.sin(x * .45 + t * 1.3) * .28 + Math.cos(z * .5 + t * 1.1) * .25; }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      floats.forEach(m => { const u = m.userData; m.position.y = .35 + Math.sin(t * 1.5 + u.p) * .25; m.position.x += Math.sin(t * u.s + u.p) * .004; m.rotation.y += dt * (u.bag ? .6 : .3); if (u.bag) m.rotation.x += dt * .4; });
      spr.position.y = 2.2 + Math.sin(t * 1.6) * .25;
      cam.position.x = Math.sin(t * .15) * 3; cam.lookAt(0, 1, 0);
      r.render(sc, cam); requestAnimationFrame(anim);
    })();
  } catch (e) { console.warn('3D off', e); }
}

/* ---------------- main ---------------- */
/* ENTER_NAV: 키보드 Enter/Space로 말풍선·다음 버튼 진행 */
addEventListener('keydown', e => { if (!['Enter', ' '].includes(e.key)) return; const ae = document.activeElement; if (ae && /INPUT|TEXTAREA/.test(ae.tagName)) return;
  const tk = document.querySelector('.talk'); if (tk && tk.onclick) { e.preventDefault(); tk.onclick(); return; }
  const bs = [...document.querySelectorAll('.fb .btn, .next-row .btn')].filter(b => !b.disabled && b.offsetParent); if (bs.length) { e.preventDefault(); bs[bs.length - 1].click(); } });
addEventListener('DOMContentLoaded', async function main() {
  const qs = new URLSearchParams(location.search);
  if (qs.has('reset')) { localStorage.removeItem(KEY); location.replace(location.pathname); return; }
  addEventListener('pointerdown', () => { ctx(); }, { once: true });
  const dev = qs.get('scene'); if (dev) { hud(); const F = { bridge, fence, beach, recycle, cafe, linkChain, treaty, title: () => title(), straw, actions, quiz: () => quiz({ tag: '테스트', q: '테스트 질문', opts: ['가', '나', '다'], ans: 1, hint: '힌트', explain: '<p>설명</p>' }), sortGame, hope, matchGame, vault, oxRound, promise, certificate, arcade: () => arcade({ secs: 15 }) }; await F[dev](); return; }
  await title(); hud();
  const jump = qs.get('jump'); if (jump) S.ckpt = +jump;
  if (S.ckpt < 0.5) await prologue();
  if (S.ckpt < 1) { await islandMap(0); await mission1(); }
  if (S.ckpt < 2) { await islandMap(1); await mission2(); }
  if (S.ckpt < 3) { await islandMap(2); await mission3(); }
  if (S.ckpt < 4) { await promise(); await certificate(); }
  await finale();
});
