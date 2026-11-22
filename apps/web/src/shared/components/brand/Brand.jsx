import styles from './Brand.module.css';

export default function Brand({ compact = false }) {
  return (
    <span
      className={[styles.brand, compact ? styles.compact : ''].join(' ')}
      aria-label="PTITSocial"
    >
      <svg viewBox="0 0 48 40" width="44" height="38" className={styles.mark} aria-hidden="true">
        <path
          d="M31 12C30 5 24 2 17 2 8 2 2 7 2 14c0 4 2 7 5 9l-2 7 9-3h3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M45 24c0-7-6-12-15-12s-15 5-15 12 6 12 15 12h4l8 3-2-7c3-2 5-5 5-8Z"
          fill="var(--bg-primary)"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {[24, 30, 36].map((x) => (
          <circle key={x} cx={x} cy="24" r="1.5" fill="currentColor" />
        ))}
      </svg>
      <span className={styles.name}>
        <strong>PTIT</strong>
        <span>Social</span>
      </span>
    </span>
  );
}
