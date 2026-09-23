"use client";

interface Segment {
  text: string;
  isWordLike: boolean;
}

function segmentJapanese(text: string): Segment[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
    return Array.from(segmenter.segment(text)).map((s) => ({
      text: s.segment,
      isWordLike: s.isWordLike ?? false,
    }));
  }
  // Intl.Segmenter를 지원하지 않는 환경에서는 문자 단위로 대체한다.
  return Array.from(text).map((ch) => ({
    text: ch,
    isWordLike: /[\p{L}\p{N}]/u.test(ch),
  }));
}

export default function VillagerMessage({
  text,
  onWordClick,
}: {
  text: string;
  onWordClick: (word: string, x: number, y: number) => void;
}) {
  const segments = segmentJapanese(text);

  return (
    <span>
      {segments.map((seg, i) =>
        seg.isWordLike ? (
          <button
            key={i}
            type="button"
            className="wordToken"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onWordClick(seg.text, rect.left + rect.width / 2, rect.top);
            }}
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}
