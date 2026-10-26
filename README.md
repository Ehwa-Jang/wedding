261020 작업중
# 민석 ♥ 이화 모바일 청첩장

휴대폰 화면용 한 장짜리 청첩장 페이지예요. 빌드 과정 없이 `index.html`을 그대로 GitHub Pages로 띄웁니다.

## 파일 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 모든 섹션의 글과 구조 (인사말, 오시는 길, Q&A, 계좌 등 문구는 여기서 수정) |
| `css/style.css` | 색상·글꼴·레이아웃 (맨 위 `:root`에서 색을 한 번에 바꿀 수 있어요) |
| `js/main.js` | 봉투 열기, 갤러리·사진 크게 보기, 달력, 계좌 토글, 복사 기능 |
| `js/love.js` | 하트 보내기 (터지는 애니메이션, 축하 문구, 하트 수 합산) |
| `firebase/database.rules.json` | 하트 카운터용 Firebase 보안 규칙 |
| `images/` | 커버, 인사말 하트 사진, 양가 부모님 편지 이미지 |
| `images/gallery/` | 갤러리 사진 `gallery-01.jpg` ~ `gallery-18.jpg` |

## 갤러리 사진 바꾸기

`images/gallery/` 안의 더미 사진을 **같은 이름의 실제 사진**으로 덮어쓰면 끝이에요.
가로·세로 비율은 상관없어요. 미리보기에서는 가운데가 정사각형으로 보이고, 눌러서 크게 볼 때는 원본 비율로 보여요.
사진 수를 바꾸려면 `js/main.js` 맨 위의 `18`을 원하는 장수로 고쳐요.

## 하트 카운터 설정 (Firebase)

모든 하객이 누른 하트 수를 합산하려면 Firebase Realtime Database가 필요해요. 무료 요금제(Spark)로 충분해요.
설정 전에는 각자 기기에서 누른 수만 보여요.

1. [Firebase 콘솔](https://console.firebase.google.com)에서 **프로젝트 추가** (애널리틱스는 꺼도 돼요)
2. 왼쪽 메뉴 **빌드 → Realtime Database → 데이터베이스 만들기**
   - 위치: **싱가포르(asia-southeast1)** 추천 · 보안 규칙: **잠금 모드**로 시작
3. **규칙** 탭에 `firebase/database.rules.json` 내용을 붙여넣고 **게시**
   (누구나 읽을 수 있고, 한 번에 최대 100개씩 늘리기만 가능 — 줄이거나 다른 값으로 바꾸는 건 막혀요)
4. **데이터** 탭 맨 위의 주소(예: `https://wedding-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app`)를 복사
5. `js/love.js` 맨 위 `FIREBASE_DB_URL = ''` 따옴표 안에 붙여넣고 커밋

처음 숫자를 정하고 싶으면 데이터 탭에서 `love/count`에 숫자를 직접 넣으면 돼요.
축하 문구는 `js/love.js`의 `MESSAGES` 목록에서 고칠 수 있어요.

## 카카오맵 · 카카오톡 공유

`js/main.js` 맨 위 `KAKAO_JS_KEY` 하나로 둘 다 동작해요. [카카오 디벨로퍼스](https://developers.kakao.com) 앱 설정에서 확인할 것:

- **플랫폼 → Web → 사이트 도메인**에 `https://ehwa-jang.github.io` 등록 (없으면 지도·공유 모두 안 돼요)
- **카카오맵** 사용 설정 켜기 (꺼져 있으면 지도만 안 떠요)

지도 위치는 `VENUE.address` 주소로 찾아요. 공유 카드 문구는 `js/main.js`의 `Kakao.Share.sendDefault` 부분에서 고칠 수 있어요.
등록한 도메인에서만 동작해서, 내 컴퓨터에서 파일로 열면 지도는 "불러오지 못했어요"로 보이고 카톡 버튼은 숨겨져요.

## 공개 주소

Settings → Pages → Branch를 `main` / `/ (root)`로 저장하면
`https://ehwa-jang.github.io/wedding/` 에서 볼 수 있어요.
