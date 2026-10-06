"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VILLAGERS } from "@/lib/villager";
import { IntimacyRecord, getIntimacyDescription, loadIntimacy } from "@/lib/intimacy";

export default function VillagersPage() {
  const [record, setRecord] = useState<IntimacyRecord>({});

  useEffect(() => {
    // localStorage는 서버에 없으므로 클라이언트 마운트 후 한 번만 읽어온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecord(loadIntimacy());
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
        <ul className="intimacyList">
          {villagers.map((v) => {
            const exchanges = record[v.id] ?? 0;
            const met = exchanges > 0;
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
                  {met ? getIntimacyDescription(exchanges) : "아직 만난 적 없어요"}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
