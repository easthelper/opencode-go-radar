# OpenCode Model Radar

## Decision-first dashboard (2026-10-21)

Start with three explicitly separate Go decisions: highest measured AA TB4 result among eligible rows, calculated Go Value leader, and the existing editorial practical candidate. None is an absolute all-model winner. Cards use the full Go cohort; filters change the shortlist and comparison. The ranking selector exposes measured performance, calculated Value, workload cost and name, with the tradeoff shown beside it. Free is excluded from Value rather than treated as infinite value. Sensitive-code recommendations remain unasserted.

`data/popularity.json` is an independent official OpenCode Data snapshot, updated **2026-10-20 23:45 UTC**, checked 2026-10-21. The page switches between past-seven-day token top five and October 20 UTC daily approximate unique-user top eight. Token counts include input, output, reasoning and cached tokens; displayed figures are source-rounded. User counts are approximate distinct counts and are never added across models. No telemetry-derived composite, quality score, Go quota or active offering is created. Null weekly tokens mean outside this selected top-five snapshot, not zero.

Every telemetry mapping is an explicit **model-family reference candidate**, not verified offering attribution or checkpoint parity. Go, Console PAYG and Free usage shares are unknown. Contributor telemetry never inherits the regular Muse Spark offering. Availability remains governed by the separate Go/Console data and official offering docs. `mapping_sources`, `methodology_source`, units, periods and retrieval/update dates are recorded in the snapshot. Popularity loading fails independently of the dashboard and the separate OpenCode Data benchmark reference.

Additional regression: `node tests/decisions.test.cjs`. Existing checks remain `node tests/dashboard.test.cjs`, `node tests/opencode-data.test.cjs`, `node tests/opencode-data-ui.test.cjs`, and `python tests/opencode-builder.test.py`. Browser verification uses desktop 1440×1000 and mobile 390×844: default Go + Free, both independent privacy filters with search, reset, rank axes, popularity axes, native keyboard sorting, detail modal/Escape/focus return, independent Data reference and page overflow. Long comparison tables scroll within bounded panels; all hidden columns remain in model details.

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
- Coding: 동일 AA Terminal-Bench 4.0 원모델 평가 점수 / Value: 동일 Go 구독비 성능·용량 가성비 지수 / Privacy 등급
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


### Reproducible Coding / Value metrics (2026-10-19)

- `coding_evaluation` records the exact evaluated model, effort (or null), benchmark version, task set, harness, metric, publisher and primary source. The numeric Coding column uses only Artificial Analysis Terminal-Bench 4.0 / mini-swe-agent / 66 tasks / pass@1 over three repeats. This is not a test of OpenCode Go routing or endpoint quality. Model-specific effort/token budgets vary; tiny differences are not statistically established wins.
- Missing data, Contributor variants and unconfirmed dated checkpoints are excluded from score sorting. Measured zero remains zero. Existing developer-reported benchmarks remain separate and are not merged.
- Value is a transparent Go subscription value proxy: AA TB4 score (% points) × current effective monthly usage / (input price + 0.2 × output price), normalized to the maximum eligible Go cohort = 100. The denominator uses all eligible Go rows, independent of UI filters. Same subscription fee is assumed; active promotions and expiry affect capacity and the index. This linear quality-capacity proxy can favor inexpensive lower-capability models. It is not expected solved tasks, success probability, measured cost per solved task, or an absolute recommendation. Effort differs across evaluated models. Missing benchmarks, free/unlimited and missing prices/limits are excluded; measured zero remains zero.
- Details separately expose score per dollar, the raw score-capacity product and monthly workload capacity. A workload is aggregate 1M input + 200K output across short-context requests, 0% cache, base price (DeepSeek off-peak). Capacity is not official requests/month. Shared Go quota and 5h/week limits apply; model capacities cannot be summed.
- Console does not inherit Go quota or benchmark mappings. The table shows Go-only/not evaluated with reasons instead of unexplained N/A grades.
- Run `node tests/dashboard.test.cjs` for cohort/zero/null handling, promo expiry, scope separation, sorting, filter reset and modal regression checks.

### Benchmark source coverage

Artificial Analysis provides independently measured current base-model results at https://artificialanalysis.ai/leaderboards/models and per-model pages. The dashboard has 17 directly named base-model mappings (not verified Go endpoint/checkpoint parity). Qwen3.8 Max 0902, DeepSeek V4.1 Flash 1017 and MiMo-V2.5 0424 are reference-only because the Go checkpoint is unconfirmed. Contributor/anonymous offerings do not inherit standard-model scores.

The official Terminal-Bench leaderboard, SWE-bench and Aider offer additional agent/model evaluations, but different task versions, agents, effort and model checkpoints cannot be treated as one ranking. Developer model cards remain useful vendor-reported evidence; their existing benchmark strings remain separate in this dashboard. The recorded `coding_evaluation` objects expose source and methodology URLs for every included value.



### Privacy filters (2026-10-19)

Independent native checkbox filters select **No Training** and **Retention 0 (ZDR)**; enabling both requires both, together with search/offering/risk/region/position filters. Both start unchecked and reset clears them while restoring Go + Free. They do not change the Value reference cohort.

Eligibility uses exact recorded offering-level policies, not model names, numeric substrings, developer nationality or risk grades. Only `No Training` passes the training filter. Only `0 days` or the exact `0 days (ZDR valid through YYYY-MM-DD)` form with a valid unexpired date passes zero retention. Dates are inclusive through that UTC calendar date; expired assurances fail closed until data is reverified. Unknown, null, boolean, conditional/ambiguous and unfamiliar policy values are excluded. Updating policy wording requires an explicit parser/test update rather than a permissive guess. These filters reflect published policy, not measured enforcement. Unknown upstream/hosting region remains unknown even when the offering-level policy passes; region safety is not inferred. Console never inherits Go conditions or expiry.

### OpenCode Data comparison (2026-10-20)

`data/opencode-compare.json` is a **separate reference layer**, not a replacement for AA Coding/Value, recommendations, offering prices, quotas or privacy. It covers the current Go + Console Free rows, not arbitrary provider offerings or PAYG. Offering mappings record official `canonical_model_id`, an official Muse Contributor benchmark alias, or a unique exact published name/ID match. These map base-model reference data, **not measurements of the served endpoint**. Anonymous/unconfirmed models remain unmapped; dated checkpoint identity is never silently inferred.

The six axes reproduce the OpenCode comparison formulas at recorded `source_commit` over the whole 555-model catalog population, independent of dashboard filters:

- Reasoning/Coding: maximum benchmark-name-and-version percentile. Dataset, metric, effort and harness may differ, so these are broad relative indices, not controlled-condition performance rankings or percentage accuracy.
- Tool use: average benchmark percentile, additionally grouped by harness (or variant if absent). A measured zero can mean lowest percentile, not no tool support.
- Cost: inverse percentile of catalog input+output unit prices, **not Go subscription value or the dashboard workload cost**. Catalog reference prices never overwrite offering prices. Contributor/free cost conditions remain separate.
- Context: catalog context percentile. Multimodal: relative count of non-text modalities and attachment support, not multimodal quality.
- Official neutral 50 / capability-only fallback values are retained as `source_value` for audit but displayed as N/A/support-only, never as measured performance. Null differs from measured zero.

Raw benchmark name, version, score, metric, harness, variant, dataset and source remain inspectable. Different tasks/harnesses are not merged into the existing AA cohort. General popularity/session/retention statistics are not used as performance evidence.

To reproduce, download the two official JSON files from `sources.catalog` and `sources.pricing`, then run:

```sh
python scripts/build-opencode-data.py /path/catalog.json /path/api.json --checked-at 2026-10-20T04:53:29Z
node tests/dashboard.test.cjs
node tests/opencode-data.test.cjs
```

The builder records input SHA-256 hashes and a real retrieval timestamp. Empty/invalid source inputs fail before replacing the previous snapshot. Review mapping coverage and upstream formula changes before accepting a new snapshot; do not assume a newer model is the same checkpoint. The comparison layer fails independently so an unavailable JSON file does not hide the existing dashboard. This addition does not change automation configuration.
