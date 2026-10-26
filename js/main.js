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
  // 카카오 JavaScript 키 — 웹페이지에 공개되는 키예요. 카카오 디벨로퍼스에 등록한 도메인에서만 동작해요.
  var KAKAO_JS_KEY = 'f3eb074e4568743b236c548c4f0cf601';
  var SITE_URL = 'https://ehwa-jang.github.io/wedding/';
  var VENUE = { name: '웨딩시그니처', address: '서울특별시 마포구 양화로 87' };

  /* ---------- 모션 공통 (css/style.css의 :root 토큰을 그대로 읽어요) ---------- */
  var rootStyle = getComputedStyle(document.documentElement);
  function token(name) { return rootStyle.getPropertyValue(name).trim(); }
  function ms(name) { return parseFloat(token(name)) || 0; }
  var EASE = { out: token('--ease-out'), in: token('--ease-in'), inOut: token('--ease-in-out'), spring: token('--ease-spring') };
  // '동작 줄이기'를 켠 사람도 같은 연출을 봐요. 다만 계속 반복되는 움직임(봉투 둥둥 · 실링 콩닥)만 꺼요.
  var calm = false;
  var noLoop = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnim = 'animate' in Element.prototype;
  // iOS 사파리에서 :active(눌림 피드백)가 동작하도록
  document.addEventListener('touchstart', function () {}, { passive: true });

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
  var envBody = envelope.querySelector('.envelope__body');
  var envShadow = envelope.querySelector('.envelope__shadow');
  var hint = document.getElementById('envelopeHint');
  var floatAnims = [];

  // 등장 연출이 끝날 즈음부터 봉투가 위아래로 둥둥 (작은 폭 · 사인 곡선 · 회전 없음 → 글자/테두리가 흔들리지 않아요)
  if (canAnim && !noLoop) {
    var floatOpt = { duration: 3600, delay: 700, iterations: Infinity, direction: 'alternate', easing: 'cubic-bezier(0.37, 0, 0.63, 1)' };
    envBody.classList.add('is-floating');
    floatAnims.push(envBody.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: 'translate3d(0, -8px, 0)' }], floatOpt));
    floatAnims.push(envShadow.animate([{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(.86)', opacity: .65 }], floatOpt));
    // 실링 하트는 가끔 한 번씩만 콩
    floatAnims.push(envelope.querySelector('.envelope__seal').animate([
      { transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .12 }, { transform: 'scale(1)', offset: .28 }, { transform: 'scale(1)' }
    ], { duration: 2800, delay: 1200, iterations: Infinity, easing: EASE.out }));
  }

  // 떠 있던 바로 그 위치에서 이어서 움직여요 (뚝 끊기지 않게)
  function fromCurrent(el, keys, opt) {
    var cs = getComputedStyle(el);
    var from = { transform: cs.transform === 'none' ? 'none' : cs.transform, opacity: cs.opacity };
    return el.animate([from].concat(keys), opt);
  }

  function openEnvelope() {
    if (envelope.classList.contains('is-open')) return;
    if (canAnim && !calm) {
      // 1) 손에 반응: 살짝 눌렸다가 스프링처럼 제자리로
      fromCurrent(envBody, [
        { transform: 'translate3d(0, 2px, 0) scale(.97)', offset: .35 },
        { transform: 'none' }
      ], { duration: 420, easing: EASE.spring, fill: 'forwards' })
        .onfinish = function () { envBody.classList.remove('is-floating'); };
      fromCurrent(envShadow, [{ transform: 'scaleX(1.04)', opacity: 1, offset: .35 }, { transform: 'none', opacity: 1 }],
        { duration: 420, easing: EASE.out, fill: 'forwards' });
      floatAnims.forEach(function (x) { x.cancel(); });
      floatAnims = [];
    }
    if (canAnim) {
      // 안내 문구는 짧고 빠르게 퇴장
      hint.animate([{ opacity: getComputedStyle(hint).opacity }, { opacity: 0 }], { duration: ms('--dur-fast'), easing: EASE.in, fill: 'forwards' });
    }
    // 2) 실링 톡 → 3) 뚜껑 열림(80ms~) → 4) 뚜껑이 반쯤일 때(360ms~) 사진이 겹쳐서 올라와요 — 타이밍은 CSS
    envelope.classList.add('is-open');
    envelope.setAttribute('aria-label', '청첩장 봉투가 열렸어요');
    hint.classList.add('is-hidden');
  }
  envelope.addEventListener('click', openEnvelope);

  /* ---------- 5. 갤러리 ---------- */
  var grid = document.getElementById('galleryGrid');
  var moreBtn = document.getElementById('galleryMore');
  var expanded = false;

  function renderGallery() {
    var count = expanded ? GALLERY.length : Math.min(GALLERY_PREVIEW, GALLERY.length);
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<li' + (i >= GALLERY_PREVIEW ? ' class="is-extra" style="--i:' + (i - GALLERY_PREVIEW) + '"' : '') + '>' +
        '<button type="button" data-index="' + i + '" aria-label="사진 ' + (i + 1) + ' 크게 보기">' +
        '<img src="' + GALLERY[i] + '" alt="" loading="lazy"></button></li>';
    }
    grid.innerHTML = html;
    moreBtn.hidden = GALLERY.length <= GALLERY_PREVIEW;
    moreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    moreBtn.querySelector('span').textContent = expanded ? '사진 접기' : '사진 더보기';
  }
  moreBtn.addEventListener('click', function () {
    if (!expanded) { expanded = true; renderGallery(); return; }
    // 접을 땐 추가 사진이 먼저 짧게 사라지고 나서 정리돼요
    var extras = grid.querySelectorAll('li.is-extra');
    extras.forEach(function (li) { li.classList.add('is-leaving'); });
    setTimeout(function () {
      expanded = false;
      renderGallery();
      var top = document.getElementById('gallery').getBoundingClientRect().top;
      if (top < 0) document.getElementById('gallery').scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    }, calm ? 0 : ms('--dur-fast'));
  });
  renderGallery();

  /* 사진 크게 보기 */
  var viewer = document.getElementById('viewer');
  var vImg = document.getElementById('viewerImg');
  var vCount = document.getElementById('viewerCount');
  var current = 0, lastFocus = null, closeTimer = null, switching = false;

  function setPhoto(i) {
    current = (i + GALLERY.length) % GALLERY.length;
    vImg.src = GALLERY[current];
    vImg.alt = '갤러리 사진 ' + (current + 1);
    vCount.textContent = (current + 1) + ' / ' + GALLERY.length;
  }
  // 다음/이전: 지금 사진은 밀던 방향으로 짧게 빠지고, 새 사진은 반대편에서 감속하며 들어와요
  function go(dir, fromX) {
    if (switching) return;
    if (!canAnim || calm) { setPhoto(current + dir); return; }
    switching = true;
    var x0 = fromX || 0;
    vImg.classList.remove('is-dragging');
    var out = vImg.animate([
      { transform: 'translate3d(' + x0 + 'px,0,0)', opacity: vImg.style.opacity || 1 },
      { transform: 'translate3d(' + (-dir * 72 + x0 * 0.3) + 'px,0,0)', opacity: 0 }
    ], { duration: ms('--dur-fast'), easing: EASE.in, fill: 'forwards' });
    out.onfinish = function () {
      vImg.style.transform = ''; vImg.style.opacity = '';
      setPhoto(current + dir);
      var ready = vImg.decode ? vImg.decode().catch(function () {}) : Promise.resolve();
      ready.then(function () {
        out.cancel();
        vImg.animate([
          { transform: 'translate3d(' + dir * 48 + 'px,0,0)', opacity: 0 },
          { transform: 'none', opacity: 1 }
        ], { duration: ms('--dur-base'), easing: EASE.out }).onfinish = function () { switching = false; };
      });
    };
  }
  function openViewer(i) {
    lastFocus = document.activeElement;
    clearTimeout(closeTimer);
    setPhoto(i);
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    viewer.getBoundingClientRect();           // 다음 프레임에 전환이 시작되도록
    viewer.classList.add('is-open');
    document.getElementById('viewerClose').focus();
  }
  function closeViewer() {
    viewer.classList.remove('is-open');
    document.body.style.overflow = '';
    closeTimer = setTimeout(function () { viewer.hidden = true; }, calm ? 0 : ms('--dur-fast') + 20);
    if (lastFocus) lastFocus.focus();
  }
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-index]');
    if (b) openViewer(parseInt(b.getAttribute('data-index'), 10));
  });
  document.getElementById('viewerClose').addEventListener('click', closeViewer);
  document.getElementById('viewerPrev').addEventListener('click', function () { go(-1); });
  document.getElementById('viewerNext').addEventListener('click', function () { go(1); });
  viewer.addEventListener('click', function (e) { if (e.target === viewer) closeViewer(); });
  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });
  // 좌우로 밀기: 손가락을 그대로 따라오고, 놓으면 넘어가거나 스프링처럼 제자리로
  var drag = null;
  viewer.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1 || switching) return;
    drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), dx: 0, lock: null };
  }, { passive: true });
  viewer.addEventListener('touchmove', function (e) {
    if (!drag) return;
    var dx = e.touches[0].clientX - drag.x, dy = e.touches[0].clientY - drag.y;
    if (drag.lock === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) drag.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (drag.lock !== 'x' || calm) return;
    drag.dx = dx;
    vImg.classList.add('is-dragging');
    vImg.style.transform = 'translate3d(' + dx + 'px,0,0)';
    vImg.style.opacity = String(1 - Math.min(Math.abs(dx) / 700, .35));
  }, { passive: true });
  viewer.addEventListener('touchend', function (e) {
    if (!drag) return;
    var dx = calm ? e.changedTouches[0].clientX - drag.x : drag.dx;
    var speed = Math.abs(dx) / Math.max(1, Date.now() - drag.t);
    drag = null;
    if (Math.abs(dx) > 60 || (speed > 0.45 && Math.abs(dx) > 20)) { go(dx < 0 ? 1 : -1, calm ? 0 : dx); return; }
    if (!dx || calm) return;
    var back = vImg.animate([
      { transform: 'translate3d(' + dx + 'px,0,0)', opacity: vImg.style.opacity || 1 },
      { transform: 'none', opacity: 1 }
    ], { duration: ms('--dur-base'), easing: EASE.spring });
    vImg.classList.remove('is-dragging');
    vImg.style.transform = ''; vImg.style.opacity = '';
    back.onfinish = function () {};
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
    var acc = btn.closest('.acc');
    var panel = acc.querySelector('.acc__panel');
    acc.querySelectorAll('.person').forEach(function (p, i) { p.style.setProperty('--i', i); });
    panel.inert = true;
    btn.addEventListener('click', function () {
      var open = !acc.classList.contains('is-open');
      acc.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.inert = !open;
    });
  });

  /* ---------- 스크롤 등장 ---------- */
  // 섹션 안 요소를 하나씩 등록해 두고, 화면 아래쪽 10% 지점에 닿으면 한 번만 재생해요.
  (function reveal() {
    var targets = document.querySelectorAll(
      '.sec:not(.cover) > :not(.gallery__grid):not(.chat):not(.location__guide):not(.calendar__board),' +
      '.gallery__grid > li, .chat > *, .location__guide > .guide, .calendar__board'
    );
    if (!('IntersectionObserver' in window)) return;   // 지원 안 하면 처음부터 다 보여요(.reveal을 안 붙임)
    var io = new IntersectionObserver(function (entries) {
      // 같은 순간 함께 들어온 것끼리 위→아래, 왼→오 순서로 70ms씩 차례로
      var shown = entries.filter(function (en) { return en.isIntersecting; })
        .sort(function (a, b) { return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left); });
      shown.forEach(function (en, k) {
        var el = en.target;
        el.style.setProperty('--delay', Math.min(k, 6) * (calm ? 0 : ms('--stagger')) + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
        // 끝나면 등장용 클래스를 떼서, 이후 눌림 피드백 같은 전환이 등장 전환에 덮이지 않게
        setTimeout(function () { el.classList.remove('reveal', 'is-in'); el.style.removeProperty('--delay'); }, ms('--dur-slow') + 600);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    targets.forEach(function (el) {
      // 이미 화면 위쪽(지나온 곳)에 있는 건 바로 보여 줘요 (새로고침해서 중간부터 볼 때)
      if (el.getBoundingClientRect().bottom < 0) return;
      el.classList.add('reveal');
      io.observe(el);
    });
  })();

  /* ---------- 10. 공유 ---------- */
  document.getElementById('shareLink').addEventListener('click', function () {
    copy(location.href.split('#')[0], '청첩장 링크를 복사했어요');
  });

  /* ---------- 카카오 SDK 불러오기 ---------- */
  function loadScript(src, onload, onerror) {
    var s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = onload; s.onerror = onerror;
    document.head.appendChild(s);
  }

  /* 카카오톡 공유: SDK가 준비되면 버튼을 보여 줘요 (실패하면 링크 복사만 남아요) */
  loadScript('https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js', function () {
    if (!window.Kakao) return;
    try { if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY); } catch (e) { return; }
    var btn = document.getElementById('shareKakao');
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var link = { mobileWebUrl: SITE_URL, webUrl: SITE_URL };
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '민석 ♥ 이화 결혼합니다',
          description: '2027년 3월 13일 토요일 오후 3시\n웨딩시그니처 2층 트리니티홀',
          imageUrl: SITE_URL + 'images/cover.jpg',
          link: link
        },
        buttons: [{ title: '청첩장 보기', link: link }]
      });
    });
  });

  /* 카카오맵: 주소로 위치를 찾아 하트 마커를 찍어요. 페이지 스크롤을 방해하지 않게 지도는 고정하고, 누르면 카카오맵이 열려요 */
  (function initMap() {
    var box = document.getElementById('map');
    var msg = document.getElementById('mapMsg');
    if (!box) return;
    // 어느 단계에서 실패했는지 작게 같이 보여 줘요 (휴대폰에서도 원인을 바로 알 수 있게)
    function fail(reason) { msg.innerHTML = '지도를 불러오지 못했어요. 아래 지도 앱에서 확인해 주세요<br><small>(' + reason + ')</small>'; }
    loadScript('https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_JS_KEY + '&libraries=services&autoload=false', function () {
      if (!window.kakao || !kakao.maps) return fail('지도 SDK 응답 오류 · 카카오맵 사용 설정 또는 도메인 확인');
      kakao.maps.load(function () {
        new kakao.maps.services.Geocoder().addressSearch(VENUE.address, function (result, status) {
          if (status !== kakao.maps.services.Status.OK || !result.length) return fail('주소 검색 ' + status + ' · 카카오맵 사용 설정 확인');
          var pos = new kakao.maps.LatLng(result[0].y, result[0].x);
          var map = new kakao.maps.Map(box, { center: pos, level: 3, draggable: false, scrollwheel: false, disableDoubleClickZoom: true });
          map.setZoomable(false);
          var heart = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 112" width="34" height="31"><path d="M62 108C56 103 8 72 4 38 1 16 17 3 34 3c12 0 22 7 28 17 6-10 16-17 28-17 17 0 33 13 30 35-4 34-52 65-58 70z" fill="#e8959e" stroke="#fff" stroke-width="6"/></svg>');
          new kakao.maps.Marker({ map: map, position: pos, image: new kakao.maps.MarkerImage(heart, new kakao.maps.Size(34, 31), { offset: new kakao.maps.Point(17, 31) }) });
          var label = document.createElement('div');
          label.className = 'map-label';
          label.textContent = VENUE.name;
          new kakao.maps.CustomOverlay({ map: map, position: pos, content: label, yAnchor: 1 });
          box.classList.add('is-ready');
          var placeUrl = 'https://map.kakao.com/link/map/' + encodeURIComponent(VENUE.name) + ',' + result[0].y + ',' + result[0].x;
          document.getElementById('kakaoMapLink').href = placeUrl;
          kakao.maps.event.addListener(map, 'click', function () { window.open(placeUrl, '_blank', 'noopener'); });
          // 섹션이 늦게 그려지거나 폭이 바뀌어도 마커가 가운데 오게
          window.addEventListener('resize', function () { map.relayout(); map.setCenter(pos); });
        });
      });
    }, function () { fail('지도 SDK를 불러오지 못함 · 카카오맵 사용 설정 또는 도메인 확인'); });
  })();
})();
