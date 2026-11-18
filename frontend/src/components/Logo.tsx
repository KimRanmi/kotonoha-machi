import styles from './Logo.module.css';

/** 말풍선 안에 「こ」가 든 로고 + 「ことばのまち」 글자. 한 줄로 유지된다. */
function Logo() {
  return (
    <span className={styles.logo}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="2" y="3" width="28" height="21" rx="10.5" fill="var(--color-primary)" />
        <path d="M9 23v6l7-6z" fill="var(--color-primary)" />
        <text
          x="16"
          y="19"
          fontSize="14"
          fontWeight="700"
          textAnchor="middle"
          fill="#fff"
          fontFamily="var(--font-display)"
        >
          こ
        </text>
      </svg>
      <span className={styles.text}>ことばのまち</span>
    </span>
  );
}

export default Logo;
