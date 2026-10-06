import { redirect } from "next/navigation";

// 마을이 메인 진입점(`/`)으로 옮겨졌다. 예전 북마크/링크용 리다이렉트.
export default function TownRedirect() {
  redirect("/");
}
