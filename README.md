# 시설 인력 관리 앱

부동산 관리 회사의 현장 인력(보안 / 청소 / 시설유지보수) 업무 관리 시스템.
직원은 모바일에서 배정된 업무를 확인하고 사진·메모로 완료 보고를 제출하며,
관리자는 데스크탑에서 업무를 생성·배정하고 보고를 검토(승인 / 반려)한다.

> 프로젝트 규칙, 디자인 시스템, 화면 목록은 [`CLAUDE.md`](./CLAUDE.md)를 참조할 것.

---

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| 상태 관리 | Zustand, TanStack Query 5 |
| 백엔드 / DB | Supabase (PostgreSQL + Storage) |
| 인증 | 자체 JWT 세션 쿠키 (`jose`) + `bcryptjs` |
| 이미지 | `browser-image-compression` (클라이언트 리사이징) |

---

## 사전 요구 사항

| 항목 | 버전 / 비고 |
|---|---|
| Node.js | 20 이상 (개발 환경 검증 버전: 26.x) |
| npm | 10 이상 |
| Supabase 프로젝트 | 원격 프로젝트 사용. Docker / Supabase CLI 불필요 |

로컬 Supabase 스택은 사용하지 않는다. 스키마 변경은 **Supabase 대시보드의 SQL Editor**에서 실행한다.

---

## 셋업 절차

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`을 열어 값을 채운다. 각 값의 위치는 아래와 같다.

| 변수 | 필수 | 확인 위치 |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 같은 화면 → `anon` `public` 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 같은 화면 → `service_role` 키 (**클라이언트 노출 금지**) |
| `JWT_SECRET` | 권장 | `openssl rand -base64 32` 로 생성 |
| `DATABASE_URL` / `DATABASE_PASSWORD` | ⬜ | Project Settings → Database. `scripts/migrate.mjs` 사용 시에만 필요 |

Supabase 관련 3개 값이 없으면 **빌드 자체가 실패한다** (`src/lib/supabase-server.ts`에서 즉시 throw).

### 3. 데이터베이스 스키마 적용

> 기존 Supabase 프로젝트를 이어서 쓰는 경우 이 단계는 건너뛴다 (이미 적용됨).

새 Supabase 프로젝트라면 **SQL Editor**에서 `supabase/migrations/` 의 파일을 **파일명 순서대로** 실행한다.

| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | `20260430000001_initial_schema.sql` | 초기 스키마 (`pgcrypto` 확장 포함) |
| 2 | `20260430000002_seed_dev.sql` | 개발용 시드 데이터 — **운영 환경에서는 실행하지 말 것** |
| 3 | `20260501000001_multi_job_types_and_super_admin.sql` | 복수 직군 + 슈퍼 관리자 |
| 4 | `20260501000002_cascade_on_delete.sql` | 인력 삭제 시 연관 데이터 처리 규칙 |
| 5 | `20260801000001_buildings.sql` | 건물 마스터 데이터 |
| 6 | `20260801000002_task_types.sql` | 업무 유형 마스터 데이터 |
| 7 | `20260802000001_auto_archive_approved.sql` | 승인 후 자동 아카이브 전환 |
| 8 | `20260802000002_buildings_metadata.sql` | 건물 상세 정보 확장 |

### 4. Storage 버킷 생성

Supabase → Storage 에서 아래 4개 버킷을 **모두 비공개(private)** 로 생성한다.
버킷 생성은 마이그레이션 SQL에 포함돼 있지 않으므로 반드시 수동으로 만들어야 한다.

| 버킷 | 용도 |
|---|---|
| `report-photos` | 완료 보고 첨부 사진 |
| `task-references` | 업무 참고 이미지 |
| `request-photos` | 업무 요청 첨부 사진 |
| `building-thumbnails` | 건물 썸네일 |

> 버킷이 없어도 업로드 API가 에러를 삼키고 넘어가므로, 화면상 오류 없이 사진만 저장되지 않는다.
> 사진이 사라지는 증상이 보이면 이 항목부터 확인할 것.

### 5. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속.

- 직원 화면: `/login` → `/tasks`
- 관리자 화면: `/admin/login` → `/admin/dashboard`

---

## 셋업 검증

```bash
npx tsc --noEmit   # 타입 체크 — 에러 0이어야 정상
npm run build      # 프로덕션 빌드 — 성공해야 정상
```

빌드 로그에 `Environments: .env.local` 이 찍히면 환경 변수가 정상 로드된 것이다.

`themeColor` 관련 경고와 `npm run lint` 의 기존 에러(대부분 `no-explicit-any`)는
알려진 이슈이며 빌드를 막지 않는다.

---

## 시드 계정 (개발용)

`20260430000002_seed_dev.sql` 을 실행한 경우에만 존재한다. 비밀번호는 전부 `password1234`.

| 구분 | 로그인 ID | 이름 | 직군 |
|---|---|---|---|
| 관리자 | `admin01` | 박관리 | — |
| 관리자 | `admin02` | 이부장 | — |
| 직원 | `kim_boan` | 김보안 | 보안 |
| 직원 | `lee_clean` | 이청소 | 청소 |
| 직원 | `park_yuji` | 박유지 | 시설유지보수 |

> 운영 데이터가 들어 있는 프로젝트에는 시드를 적용하지 않는다.

---

## npm 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint 검사 |

---

## 디렉터리 구조

```
src/
  app/
    (employee)/        직원 모바일 화면 (390px 기준)
    (admin)/admin/     관리자 데스크탑 화면 (1440px 기준)
    api/               API Route (인증, 업무, 보고, 관리자 기능)
  components/          공용 컴포넌트
  constants/           한국어 텍스트 상수
  lib/                 Supabase 클라이언트, 인증, 반복 업무 로직
  store/               Zustand 스토어
  types/               타입 정의
designs/               화면별 HTML 디자인 레퍼런스 (구현 기준)
supabase/migrations/   DB 마이그레이션 SQL
scripts/migrate.mjs    (미사용) pg 기반 마이그레이션 스크립트
```

---

## 참고 사항

- **`scripts/migrate.mjs` 는 현재 동작하지 않는다.** `pg` 패키지가 `package.json` 에 없고,
  마이그레이션 목록도 초기 2개만 하드코딩돼 있다. 스키마 적용은 SQL Editor 를 사용한다.
- UI 텍스트는 **한국어 전용**이다. 자세한 규칙은 `CLAUDE.md` 참조.
- 실시간 갱신은 SSE 방식이며, 브라우저 푸시 알림·오프라인 모드·GPS 는 구현 대상이 아니다.
