type Provider = 'google' | 'kakao' | 'naver';

/** 소셜 로그인 버튼 안에 넣는 18px 로고(인라인 SVG). */
function SocialIcon({ provider }: { provider: Provider }) {
  if (provider === 'google') {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
        />
        <path
          fill="#FBBC05"
          d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
        />
      </svg>
    );
  }
  if (provider === 'kakao') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#191919"
          d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.5.1 1 .1 1.4.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M16.3 12.6 7.4 3H3v18h4.7v-9.6L16.6 21H21V3h-4.7z" />
    </svg>
  );
}

export default SocialIcon;
