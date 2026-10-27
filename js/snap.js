/* 13. 하객 사진 (GUEST SNAP)
 * 사진은 휴대폰에서 먼저 줄이고(긴 변 2000px JPEG), 영상은 원본 그대로
 * Google Drive로 바로 보내요. Apps Script(웹 앱)는 업로드 자리만 만들어 줘요.
 * → 신랑·신부 Google Drive 폴더에 저장돼요.
 * Apps Script 코드와 설정 방법: docs/guest-snap-apps-script.gs, docs/HANDOFF.md
 */
(function () {
  'use strict';

  // Apps Script를 "웹 앱"으로 배포하면 나오는 주소(…/exec)
  // 비어 있으면 고를 수는 있지만, 보내기를 누르면 "곧 열릴 예정이에요" 안내만 떠요.
  var SNAP_UPLOAD_URL = 'https://script.google.com/macros/s/AKfycbxK8bmIdQGg6bNLdAvq-el2Bv7k73l4QoJxvcvLIU35sHphEFUhY8YZ76JhmzijJrf3/exec';

  var MAX_FILES = 20;                      // 한 번에 보낼 수 있는 사진·영상 수
  var MAX_SIDE = 2000;                     // 사진 긴 변 (px)
  var QUALITY = 0.85;
  var MAX_VIDEO = 300 * 1024 * 1024;       // 영상 한 개 최대 300MB (Apps Script 코드의 값과 같아야 해요)
  var CHUNK = 8 * 1024 * 1024;             // (바로 보내기가 막힐 때만) Apps Script로 보내는 조각 크기

  var section = document.getElementById('snap');
  if (!section) return;
  var frames = document.getElementById('snapFrames');
  var grid = document.getElementById('snapGrid');
  var moreCell = grid.querySelector('.snap__more-cell');
  var moreBtn = document.getElementById('snapMore');
  var nameWrap = document.getElementById('snapNameWrap');
  var nameInput = document.getElementById('snapName');
  var btn = document.getElementById('snapBtn');
  var btnText = document.getElementById('snapBtnText');
  var fileInput = document.getElementById('snapFile');

  var picked = [];   // { file, url, video }
  var sending = false;

  /* 안내 문구 (main.js의 토스트와 같은 자리) */
  var toastEl = document.getElementById('toast');
  var toastTimer;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, ms || 1800);
  }

  function isVideo(f) { return /^video\//.test(f.type) || /\.(mov|mp4|m4v|3gp|webm)$/i.test(f.name || ''); }

  function label() {
    var hasVideo = picked.some(function (p) { return p.video; });
    return hasVideo ? '사진·영상 ' + picked.length + '개 보내기' : '사진 ' + picked.length + '장 보내기';
  }

  function render() {
    var has = picked.length > 0;
    frames.hidden = has;
    grid.hidden = !has;
    nameWrap.hidden = !has;
    btnText.textContent = has ? label() : '사진·영상 올리기';
    moreCell.hidden = picked.length >= MAX_FILES;

    grid.querySelectorAll('.snap__cell').forEach(function (li) { li.remove(); });
    picked.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'snap__cell';
      var media;
      if (p.video) {
        media = document.createElement('video');
        media.src = p.url + '#t=0.1';          // 첫 장면을 미리보기로
        media.muted = true; media.playsInline = true; media.preload = 'metadata';
        media.setAttribute('aria-label', '고른 영상 ' + (i + 1));
        var badge = document.createElement('span');
        badge.className = 'snap__badge';
        badge.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2l5 3-5 3z"></path></svg>';
        li.appendChild(badge);
      } else {
        media = document.createElement('img');
        media.src = p.url; media.alt = '고른 사진 ' + (i + 1);
      }
      var rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'snap__remove';
      rm.setAttribute('aria-label', (i + 1) + '번째 ' + (p.video ? '영상' : '사진') + ' 빼기');
      rm.innerHTML = '<span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8"></path></svg></span>';
      rm.addEventListener('click', function () {
        if (sending) return;
        URL.revokeObjectURL(p.url);
        picked.splice(picked.indexOf(p), 1);
        render();
      });
      li.insertBefore(media, li.firstChild);
      li.appendChild(rm);
      grid.insertBefore(li, moreCell);
    });
  }

  function openPicker() { if (!sending) fileInput.click(); }

  fileInput.addEventListener('change', function () {
    var files = Array.prototype.slice.call(fileInput.files || []).filter(function (f) {
      return /^image\//.test(f.type) || isVideo(f) || !f.type;
    });
    var tooBig = files.filter(function (f) { return isVideo(f) && f.size > MAX_VIDEO; });
    files = files.filter(function (f) { return tooBig.indexOf(f) < 0; });
    var room = MAX_FILES - picked.length;
    if (tooBig.length) toast('영상은 한 개에 300MB까지 올릴 수 있어요', 2600);
    else if (files.length > room) toast('한 번에 ' + MAX_FILES + '개까지 보낼 수 있어요');
    files.slice(0, room).forEach(function (f) { picked.push({ file: f, url: URL.createObjectURL(f), video: isVideo(f) }); });
    fileInput.value = '';
    render();
  });
  moreBtn.addEventListener('click', openPicker);

  btn.addEventListener('click', function () {
    if (sending) return;
    if (!picked.length) { openPicker(); return; }
    var name = nameInput.value.trim();
    if (!name) { toast('보내는 분 이름을 적어 주세요'); nameInput.focus(); return; }
    if (!SNAP_UPLOAD_URL) { toast('곧 열릴 예정이에요'); return; }
    send(name);
  });

  /* ---------- 보내기 ----------
   * 1) Apps Script에 "업로드 자리"(Drive 이어 올리기 주소)를 받아요 (작은 요청 하나)
   * 2) 파일은 휴대폰에서 Drive로 바로, 원본 그대로 보내요 (Apps Script를 거치지 않아 빨라요)
   * 2-1) 혹시 바로 보내기가 막히는 환경이면, 예전처럼 Apps Script를 거쳐 8MB씩 보내요 (느리지만 안전)
   * 여러 개는 동시에 3개씩 보내요.
   */
  var PARALLEL = 3;

  function post(body) {
    return fetch(SNAP_UPLOAD_URL, {
      method: 'POST',
      // text/plain이어야 브라우저가 사전 확인(CORS preflight) 없이 바로 보내요
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'server');
      return res;
    });
  }
  function retry(fn, times) {
    return fn().catch(function (e) {
      if (times <= 0) throw e;
      return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return retry(fn, times - 1); });
    });
  }

  /* 사진 줄이기: 긴 변 MAX_SIDE 이하 JPEG Blob */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('encode')); }, 'image/jpeg', QUALITY);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  function startSession(meta) {
    return retry(function () {
      return post({ action: 'start', name: meta.name, index: meta.index, size: meta.blob.size,
        mime: meta.mime, ext: meta.ext, origin: location.origin });
    }, 1).then(function (res) { return res.session; });
  }

  // Drive로 바로 보내기. 바로 연결이 안 되면(status 0) 'direct' 오류로 알려 줘요
  function putDirect(session, blob, mime, onProgress) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('PUT', session);
      x.setRequestHeader('Content-Type', mime);
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded); };
      x.onload = function () {
        if (x.status === 200 || x.status === 201) { onProgress(blob.size); resolve(); }
        else reject(new Error('put ' + x.status));
      };
      x.onerror = function () { reject(new Error(x.status === 0 ? 'direct' : 'put')); };
      x.send(blob);
    });
  }

  // 느린 길: Apps Script를 거쳐 8MB씩
  function putViaScript(session, blob, onProgress) {
    var total = blob.size;
    function part(start) {
      if (start >= total) return Promise.resolve();
      var end = Math.min(start + CHUNK, total);
      return blobToBase64(blob.slice(start, end)).then(function (b64) {
        return retry(function () {
          return post({ action: 'chunk', session: session, start: start, total: total, data: b64 });
        }, 2);
      }).then(function () { onProgress(end); return part(end); });
    }
    return part(0);
  }

  var directWorks = null;   // 한 번 막히면 그 뒤로는 바로 느린 길로

  function sendOne(name, index, p, onProgress) {
    var prep = p.video
      ? Promise.resolve({
          blob: p.file,
          mime: p.file.type || (/\.mov$/i.test(p.file.name || '') ? 'video/quicktime' : 'video/mp4'),
          ext: ((p.file.name || '').split('.').pop() || 'mp4').toLowerCase()
        })
      : shrink(p.file).then(function (b) { return { blob: b, mime: 'image/jpeg', ext: 'jpg' }; });

    return prep.then(function (m) {
      m.name = name; m.index = index;
      p.bytes = m.blob.size;
      if (directWorks === false) {
        return startSession(m).then(function (s) { return putViaScript(s, m.blob, onProgress); });
      }
      return startSession(m).then(function (s) {
        return putDirect(s, m.blob, m.mime, onProgress).then(function () { directWorks = true; });
      }).catch(function (e) {
        if (e.message !== 'direct' || directWorks === true) throw e;
        directWorks = false;
        onProgress(0);
        return startSession(m).then(function (s) { return putViaScript(s, m.blob, onProgress); });
      });
    });
  }

  /* 영상 보내는 동안 화면이 꺼지지 않게 (지원하는 폰에서만) */
  var wakeLock = null;
  function keepAwake(on) {
    try {
      if (on && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }, function () {});
      else if (!on && wakeLock) { wakeLock.release(); wakeLock = null; }
    } catch (e) {}
  }

  function send(name) {
    sending = true;
    btn.disabled = true;
    var list = picked.slice();
    var total = list.length;
    var done = 0, failed = [], finished = 0, nextIdx = 0;
    keepAwake(true);
    btnText.textContent = '보내는 중…';

    // 진행률: 영상은 크기 그대로, 사진은 줄인 뒤 크기를 몰라 대략 1MB로 셈
    list.forEach(function (p) { p.sent = 0; p.bytes = p.video ? p.file.size : 1024 * 1024; });
    function update() {
      var all = 0, sent = 0;
      list.forEach(function (p) { all += p.bytes; sent += Math.min(p.sent, p.bytes); });
      var pct = all ? Math.min(99, Math.round(sent / all * 100)) : 0;
      btnText.textContent = '보내는 중 ' + pct + '%';
    }

    function worker() {
      if (nextIdx >= total) return Promise.resolve();
      var i = nextIdx++;
      var p = list[i];
      return sendOne(name, i + 1, p, function (b) { p.sent = b; update(); })
        .then(function () { done++; }, function () { failed.push(p); })
        .then(function () { finished++; return worker(); });
    }

    var workers = [];
    for (var k = 0; k < Math.min(PARALLEL, total); k++) workers.push(worker());
    Promise.all(workers).then(finish);

    function finish() {
      sending = false;
      btn.disabled = false;
      keepAwake(false);
      list.forEach(function (p) { if (failed.indexOf(p) < 0) URL.revokeObjectURL(p.url); });
      picked = list.filter(function (p) { return failed.indexOf(p) >= 0; });   // 실패한 것만 남겨서 다시 보낼 수 있게
      render();
      if (!failed.length) toast(done + '개를 보냈어요. 고마워요 ♡', 2600);
      else if (done) toast(done + '개는 보냈고 ' + failed.length + '개는 실패했어요. 다시 눌러 주세요', 3200);
      else toast('보내지 못했어요. 잠시 뒤 다시 눌러 주세요', 2600);
    }
  }

  // 보내는 중에 페이지를 닫으려 하면 한 번 물어봐요
  window.addEventListener('beforeunload', function (e) {
    if (sending) { e.preventDefault(); e.returnValue = ''; }
  });

  render();
})();
