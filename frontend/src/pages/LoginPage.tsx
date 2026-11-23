import { oauth2AuthorizationUrl } from '../api/client';
import Logo from '../components/Logo';
import SocialIcon from '../components/SocialIcon';
import styles from './AuthPage.module.css';

function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logo />
          <p className={styles.tagline}>일본어를 배우며 만드는 나의 작은 마을</p>
        </div>
        <h1>로그인</h1>
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
