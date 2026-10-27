/**
 * 하객 사진·영상(GUEST SNAP) → Google Drive 저장용 Apps Script
 *
 * 1) Google Drive에 모을 폴더를 만들고, 폴더 주소의 마지막 부분(ID)을 아래 FOLDER_ID에 넣어요.
 *    예) https://drive.google.com/drive/folders/1AbCdEf...  →  '1AbCdEf...'
 * 2) script.google.com → 새 프로젝트 → 이 코드를 통째로 붙여넣고 저장
 * 3) 배포 → 새 배포 → 유형: 웹 앱 (실행 사용자: 나 / 액세스: 모든 사용자)
 *    → "웹 앱 URL"(…/exec)을 js/snap.js의 SNAP_UPLOAD_URL에 넣어요.
 *    코드를 고친 뒤에는: 배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포 (주소는 그대로)
 *
 * 사진: 청첩장에서 줄인 JPEG를 한 번에 받아 저장해요.
 * 영상: 청첩장이 8MB씩 잘라 보내면, Drive의 '이어 올리기(resumable upload)'로 하나의 파일로 붙여요.
 * 파일 이름: 보내는분이름_20270313-153012_1.jpg / .mp4 / .mov
 */

var FOLDER_ID = '여기에_폴더_ID';
var MAX_PHOTO = 10 * 1024 * 1024;    // 사진 한 장 최대 10MB
var MAX_VIDEO = 300 * 1024 * 1024;   // 영상 한 개 최대 300MB (js/snap.js의 값과 같게)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'start') return startVideo_(data);
    if (data.action === 'chunk') return putChunk_(data);
    return savePhoto_(data);
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  }
}

// 주소를 브라우저로 열었을 때 동작 확인용
function doGet() {
  return json_({ ok: true, message: 'guest snap uploader is running' });
}

/* 사진 */
function savePhoto_(data) {
  var bytes = Utilities.base64Decode(String(data.image || ''));
  if (!bytes.length || bytes.length > MAX_PHOTO) return json_({ ok: false, error: 'size' });
  var blob = Utilities.newBlob(bytes, 'image/jpeg', fileName_(data, 'jpg'));
  DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  return json_({ ok: true });
}

/* 영상 1단계: Drive에 이어 올리기 자리(session)를 만들어 주소를 돌려줘요 */
function startVideo_(data) {
  var size = Number(data.size);
  if (!(size > 0) || size > MAX_VIDEO) return json_({ ok: false, error: 'size' });
  var mime = /^video\/[\w.+-]+$/.test(String(data.mime)) ? String(data.mime) : 'video/mp4';
  var ext = String(data.ext || 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() || 'mp4';

  var res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'post',
    contentType: 'application/json; charset=UTF-8',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'X-Upload-Content-Type': mime,
      'X-Upload-Content-Length': String(size)
    },
    payload: JSON.stringify({ name: fileName_(data, ext), parents: [FOLDER_ID], mimeType: mime }),
    muteHttpExceptions: true
  });
  var h = res.getAllHeaders();
  var session = h['Location'] || h['location'];
  if (res.getResponseCode() !== 200 || !session) return json_({ ok: false, error: 'start' });
  return json_({ ok: true, session: session });
}

/* 영상 2단계: 조각을 받아 Drive에 이어 붙여요. 마지막 조각이면 파일이 완성돼요 */
function putChunk_(data) {
  var session = String(data.session || '');
  if (session.indexOf('https://www.googleapis.com/upload/drive/v3/files') !== 0) return json_({ ok: false, error: 'session' });
  var bytes = Utilities.base64Decode(String(data.data || ''));
  var start = Number(data.start), total = Number(data.total);
  if (!bytes.length || !(total > 0) || total > MAX_VIDEO || start < 0) return json_({ ok: false, error: 'size' });
  var end = start + bytes.length - 1;

  var res = UrlFetchApp.fetch(session, {
    method: 'put',
    contentType: 'application/octet-stream',
    headers: { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total },
    payload: bytes,
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code === 308) return json_({ ok: true, done: false });            // 다음 조각 기다리는 중
  if (code === 200 || code === 201) return json_({ ok: true, done: true }); // 완성
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

// 처음 한 번 편집기에서 이 함수를 '실행'하면 Drive·외부 요청 권한을 미리 허용할 수 있어요
function authorize() {
  DriveApp.getFolderById(FOLDER_ID).getName();
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
}
