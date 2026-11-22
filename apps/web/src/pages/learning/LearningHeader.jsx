import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMap } from 'react-icons/fi';
import styles from './roadmaps.module.css';

export default function LearningHeader() {
  return (
    <div className={styles.header}>
      <Link to="/" className={styles.back}>
        <FiArrowLeft />
        Bảng tin
      </Link>
      <span>
        <FiMap />
        GÓC HỌC TẬP
      </span>
      <span className={styles.headerNote}>Từng bước đến mục tiêu</span>
    </div>
  );
}
