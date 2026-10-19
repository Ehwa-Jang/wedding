261020 작업중
# 민석 ♥ 이화 모바일 청첩장

휴대폰 화면용 한 장짜리 청첩장 페이지예요. 빌드 과정 없이 `index.html`을 그대로 GitHub Pages로 띄웁니다.

## 파일 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 모든 섹션의 글과 구조 (인사말, 오시는 길, Q&A, 계좌 등 문구는 여기서 수정) |
| `css/style.css` | 색상·글꼴·레이아웃 (맨 위 `:root`에서 색을 한 번에 바꿀 수 있어요) |
| `js/main.js` | 봉투 열기, 갤러리·사진 크게 보기, 달력, 계좌 토글, 복사 기능 |
| `images/` | 커버, 인사말 하트 사진, 양가 부모님 편지 이미지 |
| `images/gallery/` | 갤러리 사진 `gallery-01.jpg` ~ `gallery-18.jpg` |

## 갤러리 사진 바꾸기

`images/gallery/` 안의 더미 사진을 **같은 이름의 실제 사진**으로 덮어쓰면 끝이에요.
가로·세로 비율은 상관없어요. 미리보기에서는 가운데가 정사각형으로 보이고, 눌러서 크게 볼 때는 원본 비율로 보여요.
사진 수를 바꾸려면 `js/main.js` 맨 위의 `18`을 원하는 장수로 고쳐요.

## 나중에 붙일 것

- 카카오톡 공유: Kakao JavaScript 키 발급 → `index.html`의 `#shareKakao` 버튼 `hidden` 해제 → `js/main.js`에서 연결
- 지도: 네이버 지도 API 키 발급 → `index.html`의 `#map` 영역에 지도 넣기 (지금은 지도 앱 바로가기 버튼)

## 공개 주소

Settings → Pages → Branch를 `main` / `/ (root)`로 저장하면
`https://ehwa-jang.github.io/wedding/` 에서 볼 수 있어요.
