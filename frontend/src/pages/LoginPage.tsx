import { useSearchParams } from 'react-router-dom';
import { oauth2AuthorizationUrl } from '../api/client';
import Logo from '../components/Logo';
import SocialIcon from '../components/SocialIcon';
import styles from './AuthPage.module.css';

function LoginPage() {
  const [searchParams] = useSearchParams();
  const hasSocialLoginError = searchParams.get('error') === 'social';

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logo />
          <p className={styles.tagline}>일본어를 배우며 만드는 나의 작은 마을</p>
        </div>
        <h1>로그인</h1>
        {hasSocialLoginError && (
          <p className={styles.error} role="alert">
            로그인에 실패했습니다. 이메일 제공에 동의했는지, 탈퇴한 계정이 아닌지 확인한 뒤 다시
            시도해 주세요.
          </p>
        )}
        <div className={styles.socialButtons}>
          <a
            className={styles.socialButton}
            data-provider="google"
            href={oauth2AuthorizationUrl('google')}
          >
            <SocialIcon provider="google" />
            Google로 계속하기
          </a>
          <a
            className={styles.socialButton}
            data-provider="kakao"
            href={oauth2AuthorizationUrl('kakao')}
          >
            <SocialIcon provider="kakao" />
            카카오로 계속하기
          </a>
          <a
            className={styles.socialButton}
            data-provider="naver"
            href={oauth2AuthorizationUrl('naver')}
          >
            <SocialIcon provider="naver" />
            네이버로 계속하기
          </a>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
