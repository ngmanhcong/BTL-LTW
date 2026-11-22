import RoadmapIcon from 'shared/icons/RoadmapIcon';
import { Link, NavLink } from 'react-router-dom';
import { Home, Friends, Messenger } from 'shared/icons/index';
import styles from './HomeLeft.module.css';

const LearningIcon = () => <RoadmapIcon size={25} style={{ fill: 'none' }} />;
const navigation = [
  { to: '/learning', text: 'Lộ trình học tập', Icon: LearningIcon },
  { to: '/', text: 'Bảng tin', Icon: Home },
  { to: '/friends', text: 'Bạn bè', Icon: Friends },
  { to: '/messages', text: 'Tin nhắn', Icon: Messenger },
];

export default function HomeLeft({ user }) {
  return (
    <nav className={styles.left_home + ' scrollbar'} aria-label="Điều hướng chính">
      <Link to="/profile" className={styles.left_link + ' hover2'} title="Trang cá nhân của tôi">
        <img src={user?.photo} alt="" />
        <span>
          {user?.first_name} {user?.last_name}
        </span>
      </Link>
      {navigation.map(({ to, text, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          title={text}
          className={({ isActive }) =>
            [styles.left_link, 'hover2', isActive ? styles.active_link : ''].join(' ')
          }
        >
          <div className={styles.navigation_icon}>
            <Icon />
          </div>
          <span>{text}</span>
        </NavLink>
      ))}
    </nav>
  );
}
