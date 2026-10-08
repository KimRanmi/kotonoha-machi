import type { NextConfig } from "next";

// /api/* 는 Spring Boot 백엔드(backend/)가 처리한다. 브라우저에서는 같은 origin처럼 보이므로 CORS 설정이 필요 없다.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  // Docker 이미지용 최소 실행 번들(.next/standalone)을 만든다. 로컬 dev/build에는 영향 없다.
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
