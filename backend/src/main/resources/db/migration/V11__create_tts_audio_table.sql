-- Google Cloud Text-to-Speech로 만든 음성(MP3)을 저장해 두는 캐시 테이블. 같은 문장은 사용자와 상관없이
-- 한 번만 합성하고, 이후 요청부터는 여기서 꺼내 써서 외부 API 호출(과 비용)을 피한다.
-- 음성 이름(voice)이 바뀌면 다른 소리라서 같은 문장이어도 새로 합성한다.
CREATE TABLE tts_audio (
    id BIGSERIAL PRIMARY KEY,
    voice VARCHAR(100) NOT NULL,
    text VARCHAR(300) NOT NULL,
    audio BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tts_audio_voice_text UNIQUE (voice, text)
);
