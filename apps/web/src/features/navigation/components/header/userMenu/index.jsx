import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { logout, changeTheme } from 'app/slices/userSlice';
import { queryClient } from 'App';
import styles from './UserMenu.module.css';

export default function UserMenu({ user, setShowUserMenu }) {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.user.theme);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function handleLogout() {
    setBusy(true);
    try {
      await axios.post(
        process.env.REACT_APP_BACKEND_URL + '/api/v1/users/logout',
        {},
        { withCredentials: true }
      );
      queryClient.clear();
      delete axios.defaults.headers.common.Authorization;
      dispatch(logout());
      setShowUserMenu(false);
    } catch {
      setError('Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.menu + ' shadow'}>
      <Link
        to="/profile"
        className={styles.mmenu_header + ' hover3'}
        onClick={() => setShowUserMenu(false)}
      >
        <img src={user?.photo} alt="" />
        <div className={styles.mmenu_col}>
          <span>
            {user?.first_name} {user?.last_name}
          </span>
          <span>Xem trang cá nhân</span>
        </div>
      </Link>
      <div className={styles.mmenu_splitter} />
      <button
        type="button"
        className={styles.mmenu_item + ' hover3'}
        onClick={() => dispatch(changeTheme(theme === 'dark' ? 'light' : 'dark'))}
      >
        <div className={styles.small_circle}>
          <i className="dark_filled_icon" />
        </div>
        <span>{theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}</span>
      </button>
      <button
        type="button"
        className={styles.mmenu_item + ' hover3'}
        disabled={busy}
        onClick={handleLogout}
      >
        <div className={styles.small_circle}>
          <i className="logout_filled_icon" />
        </div>
        <span>{busy ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
      </button>
      {error && <p className="text_error">{error}</p>}
    </div>
  );
}
