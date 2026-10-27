/* 13. 하객 사진 (GUEST SNAP)
 * 하객이 고른 사진을 휴대폰에서 먼저 줄인 뒤(긴 변 2000px JPEG),
 * Google Apps Script 웹 앱으로 한 장씩 보내요 → 신랑·신부 Google Drive 폴더에 저장돼요.
 * Apps Script 코드와 설정 방법: docs/guest-snap-apps-script.gs, docs/HANDOFF.md
 */
(function () {
  'use strict';

  // Apps Script를 "웹 앱"으로 배포하면 나오는 주소(…/exec)를 여기에 넣어 주세요.
  // 비어 있으면 사진을 고를 수는 있지만, 보내기를 누르면 "곧 열릴 예정이에요" 안내만 떠요.
  var SNAP_UPLOAD_URL = '';

  var MAX_FILES = 20;      // 한 번에 보낼 수 있는 사진 수
  var MAX_SIDE = 2000;     // 긴 변 (px)
  var QUALITY = 0.85;

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

  var picked = [];   // { file, url }
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

  function render() {
    var has = picked.length > 0;
    frames.hidden = has;
    grid.hidden = !has;
    nameWrap.hidden = !has;
    btnText.textContent = has ? '사진 ' + picked.length + '장 보내기' : '사진 올리기';
    moreCell.hidden = picked.length >= MAX_FILES;

    grid.querySelectorAll('.snap__cell').forEach(function (li) { li.remove(); });
    picked.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'snap__cell';
      var img = document.createElement('img');
      img.src = p.url; img.alt = '고른 사진 ' + (i + 1);
      var rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'snap__remove';
      rm.setAttribute('aria-label', (i + 1) + '번째 사진 빼기');
      rm.innerHTML = '<span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8"></path></svg></span>';
      rm.addEventListener('click', function () {
        if (sending) return;
        URL.revokeObjectURL(p.url);
        picked.splice(picked.indexOf(p), 1);
        render();
      });
      li.appendChild(img); li.appendChild(rm);
      grid.insertBefore(li, moreCell);
    });
  }

  function openPicker() { if (!sending) fileInput.click(); }

  fileInput.addEventListener('change', function () {
    var files = Array.prototype.slice.call(fileInput.files || []).filter(function (f) { return /^image\//.test(f.type) || !f.type; });
    var room = MAX_FILES - picked.length;
    if (files.length > room) toast('한 번에 ' + MAX_FILES + '장까지 보낼 수 있어요');
    files.slice(0, room).forEach(function (f) { picked.push({ file: f, url: URL.createObjectURL(f) }); });
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

  /* 사진 줄이기: 긴 변 MAX_SIDE 이하 JPEG → base64 */
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
        resolve(c.toDataURL('image/jpeg', QUALITY).split(',')[1]);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function upload(name, index, base64) {
    return fetch(SNAP_UPLOAD_URL, {
      method: 'POST',
      // text/plain이어야 브라우저가 사전 확인(CORS preflight) 없이 바로 보내요
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ name: name, index: index, image: base64 })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (!res || !res.ok) throw new Error('server');
    });
  }

  function send(name) {
    sending = true;
    btn.disabled = true;
    var list = picked.slice();
    var done = 0, failed = [];
    var total = list.length;

    function next(i) {
      if (i >= total) return finish();
      btnText.textContent = '보내는 중 ' + (i + 1) + ' / ' + total;
      var p = list[i];
      shrink(p.file)
        .then(function (b64) { return upload(name, i + 1, b64); })
        .then(function () { done++; }, function () { failed.push(p); })
        .then(function () { next(i + 1); });
    }

    function finish() {
      sending = false;
      btn.disabled = false;
      list.forEach(function (p) { if (failed.indexOf(p) < 0) URL.revokeObjectURL(p.url); });
      picked = failed;   // 실패한 사진만 남겨서 다시 보낼 수 있게
      render();
      if (!failed.length) toast('사진 ' + done + '장을 보냈어요. 고마워요 ♡', 2600);
      else if (done) toast(done + '장은 보냈고 ' + failed.length + '장은 실패했어요. 다시 눌러 주세요', 3200);
      else toast('보내지 못했어요. 잠시 뒤 다시 눌러 주세요', 2600);
    }

    next(0);
  }

  render();
})();
