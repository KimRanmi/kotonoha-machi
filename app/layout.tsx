import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "ことばのまち",
  description: "주민과 자유롭게 일본어로 대화하는 프로토타입",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
