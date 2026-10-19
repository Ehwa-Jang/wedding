(function () {
  'use strict';

  /* ---------- 설정 ---------- */
  // 갤러리 사진: images/gallery/ 안의 같은 이름 파일을 실제 사진으로 바꾸면 됩니다.
  var GALLERY = [];
  for (var i = 1; i <= 18; i++) {
    GALLERY.push('images/gallery/gallery-' + (i < 10 ? '0' + i : i) + '.jpg');
  }
  var GALLERY_PREVIEW = 9;          // 처음에 보이는 사진 수
  var WEDDING = { year: 2027, month: 3, day: 13 };

  /* ---------- 복사 + 알림 ---------- */
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 1800);
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function copy(text, msg) {
    var done = function () { toast(msg || '복사했어요'); };
    var fail = function () { fallbackCopy(text) ? done() : toast('길게 눌러 직접 복사해주세요'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else { fail(); }
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    copy(btn.getAttribute('data-copy'), btn.getAttribute('data-toast') || '계좌번호를 복사했어요');
  });

  /* ---------- 1. 커버 봉투 ---------- */
  var envelope = document.getElementById('envelope');
  var hint = document.getElementById('envelopeHint');
  function openEnvelope() {
    if (envelope.classList.contains('is-open')) return;
    envelope.classList.add('is-open');
    envelope.setAttribute('aria-label', '청첩장 봉투가 열렸어요');
    hint.classList.add('is-hidden');
  }
  envelope.addEventListener('click', openEnvelope);
  // 누르지 않아도 잠시 뒤 저절로 열려요
  setTimeout(openEnvelope, 2200);

  /* ---------- 5. 갤러리 ---------- */
  var grid = document.getElementById('galleryGrid');
  var moreBtn = document.getElementById('galleryMore');
  var expanded = false;

  function renderGallery() {
    var count = expanded ? GALLERY.length : Math.min(GALLERY_PREVIEW, GALLERY.length);
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<li' + (i >= GALLERY_PREVIEW ? ' class="is-extra"' : '') + '>' +
        '<button type="button" data-index="' + i + '" aria-label="사진 ' + (i + 1) + ' 크게 보기">' +
        '<img src="' + GALLERY[i] + '" alt="" loading="lazy"></button></li>';
    }
    grid.innerHTML = html;
    moreBtn.hidden = GALLERY.length <= GALLERY_PREVIEW;
    moreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    moreBtn.querySelector('span').textContent = expanded ? '사진 접기' : '사진 더보기';
  }
  moreBtn.addEventListener('click', function () {
    expanded = !expanded;
    renderGallery();
    if (!expanded) document.getElementById('gallery').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  renderGallery();

  /* 사진 크게 보기 */
  var viewer = document.getElementById('viewer');
  var vImg = document.getElementById('viewerImg');
  var vCount = document.getElementById('viewerCount');
  var current = 0, lastFocus = null;

  function show(i) {
    current = (i + GALLERY.length) % GALLERY.length;
    vImg.src = GALLERY[current];
    vImg.alt = '갤러리 사진 ' + (current + 1);
    vCount.textContent = (current + 1) + ' / ' + GALLERY.length;
  }
  function openViewer(i) {
    lastFocus = document.activeElement;
    show(i);
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('viewerClose').focus();
  }
  function closeViewer() {
    viewer.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-index]');
    if (b) openViewer(parseInt(b.getAttribute('data-index'), 10));
  });
  document.getElementById('viewerClose').addEventListener('click', closeViewer);
  document.getElementById('viewerPrev').addEventListener('click', function () { show(current - 1); });
  document.getElementById('viewerNext').addEventListener('click', function () { show(current + 1); });
  viewer.addEventListener('click', function (e) { if (e.target === viewer) closeViewer(); });
  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  // 좌우로 밀어서 넘기기
  var startX = null;
  viewer.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });

  /* ---------- 6. 달력 ---------- */
  (function buildCalendar() {
    var t = document.getElementById('calendarTable');
    var first = new Date(WEDDING.year, WEDDING.month - 1, 1).getDay();
    var days = new Date(WEDDING.year, WEDDING.month, 0).getDate();
    var week = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    var html = '<thead><tr>' + week.map(function (w) { return '<th scope="col">' + w + '</th>'; }).join('') + '</tr></thead><tbody><tr>';
    for (var i = 0; i < first; i++) html += '<td></td>';
    for (var d = 1; d <= days; d++) {
      var isDay = d === WEDDING.day;
      html += '<td' + (isDay ? ' class="is-day" aria-label="' + d + '일 예식일"' : '') + '><span>' + d + '</span></td>';
      if ((first + d) % 7 === 0 && d !== days) html += '</tr><tr>';
    }
    var rest = (7 - (first + days) % 7) % 7;
    for (var j = 0; j < rest; j++) html += '<td></td>';
    t.innerHTML = html + '</tr></tbody>';
  })();

  /* ---------- 9. 계좌 토글 ---------- */
  document.querySelectorAll('.acc__toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      document.getElementById(btn.getAttribute('aria-controls')).hidden = open;
    });
  });

  /* ---------- 10. 공유 ---------- */
  document.getElementById('shareLink').addEventListener('click', function () {
    copy(location.href.split('#')[0], '청첩장 링크를 복사했어요');
  });
  // TODO: 카카오 공유 — Kakao JavaScript 키를 받은 뒤 연결
})();
