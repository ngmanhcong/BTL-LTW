import { NavLink } from 'react-router-dom';
import { FiMap, FiZap } from 'react-icons/fi';
import styles from './roadmaps.module.css';
export default function LearningTabs() {
  return (
    <nav className={styles.tabs} aria-label="Chế độ học tập">
      <NavLink end to="/learning" className={({ isActive }) => (isActive ? styles.activeTab : '')}>
        <FiMap />
        Roadmap
      </NavLink>
      <NavLink to="/learning/ai" className={({ isActive }) => (isActive ? styles.activeTab : '')}>
        <FiZap />
        Learn with AI
      </NavLink>
    </nav>
  );
}
