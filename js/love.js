/* 하트 보내기: 누를 때마다 하트·반짝이가 터지고, 모든 방문자의 하트 수를 합산해요. */
(function () {
  'use strict';

  /* ---------- 설정 ---------- */
  // Firebase Realtime Database 주소 (README의 "하트 카운터 설정" 참고)
  // 비워 두면 이 기기에서 누른 수만 세요.
  var FIREBASE_DB_URL = 'https://wedding-invitation-20a99-default-rtdb.asia-southeast1.firebasedatabase.app';
  var COUNT_PATH = '/love/count.json';

  var MESSAGES = [
    '행복하게 잘 살아!',
    '알콩달콩 백년해로!',
    '사랑이 퐁퐁 넘치길!',
    '매일매일 신혼처럼!',
    '평생 서로의 편이 되어주기!',
    '결혼 진심으로 축하해!',
    '꽃길만 걷자 🌷',
    '오늘보다 더 행복하길!'
  ];
  var COLORS = ['#b9dca4', '#a9cd96', '#cfe5bf', '#93bf80', '#eeaeb2', '#f3c6c7'];   // 모브 그린 하트 위주 + 핑크 포인트

  var stage = document.getElementById('loveStage');
  var btn = document.getElementById('loveBtn');
  var countEl = document.getElementById('loveCount');
  var tapHint = stage && stage.querySelector('.love__tap');
  if (!stage || !btn || !countEl) return;

  var rs = getComputedStyle(document.documentElement);
  var EASE_OUT = rs.getPropertyValue('--ease-out').trim() || 'ease-out';
  var EASE_IN = rs.getPropertyValue('--ease-in').trim() || 'ease-in';
  var EASE_SPRING = rs.getPropertyValue('--ease-spring').trim() || 'ease-out';
  var reduceMotion = false;   // '동작 줄이기'여도 같은 하트 연출 (반복되는 콩닥만 CSS에서 꺼요)
  var canAnimate = typeof Element !== 'undefined' && 'animate' in Element.prototype;

  /* ---------- 숫자 ---------- */
  var serverTotal = null;   // 서버에서 받은 전체 수
  var pending = 0;          // 아직 서버에 보내지 않은 내 하트
  var localKey = 'love-local-count';
  var localCount = 0;
  try { localCount = parseInt(localStorage.getItem(localKey), 10) || 0; } catch (e) {}

  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function render() {
    var n = FIREBASE_DB_URL ? (serverTotal === null ? null : serverTotal + pending) : localCount;
    countEl.textContent = n === null ? '···' : fmt(n);
  }
  function bumpCount() {
    if (!canAnimate || reduceMotion) return;
    countEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: .35 }, { transform: 'scale(1)' }],
      { duration: 320, easing: EASE_SPRING });
  }

  /* ---------- 서버 (Firebase REST) ---------- */
  var flushTimer = null, firstPending = 0, inFlight = false;

  function load() {
    if (!FIREBASE_DB_URL) { render(); return; }
    fetch(FIREBASE_DB_URL + COUNT_PATH, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (v) { if (!inFlight) { serverTotal = typeof v === 'number' ? v : 0; render(); } })
      .catch(function () { if (serverTotal === null) { serverTotal = 0; render(); } });
  }

  function flush(useBeacon) {
    clearTimeout(flushTimer); flushTimer = null;
    if (!FIREBASE_DB_URL || pending <= 0 || inFlight) return;
    var n = Math.min(pending, 100);   // 한 번에 최대 100개씩 (보안 규칙과 맞춰요)
    pending -= n; firstPending = 0; inFlight = true;
    fetch(FIREBASE_DB_URL + COUNT_PATH, {
      method: 'PUT',
      body: JSON.stringify({ '.sv': { increment: n } }),
      keepalive: !!useBeacon
    })
      .then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (v) { if (typeof v === 'number') serverTotal = v; })
      .catch(function () { pending += n; })          // 실패하면 다음에 다시 보내요
      .then(function () {
        inFlight = false; render();
        if (pending > 0) schedule();
      });
  }

  function schedule() {
    if (!firstPending) firstPending = Date.now();
    clearTimeout(flushTimer);
    // 연타가 멈추면 0.8초 뒤, 계속 눌러도 최소 3초마다 한 번 보내요
    var wait = Math.max(0, Math.min(800, 3000 - (Date.now() - firstPending)));
    flushTimer = setTimeout(flush, wait);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush(true);
    else load();
  });
  window.addEventListener('pagehide', function () { flush(true); });
  // 다른 하객이 누른 하트도 보이도록 가끔 새로 불러와요
  setInterval(function () {
    if (document.visibilityState === 'visible' && !pending && !inFlight) load();
  }, 15000);

  /* ---------- 애니메이션 ---------- */
  var active = 0, MAX_ACTIVE = 90;
  var lastMsgAt = 0, lastMsg = -1, msgs = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function burst(cx, cy, power) {
    if (!canAnimate) return;
    var n = reduceMotion ? 3 : Math.round(rand(7, 10) * power);
    for (var i = 0; i < n && active < MAX_ACTIVE; i++) {
      var isStar = Math.random() < 0.35;
      var el = document.createElement('span');
      var size = isStar ? rand(8, 14) : rand(11, 20);
      el.className = 'love__fx ' + (isStar ? 'love__fx--star' : 'love__fx--heart');
      el.style.width = size + 'px';
      el.style.height = (isStar ? size : size * 0.92) + 'px';
      el.style.background = isStar && Math.random() < 0.4 ? '#5b7a4d' : COLORS[(Math.random() * COLORS.length) | 0];
      el.style.left = cx + 'px'; el.style.top = cy + 'px';
      stage.appendChild(el);
      active++;

      var ang = (i / n) * Math.PI * 2 + rand(-0.4, 0.4);
      var dist = reduceMotion ? 0 : rand(64, 138);
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - rand(10, 30);
      var rot = rand(-50, 50);
      var dur = reduceMotion ? 500 : rand(650, 1000);
      var a = el.animate([
        { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 0 },
        { transform: 'translate(calc(-50% + ' + dx * 0.55 + 'px), calc(-50% + ' + dy * 0.55 + 'px)) scale(1.1) rotate(' + rot * 0.6 + 'deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + (dy + 18) + 'px)) scale(.6) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: dur, easing: EASE_OUT });
      a.onfinish = (function (node) { return function () { node.remove(); active--; }; })(el);
    }
  }

  function message() {
    var now = Date.now();
    if (now - lastMsgAt < 550) return;   // 연타해도 문구는 적당히만
    lastMsgAt = now;
    var idx;
    do { idx = (Math.random() * MESSAGES.length) | 0; } while (idx === lastMsg && MESSAGES.length > 1);
    lastMsg = idx;

    // 먼저 떠 있던 문구는 살짝 올라가며 빨리 사라져요
    msgs.slice().forEach(function (m) {
      if (!canAnimate) { m.done(); return; }
      m.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: EASE_IN, fill: 'forwards' }).onfinish = m.done;
    });

    var el = document.createElement('span');
    el.className = 'love__msg';
    el.textContent = MESSAGES[idx];
    stage.appendChild(el);
    var item = { el: el };
    msgs.push(item);
    var x = rand(-28, 28);
    var done = item.done = function () {
      var k = msgs.indexOf(item);
      if (k < 0) return;          // 이미 정리됨
      msgs.splice(k, 1); el.remove();
    };
    if (!canAnimate) { el.style.transform = 'translateX(-50%)'; setTimeout(done, 1500); return; }
    el.animate([
      { transform: 'translate(calc(-50% + ' + x + 'px), 14px) scale(.85)', opacity: 0 },
      { transform: 'translate(calc(-50% + ' + x + 'px), 0) scale(1)', opacity: 1, offset: 0.15 },
      { transform: 'translate(calc(-50% + ' + x + 'px), -6px) scale(1)', opacity: 1, offset: 0.75 },
      { transform: 'translate(calc(-50% + ' + x + 'px), -22px) scale(.98)', opacity: 0 }
    ], { duration: reduceMotion ? 1200 : 1700, easing: EASE_OUT, fill: 'forwards' }).onfinish = done;
  }

  var idleTimer = null;
  function squish() {
    btn.classList.add('is-tapped');
    clearTimeout(idleTimer);   // 한동안 안 누르면 다시 콩닥콩닥
    idleTimer = setTimeout(function () { btn.classList.remove('is-tapped'); }, 2500);
    if (!canAnimate || reduceMotion) return;
    btn.animate([
      { transform: 'scale(1)' }, { transform: 'scale(.9)', offset: 0.25 }, { transform: 'scale(1)' }
    ], { duration: 360, easing: EASE_SPRING });
  }

  /* ---------- 누르기 ---------- */
  var combo = 0, comboTimer = null;
  function love(px, py) {
    combo++;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(function () { combo = 0; }, 600);

    var sr = stage.getBoundingClientRect();
    var br = btn.getBoundingClientRect();
    var cx = br.left + br.width / 2 - sr.left, cy = br.top + br.height / 2 - sr.top;
    // 손가락이 닿은 곳 쪽으로 살짝 치우쳐 터져요
    if (px != null) { cx += (px - (br.left + br.width / 2)) * 0.4; cy += (py - (br.top + br.height / 2)) * 0.4; }

    squish();
    burst(cx, cy, combo > 6 ? 0.7 : 1);   // 너무 빠른 연타 땐 조금 덜 화려하게
    message();
    if (tapHint) tapHint.classList.add('is-hidden');
    if (navigator.vibrate && !reduceMotion) { try { navigator.vibrate(8); } catch (e) {} }

    localCount++;
    try { localStorage.setItem(localKey, String(localCount)); } catch (e) {}
    if (FIREBASE_DB_URL) { pending++; schedule(); }
    render(); bumpCount();
  }

  // 터치는 누르는 즉시 반응하고, 뒤따르는 click은 무시해요 (키보드는 click으로)
  var lastPointer = 0;
  btn.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    lastPointer = Date.now();
    love(e.clientX, e.clientY);
  });
  btn.addEventListener('click', function () {
    if (Date.now() - lastPointer < 700) return;
    love(null, null);
  });
  btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  load();
})();
