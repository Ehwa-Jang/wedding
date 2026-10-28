/* 5. 촬영 비하인드 스토리 (인스타그램 스토리처럼)
 * OUR STORY 마지막 답변(프로필 동그라미)을 누르면 세로 영상이 차례로 재생돼요.
 * - 화면 왼쪽 1/3을 누르면 이전, 나머지를 누르면 다음 영상
 * - 꾹 누르고 있으면 잠깐 멈춤, 손을 떼면 이어서
 * - 영상이 끝나면 다음 영상으로, 마지막 영상이 끝나면 닫혀요
 * - 영상은 모두 소리 없이 재생돼요 (배경음악은 그대로)
 * - 다 본 뒤에도 동그라미는 무지개 테두리 그대로예요
 * 영상 파일: videos/behind-01.mp4 ~ 같은 이름으로 바꾸면 돼요 (세로 9:16 추천). 개수를 바꾸면 STORY_COUNT도 같이.
 */
(function () {
  'use strict';

  var STORY_COUNT = 10;
  // 영상마다 한 줄 설명을 넣고 싶으면 여기에 (빈칸이면 안 보여요)
  var CAPTIONS = ['', '', '', '', '', '', '', '', '', ''];

  var STORIES = [];
  for (var i = 1; i <= STORY_COUNT; i++) {
    STORIES.push({ src: 'videos/behind-' + (i < 10 ? '0' + i : i) + '.mp4?v=dev', caption: CAPTIONS[i - 1] || '' });
  }

  var openBtn = document.getElementById('storyOpen');
  var box = document.getElementById('story');
  if (!openBtn || !box) return;
  var video = document.getElementById('storyVideo');
  var barsBox = document.getElementById('storyBars');
  var countEl = document.getElementById('storyCount');
  var captionEl = document.getElementById('storyCaption');
  var msgEl = document.getElementById('storyMsg');
  var closeBtn = document.getElementById('storyClose');
  var prevBtn = document.getElementById('storyPrev');
  var nextBtn = document.getElementById('storyNext');

  var cur = 0, isOpen = false, raf = 0, lastFocus = null;
  var fallback = null;          // 영상을 못 불러왔을 때 3초 뒤 넘어가는 타이머 { start, dur }
  var holding = false, holdTimer = 0, justHeld = false;
  var preloader = document.createElement('video');
  preloader.preload = 'auto'; preloader.muted = true;

  barsBox.innerHTML = STORIES.map(function () { return '<span><i></i></span>'; }).join('');
  var bars = Array.prototype.slice.call(barsBox.querySelectorAll('i'));

  function setBars(p) {
    bars.forEach(function (b, k) { b.style.setProperty('--p', k < cur ? 1 : (k === cur ? p : 0)); });
  }
  function tick() {
    if (!isOpen) return;
    var p = 0;
    if (fallback) {
      p = Math.min(1, (Date.now() - fallback.start) / fallback.dur);
      if (p >= 1 && !holding) { next(); return; }
    } else if (video.duration) {
      p = video.currentTime / video.duration;
    }
    setBars(p);
    raf = requestAnimationFrame(tick);
  }

  function play() {
    video.muted = true;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  function load(i) {
    cur = i;
    fallback = null;
    msgEl.hidden = true;
    var s = STORIES[i];
    video.src = s.src;
    countEl.textContent = (i + 1) + ' / ' + STORIES.length;
    captionEl.textContent = s.caption;
    setBars(0);
    play();
    if (STORIES[i + 1]) preloader.src = STORIES[i + 1].src;   // 다음 영상 미리 받아 두기
  }

  function next() { if (cur < STORIES.length - 1) load(cur + 1); else close(); }
  function prev() { if (cur > 0) load(cur - 1); else { video.currentTime = 0; if (fallback) fallback.start = Date.now(); play(); } }

  function open() {
    lastFocus = document.activeElement;
    isOpen = true;
    box.hidden = false;
    box.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    load(0);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    closeBtn.focus();
  }
  function close() {
    isOpen = false;
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute('src'); video.load();
    box.hidden = true;
    box.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  video.addEventListener('ended', function () { if (!holding) next(); });
  video.addEventListener('error', function () {
    if (!isOpen || !video.getAttribute('src')) return;
    msgEl.hidden = false;
    fallback = { start: Date.now(), dur: 3000 };
  });

  // 탭 = 넘기기, 꾹 누르기 = 잠깐 멈춤
  function bindTap(btn, go) {
    btn.addEventListener('pointerdown', function () {
      clearTimeout(holdTimer);
      holdTimer = setTimeout(function () {
        holding = true; justHeld = true;
        video.pause();
      }, 220);
    });
    function release() {
      clearTimeout(holdTimer);
      if (holding) {
        holding = false;
        if (fallback) fallback.start = Date.now() - fallback.dur * (parseFloat(bars[cur].style.getPropertyValue('--p')) || 0);
        play();
      }
    }
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // 꾹 누를 때 메뉴가 뜨지 않게
    btn.addEventListener('click', function () {
      if (justHeld) { justHeld = false; return; }
      go();
    });
  }
  // 빠르게 두 번 눌러도 화면이 확대되지 않게 (iOS가 touch-action을 무시하는 경우 대비)
  var lastTouchEnd = 0;
  box.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd < 350 && e.touches.length === 0 && e.changedTouches.length === 1) {
      e.preventDefault();                       // 확대는 막고
      var b = e.target.closest && e.target.closest('button');
      if (b) b.click();                         // 넘기기·닫기는 그대로 되게 직접 눌러 줘요
    }
    lastTouchEnd = now;
  }, { passive: false });
  box.addEventListener('dblclick', function (e) { e.preventDefault(); });

  bindTap(prevBtn, prev);
  bindTap(nextBtn, next);

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
  // 다른 앱으로 나가면 멈췄다가 돌아오면 이어서
  document.addEventListener('visibilitychange', function () {
    if (!isOpen) return;
    if (document.hidden) video.pause(); else play();
  });
})();
