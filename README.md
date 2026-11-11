# GAiA 생성형 AI 자료실

가천대학교 중앙도서관 AI도서관(GAiA)이 고른 생성형 AI 영상·블로그·GitHub 자료 모음입니다.
GitHub Pages로 배포하는 정적 사이트이며, 서버나 빌드 과정이 필요 없습니다.

## 페이지 구성

| 파일 | 내용 |
|---|---|
| `index.html` | 홈 — 사서 추천, 유형별 바로가기, 컬렉션, 새 자료 |
| `resources.html` | 전체 자료 (유형·대상·난이도·검색 필터) |
| `videos.html` → `video.html#<id>` | 영상 목록 → 영상 상세(사이트 안에서 재생) |
| `articles.html` | 블로그·아티클과 GitHub 통합 목록 (탭으로 구분, 카드를 누르면 원문·저장소로 이동). `articles.html#blog`, `articles.html#repo`로 탭을 바로 열 수 있음 |
| `briefing.html` | 주간 브리핑 |
| `guide.html` | 가이드라인·서비스 안내·자료 추천 요청 |
| `admin.html` | 관리자 페이지 — 자료 추가·수정·삭제, GitHub 저장 |

## 자료 추가하는 법 — 관리자 페이지 (`admin.html`)

사이트 주소 뒤에 `/admin.html`을 붙여 엽니다. 메뉴에는 나오지 않으며 검색엔진에도 노출되지 않습니다.

1. **영상 추가**: 유튜브 주소를 붙여 넣고 '정보 불러오기' → 제목·채널이 자동으로 채워집니다. 게시일(선택), 난이도, 대상, 태그, 사서 한마디를 넣고 '목록에 추가'.
2. **GitHub 추가**: 저장소 주소를 넣고 '정보 불러오기' → 이름·소유자·최근 업데이트 월과 저장소 설명(한마디 작성 참고용)이 채워집니다.
3. **블로그·아티클 추가**: 보안 정책상 다른 사이트의 제목은 자동으로 못 가져옵니다. 주소·제목·출처를 직접 넣습니다.
4. **목록 관리**: 검색해서 수정·삭제·'홈 추천'(홈 상단 '이번 주 사서 추천' 1건)을 지정합니다.
5. 여러 건을 추가한 뒤 화면 아래 **'GitHub에 저장'**을 누르면 한 번의 커밋으로 반영되고, 1~2분 뒤 사이트에 나타납니다.

- 이미 등록된 영상·주소는 추가되지 않습니다(중복 차단).
- 저장하기 전에는 '변경 취소'로 모두 되돌릴 수 있습니다. 저장 후 되돌리려면 GitHub의 커밋 기록(History)에서 이전 버전을 복원합니다.
- 다른 사람이 그사이 데이터를 바꿨다면 저장을 막고 안내합니다. '데이터 파일 내려받기'로 내 변경을 보관한 뒤 다시 불러오세요.

### 토큰 없이 쓰는 방법
토큰이 없어도 관리자 페이지에서 자료를 추가하고 **'데이터 파일 내려받기'**를 누를 수 있습니다. 내려받은 `resources.js`를 GitHub 저장소의 `data` 폴더에 올리면(Add file → Upload files, 같은 이름으로 덮어쓰기) 반영됩니다.

### 'GitHub에 저장'용 토큰 만들기 (최초 1회)
1. GitHub → 오른쪽 위 프로필 → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. Token name: `gaia-admin`, Expiration: 90일 등 기간 지정
3. Repository access: **Only select repositories** → 이 사이트 저장소만 선택
4. Permissions → Repository permissions → **Contents: Read and write** (나머지는 건드리지 않음)
5. 생성된 `github_pat_…` 값을 관리자 페이지 'GitHub 연결'의 토큰 칸에 붙여 넣습니다.

토큰은 GitHub API로만 전송되고 사이트 파일에는 저장되지 않습니다. '이 브라우저에 토큰 기억하기'를 켜면 그 브라우저에만 보관되니, 공용 PC에서는 끄고 쓰세요. 기관 계정(Organization) 저장소라면 조직 설정에서 Fine-grained 토큰 사용을 허용해야 할 수 있습니다.

### 직접 고칠 때
`data/resources.js`는 JSON 형식입니다(키와 문자열은 큰따옴표, 마지막 항목 뒤 쉼표 없음). 형식이 깨지면 사이트가 비어 보이니 되도록 관리자 페이지를 쓰세요. 주간 브리핑은 아직 관리자 페이지에서 편집할 수 없어 이 파일의 `briefings`를 직접 고칩니다.

## 배포

1. 이 폴더 전체를 GitHub 저장소(공개)에 올립니다.
2. 저장소 **Settings → Pages → Build and deployment**에서 Source를 `Deploy from a branch`, Branch를 `main` / `/(root)`로 저장합니다.
3. 몇 분 뒤 `https://<계정>.github.io/<저장소>/`에서 열립니다.

학교 주소(예: `aiguide.gachon.ac.kr`)를 쓰려면 Pages 설정의 Custom domain에 주소를 넣고, 정보전산 부서에 해당 주소의 CNAME을 `<계정>.github.io`로 요청합니다.

## 링크 점검

`.github/workflows/link-check.yml`이 매주 월요일 아침 자료 링크를 점검하고, 끊긴 링크가 있으면 이슈를 올립니다. Actions 탭에서 직접 실행할 수도 있습니다.
