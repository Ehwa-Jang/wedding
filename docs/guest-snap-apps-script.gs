/**
 * 하객 사진(GUEST SNAP) → Google Drive 저장용 Apps Script
 *
 * 1) Google Drive에 사진을 모을 폴더를 만들고, 폴더 주소의 마지막 부분(ID)을 아래 FOLDER_ID에 넣어요.
 *    예) https://drive.google.com/drive/folders/1AbCdEf...  →  '1AbCdEf...'
 * 2) script.google.com → 새 프로젝트 → 이 코드를 통째로 붙여넣고 저장
 * 3) 배포 → 새 배포 → 유형: 웹 앱
 *      - 실행 사용자: 나
 *      - 액세스 권한이 있는 사용자: 모든 사용자
 *    → 권한 허용 후 나오는 "웹 앱 URL"(…/exec)을 js/snap.js의 SNAP_UPLOAD_URL에 넣어요.
 *
 * 하객은 로그인 없이 사진을 보낼 수 있고, 폴더는 신랑·신부 계정에서만 보여요.
 * 파일 이름: 보내는분이름_20270313-153012_1.jpg
 */

var FOLDER_ID = '여기에_폴더_ID';
var MAX_BYTES = 10 * 1024 * 1024;   // 한 장 최대 10MB (청첩장에서 미리 줄여서 보내요)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var name = String(data.name || '').replace(/[\\\/:*?"<>|\r\n]/g, '').trim().slice(0, 20) || '이름없음';
    var bytes = Utilities.base64Decode(String(data.image || ''));
    if (!bytes.length || bytes.length > MAX_BYTES) return json_({ ok: false, error: 'size' });

    var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd-HHmmss');
    var index = Math.max(1, Math.min(99, parseInt(data.index, 10) || 1));
    var blob = Utilities.newBlob(bytes, 'image/jpeg', name + '_' + stamp + '_' + index + '.jpg');
    DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  }
}

// 주소를 브라우저로 열었을 때 동작 확인용
function doGet() {
  return json_({ ok: true, message: 'guest snap uploader is running' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
