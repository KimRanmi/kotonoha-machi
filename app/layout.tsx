import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

// 둥근 일본어 폰트. 폰트 패밀리는 globals.css의 --font-main 토큰으로 전역 적용한다.
const zenMaru = Zen_Maru_Gothic({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zen-maru",
});

export const metadata: Metadata = {
  title: "ことばのまち",
  description: "주민과 자유롭게 일본어로 대화하는 프로토타입",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={zenMaru.variable}>
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
