"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VILLAGERS } from "@/lib/villager";
import { VillagerIntimacy, fetchIntimacy } from "@/lib/storage";

export default function VillagersPage() {
  const [record, setRecord] = useState<Record<string, VillagerIntimacy>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 친밀도는 서버(DB)에 있으므로 마운트 후 한 번 불러온다.
    fetchIntimacy()
      .then((list) => setRecord(Object.fromEntries(list.map((i) => [i.villagerId, i]))))
      .catch((err) => setError(err instanceof Error ? err.message : "친밀도를 불러오지 못했습니다."));
  }, []);

  const villagers = Object.values(VILLAGERS);

  return (
    <div className="page">
      <header className="header">
        <div className="villagerInfo">
          <div>
            <div className="villagerName">주민 목록</div>
            <div className="villagerDesc">지금까지 만난 주민들과의 사이</div>
          </div>
        </div>
        <div className="headerActions">
          <Link href="/words" className="navLink">
            학습 단어 목록
          </Link>
          <Link href="/" className="navLink">
            ← 마을로 돌아가기
          </Link>
        </div>
      </header>

      <main className="wordListMain">
        {error && <p className="errorText">{error}</p>}
        <ul className="intimacyList">
          {villagers.map((v) => {
            const met = record[v.id]?.met ?? false;
            return (
              <li
                key={v.id}
                className={met ? "intimacyItem" : "intimacyItem intimacyItemLocked"}
              >
                <div className="intimacyTop">
                  <div className="villagerAvatar">{v.avatar}</div>
                  <div>
                    <div className="villagerName">{v.name}</div>
                    <div className="villagerDesc">{v.description}</div>
                  </div>
                </div>
                <div className="intimacyNote">
                  {met ? record[v.id]?.description : "아직 만난 적 없어요"}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
