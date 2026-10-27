# 작업 인수인계 (버전 2 진행 중)

새 작업 세션에서 이 파일부터 읽어 주세요.

## 프로젝트
- 모바일 청첩장: 민석 ♥ 이화 · 2027.03.13(토) 오후 3시 · 웨딩시그니처 2층 트리니티홀 (서울 마포구 양화로 87)
- 사이트: https://ehwa-jang.github.io/wedding/ (main에 push하면 GitHub Actions로 자동 배포, 배포 때 `?v=dev`가 커밋 번호로 바뀌어 캐시를 깨요)
- 디자인 캔버스(Claude 아티팩트): https://claude.ai/artifact/BTjvggF9fNmTX5ErJGVn5E — 현재 디자인은 "2안" 보드들(`*-2.dc.html`), 1안은 보관용

## 작업 방식
- 캔버스에서 먼저 디자인 → "코드에 반영해줘" 하면 코드 수정·배포. 캔버스는 사용자도 직접 고치므로 작업 전 항상 최신본을 다시 읽기
- 짧은 한국어 답변 선호
- 넣지 않기로 한 것: 하단 고정 바, 혼주 이름 줄, D-day

## 디자인 기준
- 색: 세이지(피스타치오) 그린 90% + 화이트 + 연분홍 포인트 (css/style.css `:root` 토큰)
- 글꼴: Work Sans / IBM Plex Sans KR, 인사말·감사 인사는 온글잎 박다현체(눈누 CDN)
- 스티커·하트는 평면(그라데이션·반사광 없음) + 흰 테두리

## 구조
- index.html · css/style.css · js/main.js(봉투·갤러리·지도·공유) · js/love.js(하트 카운터, Firebase RTDB)
- 봉투: 접속 0.5초 뒤 또는 첫 스크롤에 자동으로 열림, 누르면 여닫기
- 카카오: JS 키는 js/main.js `KAKAO_JS_KEY`. 공유 링크가 열리려면 Kakao Developers [앱] > [제품 링크 관리] > [웹 도메인]에 사이트 주소 등록 필요
- 파비콘: images/favicon.ico · favicon-32/192.png · apple-touch-icon.png (그라데이션 하트 스티커)
- 공유 미리보기 이미지: images/og.jpg (봉투 사진은 images/cover.jpg)
- 캘린더에 추가하기(V2): 달력 아래 버튼 하나 → wedding.ics(휴대폰 기본 캘린더, 알림 없음). 카톡 안에서는 외부 브라우저로 열기(js/main.js). 나중에 달력 이미지 오른쪽 아래에 넣는 것도 고민 중. 캔버스 `Calendar-2-2`
- 배경음악(V2): audio/bgm.m4a (원본 21분 → AAC 96kbps로 줄임), 오른쪽 위 고정 버튼(js/main.js `bgm`). 첫 터치 때 재생 시작, 끄면 다시 안 켜짐, 앱 나가면 멈춤. 캔버스 보드 `Main-2-bgm`
- 하객 사진·영상(V2, GUEST SNAP): 공유하기 아래 섹션, js/snap.js. Apps Script는 Drive 업로드 자리(resumable session, Origin=사이트 주소)만 만들고, 파일은 휴대폰에서 Drive로 바로 올림(사진은 2000px JPEG로 줄임, 영상은 원본, 한 개 300MB까지, 3개씩 동시에). 바로 올리기가 막히면 Apps Script 경유 8MB 조각으로 자동 전환. 코드는 docs/guest-snap-apps-script.gs, 웹 앱 주소는 js/snap.js `SNAP_UPLOAD_URL`(비어 있으면 "곧 열릴 예정이에요"). 노출 기간 제한 없음. 캔버스 `GuestSnap-2`, `GuestSnapPicked-2`
- 푸터: 맨 아래 별도 섹션(.foot), 캔버스 `Footer-2`
- 지도 앱 링크: 카카오맵 kko.to/nzLoHhTfSQ · 네이버 naver.me/G9UarGMu · 티맵 tmap.life/96d7bac3

## 남은 일
- 갤러리 실제 사진 20장 (images/gallery/gallery-01~20.jpg 같은 이름으로 교체: 01~05 대표 사진 캐러셀 3:4 세로, 06~20 격자)
- 버전 2: ~~BGM~~(완료) · 하객 사진(Apps Script 웹 앱 연결 완료)
- 도메인 연결(선택)
