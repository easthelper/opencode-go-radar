# OpenCode Go Radar

OpenCode Go 모델의 **가격 · 코딩 성능 · 프라이버시 · provider/routing · 데이터 보존 · 중국 관련 데이터 처리 상태**를 추적하는 정적 대시보드입니다.

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
- 모델 포지셔닝 및 추천 우선순위

`Unknown`은 임의 추정하지 않고 확인 불가 상태로 남긴 값입니다. 서로 다른 benchmark harness 결과는 단일 점수로 합산하지 않습니다.

## Automation

자동화 흐름은 단순하게 유지합니다.

1. 매일 오전 8시 KST에 ChatGPT 자동 점검이 OpenCode Go 공식 자료와 관련 provider 문서를 조사합니다.
2. 검증 가능한 변경이 있을 때만 `data/models.json`과 `as_of`를 업데이트합니다.
3. `data/**` 변경이 `main`에 반영되면 `.github/workflows/pages.yml`이 GitHub Pages를 자동 재배포합니다.
4. 변경이 없으면 불필요한 repo 커밋이나 Pages 재배포를 만들지 않습니다.

GitHub Actions 자체는 별도의 일일 조사/리포트 생성을 수행하지 않습니다. 조사와 판단은 ChatGPT 자동 점검이 담당하고, GitHub는 정적 사이트 배포만 담당합니다.

## Cost convention

`Estimated Cost = Input Price × 1.0 + Output Price × 0.2`

즉 Input 1,000,000 tokens + Output 200,000 tokens 기준입니다.
