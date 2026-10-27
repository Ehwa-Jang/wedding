/**
 * 하객 사진·영상(GUEST SNAP) → Google Drive 저장용 Apps Script
 *
 * 1) Google Drive에 모을 폴더를 만들고, 폴더 주소의 마지막 부분(ID)을 아래 FOLDER_ID에 넣어요.
 *    예) https://drive.google.com/drive/folders/1AbCdEf...  →  '1AbCdEf...'
 * 2) script.google.com → 새 프로젝트 → 이 코드를 통째로 붙여넣고 저장
 * 3) 함수 선택칸에서 authorize → 실행 → 권한 허용
 * 4) 배포 → 새 배포 → 유형: 웹 앱 (실행 사용자: 나 / 액세스: 모든 사용자)
 *    → "웹 앱 URL"(…/exec)을 js/snap.js의 SNAP_UPLOAD_URL에 넣어요.
 *    코드를 고친 뒤에는: 배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포 (주소는 그대로)
 *
 * 동작: 청첩장이 'start'를 보내면 Drive에 업로드 자리(이어 올리기 주소)를 만들어 돌려줘요.
 *       파일은 하객 휴대폰에서 그 주소로 Drive에 바로 올라가요(빠름).
 *       바로 올리기가 막히는 환경이면 'chunk'로 8MB씩 이 스크립트를 거쳐 올려요(느림).
 * 파일 이름: 보내는분이름_20270313-153012_1.jpg / .mp4 / .mov
 */

var FOLDER_ID = '여기에_폴더_ID';
var MAX_BYTES = 300 * 1024 * 1024;   // 파일 한 개 최대 300MB (js/snap.js의 MAX_VIDEO와 같게)
// 업로드를 허용할 청첩장 주소 (다른 사이트에서 이 스크립트를 쓰지 못하게)
var ALLOWED_ORIGINS = ['https://ehwa-jang.github.io'];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'start') return start_(data);
    if (data.action === 'chunk') return putChunk_(data);
    return json_({ ok: false, error: 'action' });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  }
}

// 주소를 브라우저로 열었을 때 동작 확인용
function doGet() {
  return json_({ ok: true, message: 'guest snap uploader is running' });
}

/* 업로드 자리 만들기 */
function start_(data) {
  var size = Number(data.size);
  if (!(size > 0) || size > MAX_BYTES) return json_({ ok: false, error: 'size' });
  var mime = String(data.mime || '');
  if (!/^(image|video)\/[\w.+-]+$/.test(mime)) return json_({ ok: false, error: 'type' });
  var origin = String(data.origin || '');
  if (ALLOWED_ORIGINS.indexOf(origin) < 0) return json_({ ok: false, error: 'origin' });
  var ext = String(data.ext || '').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() || (mime.indexOf('video') === 0 ? 'mp4' : 'jpg');

  var res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'X-Upload-Content-Type': mime,
      'X-Upload-Content-Length': String(size),
      Origin: origin   // 이 주소에서 하객 휴대폰이 Drive로 바로 올릴 수 있게 해요
    },
    payload: JSON.stringify({ name: fileName_(data, ext), parents: [FOLDER_ID], mimeType: mime }),
    muteHttpExceptions: true
  });
  var h = res.getAllHeaders();
  var session = h['Location'] || h['location'];
  if (res.getResponseCode() !== 200 || !session) return json_({ ok: false, error: 'start', code: res.getResponseCode() });
  return json_({ ok: true, session: session });
}

/* (느린 길) 조각을 받아 Drive에 이어 붙여요 */
function putChunk_(data) {
  var session = String(data.session || '');
  if (session.indexOf('https://www.googleapis.com/upload/drive/v3/files') !== 0) return json_({ ok: false, error: 'session' });
  var bytes = Utilities.base64Decode(String(data.data || ''));
  var start = Number(data.start), total = Number(data.total);
  if (!bytes.length || !(total > 0) || total > MAX_BYTES || start < 0) return json_({ ok: false, error: 'size' });
  var end = start + bytes.length - 1;

  var res = UrlFetchApp.fetch(session, {
    method: 'put',
    contentType: 'application/octet-stream',
    headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total },
    payload: bytes,
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code === 308) return json_({ ok: true, done: false });
  if (code === 200 || code === 201) return json_({ ok: true, done: true });
  return json_({ ok: false, error: 'chunk', code: code });
}

function fileName_(data, ext) {
  var name = String(data.name || '').replace(/[\\\/:*?"<>|\r\n]/g, '').trim().slice(0, 20) || '이름없음';
  var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd-HHmmss');
  var index = Math.max(1, Math.min(99, parseInt(data.index, 10) || 1));
  return name + '_' + stamp + '_' + index + '.' + ext;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 편집기에서 한 번 '실행'해서 Drive·외부 요청 권한을 미리 허용해요
function authorize() {
  DriveApp.getFolderById(FOLDER_ID).getName();
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
}
