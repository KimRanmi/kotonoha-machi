"use client";

import { useEffect, useRef } from "react";

export interface WordPopupState {
  word: string;
  x: number;
  y: number;
  alreadyAdded: boolean;
}

export default function AddWordPopup({
  popup,
  onAdd,
  onClose,
}: {
  popup: WordPopupState;
  onAdd: (word: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="wordPopup"
      style={{ left: popup.x, top: popup.y }}
    >
      <button
        type="button"
        className="wordPopupButton"
        disabled={popup.alreadyAdded}
        onClick={() => {
          onAdd(popup.word);
          onClose();
        }}
      >
        {popup.alreadyAdded ? "이미 추가됨" : "학습 목록에 추가"}
      </button>
    </div>
  );
}
