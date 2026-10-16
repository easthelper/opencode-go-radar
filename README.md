# OpenCode Model Radar

OpenCode Go 및 Console (Zen) 직접 제공 모델의 **가격 · 코딩 성능 · 프라이버시 · provider/routing · 데이터 보존 · 중국 관련 데이터 처리 상태**를 추적하는 정적 대시보드입니다.

## Dashboard

GitHub Pages: https://easthelper.github.io/opencode-go-radar/

- 모델명 검색
- 가격/성능/가성비 컬럼 정렬
- Privacy Risk 필터
- 중국 전송 가능성 필터
- 포지셔닝 필터
- Input 1M + Output 200K 기준 예상 비용 자동 계산

## Data

`data/models.json`과 `data/usage.json`은 Go 전용이며, `data/console.json`은 Console 무료/PAYG 전용입니다.

주요 필드:

- OpenCode Go input/output/cache 가격
- context / reasoning 지원
- 실제 또는 관측된 provider/routing
- coding benchmark
- training 사용 여부
- retention / ZDR
- 모델 개발사 국적과 실제 호스팅 위치의 분리
- 중국 전송 가능성
- Coding / Value / Privacy 등급
- 모델 포지셔닝 및 추천 우선순위

`Unknown`은 임의 추정하지 않고 확인 불가 상태로 남긴 값입니다. 서로 다른 benchmark harness 결과는 단일 점수로 합산하지 않습니다.

## Automation

자동화 흐름은 단순하게 유지합니다.

1. 매일 오전 8시 KST에 ChatGPT 자동 점검이 OpenCode Go 및 Console 공식 자료와 관련 provider 문서를 조사합니다.
2. 검증 가능한 변경이 있을 때만 해당 데이터 파일과 그 파일의 `as_of`를 업데이트합니다.
3. `data/**` 변경이 `main`에 반영되면 `.github/workflows/pages.yml`이 GitHub Pages를 자동 재배포합니다.
4. 데이터 변경이 없으면 데이터 날짜는 보존합니다. 실제 점검 완료 시 Last checked 갱신은 허용합니다.

GitHub Actions 자체는 별도의 일일 조사/리포트 생성을 수행하지 않습니다. 조사와 판단은 ChatGPT 자동 점검이 담당하고, GitHub는 정적 사이트 배포만 담당합니다.

## Cost convention

`Estimated Cost = Input Price × 1.0 + Output Price × 0.2`

즉 Input 1,000,000 tokens + Output 200,000 tokens 기준입니다.

## Console expansion (2026-10-16)

The dashboard now covers OpenCode's own Go and Console (formerly Zen) offerings. Arbitrary third-party provider catalogs are out of scope.

- `data/models.json` and `data/usage.json` remain Go-only and retain their existing schema and recommendations. Usage joins by model name apply only to Go rows. Runtime identities are `go:<model name>`.
- `data/console.json` schema version 1 contains `as_of`, `sources`, `models`, and `excluded_models`. Console identities are `offering_id: console:<model_id>` with `offering: console-free | console-payg` and the exact `selection_id: opencode/<model_id>`.
- Console rows independently record pricing, `price_tiers`, privacy, limits, promotion/end date, source and checked date. No Go quota, routing, privacy or ZDR expiry is inherited. Unknown values are not zero or unlimited.
- Explicit deprecated entries are excluded even when stale endpoint/pricing rows remain, and the conflict is recorded in `excluded_models`.
- Cards remain Go-specific. No Console benchmark ranking is invented. Expanded details expose IDs, price tiers, restrictions and source links.
- Data changed is the latest date across all three JSON files; Last checked is separate. Update only substantively changed data dates. The existing Pages workflow deploys all `data/**` and `assets/**` changes.

### Maintenance

Check the current official Go and Console documentation for availability, price tiers, free promotions, expiration, training/retention, routing and regional restrictions. Treat Console free and paid versions as separate offerings. Do not copy DeepSeek Go's ZDR expiration onto the free Console ID. Preserve base versus promotional pricing/usage. Never infer unlimited usage from a zero token price. Audit source conflicts and deprecated records before marking models active.

Local regression checks: `node tests/dashboard.test.cjs`. Serve the repository root with a static HTTP server to inspect the UI.


### Compact filters and details

The initial view and filter reset show Go + Console Free. Choose OpenCode Free only, Go only, PAYG only or all offerings from the offering selector. Details open in a shared native modal outside the table; its bounded content scrolls independently. Close with the button, Escape or backdrop, then keyboard focus returns to the triggering row.
