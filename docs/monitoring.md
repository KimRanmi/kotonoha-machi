# 모니터링 (서버 상태 알림 · 오류 확인 · AI 사용량)

혼자 운영하는 서비스 규모에 맞춰 세 가지만 한다. 결정 배경은 `docs/decisions/0045-monitoring-health-and-ai-usage.md`.

## 1. 서버 상태 확인과 죽었을 때 알림

### 헬스체크 주소

`https://<DOMAIN>/actuator/health` — 로그인 없이 열린다. 정상이면 HTTP 200, 본문은 `{"status":"UP"}`(와 groups 이름 목록)뿐이다.
DB 연결이 끊기면 HTTP 503 `{"status":"DOWN"}`이 된다(서버는 떠 있어도 DB가 죽으면 서비스가 안 되기 때문에 DB 상태를 포함한다).

- 열려 있는 것은 이 경로 하나다. 세부 정보(DB 종류·디스크 등)와 다른 actuator 경로(`/actuator/env` 등)는 만들지도 않았고, Caddy도 `/actuator/health`만 백엔드로 넘긴다.
- VM에서 직접 확인: `curl -i https://<DOMAIN>/actuator/health`

### Google Cloud Monitoring 업타임 체크로 알림 받기 (직접 설정)

배포한 GCP 프로젝트에서 설정한다(새 가입 불필요). 아래 화면 이름은 콘솔 개편으로 조금 다를 수 있고, 이 단계는 실제 콘솔에서 확인하지 못했다.

1. GCP 콘솔에서 VM이 있는 프로젝트를 고르고 **Monitoring → Uptime checks**(업타임 체크)로 간다. 처음이면 Monitoring API 사용을 묻는다(허용).
2. **Create Uptime Check**를 누른다.
3. Protocol **HTTPS**, Resource Type **URL**, Hostname `<DOMAIN>`(https:// 없이), Path `/actuator/health`로 쓴다.
4. Check frequency는 **1 minute**로 한다. Regions는 아시아 지역이 포함되게 고른다(전 지역 선택도 가능).
5. Response Validation에서 응답 코드 **200**만 성공으로 보게 둔다(DB가 죽으면 503이라 실패로 잡힌다). 본문 검사를 하려면 "contains" `UP`을 추가한다.
6. 다음 단계 **Alert & notification**에서 알림 정책을 만들고 알림 채널로 **Email**(내 이메일)을 추가한다. 폰 푸시를 원하면 Google Cloud 모바일 앱을 깔고 채널로 연결한다.
7. 만든 뒤 체크 상태가 초록(통과)인지 본다. 알림이 가는지 보려면 VM에서 `docker compose -f docker-compose.prod.yml stop backend` 후 몇 분 기다렸다가 `start backend`로 되돌려 본다.

참고: 도메인·인증서·프록시·백엔드·DB가 한 번에 감시된다. 배포(빌드 중 몇 분)나 재시작 때는 잠깐 알림이 올 수 있다. 무료 한도·요금은 가입 전 공식 가격 페이지에서 확인한다(업타임 체크 1개는 무료 한도 안이라고 알고 있으나 확인하지 못했다). 대안: UptimeRobot(무료 5분 간격), Better Stack(약 3분)도 같은 주소(`/actuator/health`)를 넣으면 된다.

## 2. 오류 확인 (VM에서)

```bash
cd ~/kotonoha-machi   # 프로젝트가 있는 곳
docker compose -f docker-compose.prod.yml logs --tail 200 backend          # 최근 200줄
docker compose -f docker-compose.prod.yml logs -f backend                  # 실시간
docker compose -f docker-compose.prod.yml logs --since 1h backend | grep -E "ERROR|WARN"
docker compose -f docker-compose.prod.yml ps                               # 컨테이너 상태(재시작 반복 여부)
```

- 처리하지 못한 예외는 `GlobalExceptionHandler`가 `예상하지 못한 오류가 발생했습니다.` + 스택 트레이스로 `ERROR`에 남긴다. 사용자에게는 일반 오류 응답(500)만 나간다.
- Gemini·TTS·메일 실패는 각각 `Gemini 호출 실패`, `Google TTS 호출 실패`, `이메일 발송 실패`로 남는다.
- 로그가 쌓여 디스크가 차지 않게 docker 로그 로테이션(기본 json-file은 무제한)을 쓰고 싶다면 별도로 설정한다(아직 하지 않음).

### 로그에 민감한 정보가 남는지 점검한 결과

- API 키(Gemini·TTS)·비밀번호: 로그에 찍는 코드가 없다. Gemini·TTS 호출 실패 로그는 예외 메시지에 요청 정보가 섞일 수 있어 상태 코드나 예외 클래스 이름만 남긴다.
- 대화·프롬프트 내용: 로그에도, AI 사용량 테이블에도 남기지 않는다.
- 고친 것: 이메일 발송 실패 로그가 수신자 이메일 주소(개인정보)와 예외 메시지를 그대로 찍던 것을 예외 클래스 이름만 남기도록 바꿨다.
- 남은 것: 예상 못 한 예외의 스택 트레이스(`GlobalExceptionHandler`)에는 예외 메시지가 들어간다. 지금 코드에서 메시지에 비밀 값이 들어가는 경로는 찾지 못했다.

## 3. AI(Gemini) 사용량·비용

`ai_usage` 테이블에 Gemini 호출 한 번마다 한 줄이 쌓인다. 대상은 주민 대화(`CHAT`), 하루 대화 요약(`SUMMARY`), 단어 뜻 번역(`TRANSLATE`)이다. TTS(Google Text-to-Speech)는 Gemini가 아니라 이 기록에 포함되지 않는다.

| 컬럼 | 의미 |
| --- | --- |
| `user_id` | 호출을 일으킨 사용자(탈퇴하면 NULL) |
| `call_type` | CHAT / SUMMARY / TRANSLATE |
| `model` | 호출한 모델 이름 |
| `input_tokens`, `output_tokens` | Gemini 응답의 `usageMetadata` 값. 출력 토큰은 추론 토큰을 합친 값(추론도 출력 단가로 청구된다). 실패한 호출은 NULL |
| `success`, `error_status` | 성공 여부, 실패 시 Google HTTP 상태(429는 무료 한도 초과) |
| `created_at` | 시각 |

- 프롬프트·대화 내용은 저장하지 않는다. 기록 저장이 실패해도(DB 오류 등) 대화·번역은 그대로 성공하고 경고 로그(`AI 사용량 기록 실패`)만 남는다.
- 번역은 같은 단어를 메모리에 캐시하므로 캐시에서 나간 번역은 Gemini를 부르지 않아 기록되지 않는다(실제 호출만 센다).
- 키가 없어 호출 자체를 하지 않은 경우도 기록되지 않는다.

### 조회 방법

VM에서 psql로 들어가 SQL을 실행한다(관리자 화면·API는 만들지 않았다).

```bash
docker compose -f docker-compose.prod.yml exec db psql -U kotonoha_machi -d kotonoha_machi
```

가격은 코드에 넣지 않고 아래 `\set`으로 정한다. 값은 100만 토큰당 달러이고, 아래는 gemini-3.5-flash-lite 기준(입력 $0.30 / 출력 $2.50)이다. 모델이나 가격이 바뀌면 이 두 값만 고친다. 날짜는 한국 시간 기준이다.

```sql
\set in_price 0.30
\set out_price 2.50

-- 일별 호출 수·토큰·대략 비용 (최근 14일)
SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
       count(*) AS calls,
       count(*) FILTER (WHERE NOT success) AS failed,
       coalesce(sum(input_tokens), 0) AS input_tokens,
       coalesce(sum(output_tokens), 0) AS output_tokens,
       round((coalesce(sum(input_tokens), 0) * :in_price
            + coalesce(sum(output_tokens), 0) * :out_price) / 1000000.0, 4) AS cost_usd
FROM ai_usage
WHERE created_at >= now() - interval '14 days'
GROUP BY 1 ORDER BY 1 DESC;

-- 월별, 모델별
SELECT to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') AS month,
       model, count(*) AS calls,
       coalesce(sum(input_tokens), 0) AS input_tokens,
       coalesce(sum(output_tokens), 0) AS output_tokens,
       round((coalesce(sum(input_tokens), 0) * :in_price
            + coalesce(sum(output_tokens), 0) * :out_price) / 1000000.0, 4) AS cost_usd
FROM ai_usage
GROUP BY 1, 2 ORDER BY 1 DESC, 2;

-- 종류별 (오늘, 한국 시간)
SELECT call_type, count(*) AS calls, count(*) FILTER (WHERE NOT success) AS failed
FROM ai_usage
WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date
GROUP BY 1 ORDER BY 1;

-- 무료 한도(모델별 하루 약 20회) 초과(429) 횟수가 많은 날
SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*) AS quota_errors
FROM ai_usage WHERE error_status = 429 GROUP BY 1 ORDER BY 1 DESC LIMIT 14;

-- 사용자별 호출 수 (많이 쓰는 순)
SELECT user_id, count(*) AS calls FROM ai_usage
WHERE created_at >= now() - interval '30 days'
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
```

주의: 비용은 어디까지나 대략치다. 실제 청구는 Google Cloud/AI Studio 결제 화면이 기준이고, 무료 한도 안에서는 청구되지 않는다. 가격은 모델·시기에 따라 바뀌므로 `\set` 값을 공식 가격표와 맞춰 쓴다. 호출이 실패해 토큰이 NULL인 줄은 비용 0으로 계산된다.
