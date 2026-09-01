# OpenCode Go Radar

OpenCode Go 모델의 **가격 · 코딩 성능 · 프라이버시 · provider/routing · 데이터 보존 · 중국 관련 데이터 처리 상태**를 추적하는 정적 리포트입니다.

## Dashboard

GitHub Pages: https://easthelper.github.io/opencode-go-radar/

- 모델명 검색
- 가격/성능/가성비 컬럼 정렬
- Privacy Risk 필터
- 중국 전송 가능성 필터
- 포지셔닝 필터
- Input 1M + Output 200K 기준 예상 비용 자동 계산

## Data

`data/models.json`이 단일 데이터 소스입니다.

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
- 모델 포지셔닝

`Unknown`은 임의 추정하지 않고 확인 불가 상태로 남긴 값입니다. 서로 다른 benchmark harness 결과는 단일 점수로 합산하지 않습니다.

## Email report

`scripts/build_email.py`가 같은 데이터로 `reports/email-latest.html`을 생성합니다.

메일 클라이언트에서는 JavaScript 정렬이 지원되지 않기 때문에 이메일은 읽기 좋은 정적 테이블을 사용하고, 전체 정렬/검색/필터는 GitHub Pages 대시보드로 연결합니다.

## Automation

- `.github/workflows/daily-report.yml`
  - 매일 `08:00 KST` 실행
  - JSON 검증
  - 이메일 HTML 재생성
  - 변경이 있으면 자동 커밋
- `.github/workflows/pages.yml`
  - 대시보드/데이터/리포트 변경 시 GitHub Pages 재배포

> 현재 workflow는 **리포트 생성/배포**를 자동화합니다. 외부 웹 자료를 AI가 자동 조사해 `models.json`을 갱신하는 단계는 별도입니다. 검증된 조사 결과를 `models.json`에 반영하면 사이트와 이메일은 자동으로 따라 갱신됩니다.

## Cost convention

`Estimated Cost = Input Price × 1.0 + Output Price × 0.2`

즉 Input 1,000,000 tokens + Output 200,000 tokens 기준입니다.
