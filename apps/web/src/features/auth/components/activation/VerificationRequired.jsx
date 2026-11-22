import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ActivateAccount from './ActivateAccount';
import SendVerification from 'features/auth/components/verification/SendVerification';
import { logout } from 'app/slices/userSlice';
import { queryClient } from 'App';

export default function VerificationRequired() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [error, setError] = useState('');
  const token = location.pathname.startsWith('/activate/') ? location.pathname.split('/')[2] : null;
  async function handleLogout() {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/logout`,
        {},
        { withCredentials: true }
      );
      queryClient.clear();
      delete axios.defaults.headers.common.Authorization;
      dispatch(logout());
    } catch {
      setError('Không thể đăng xuất. Vui lòng thử lại.');
    }
  }
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-secondary)',
        padding: 20,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 24,
          borderRadius: 12,
          background: 'var(--bg-primary)',
          color: 'var(--color-primary)',
        }}
      >
        <h1>Xác minh email</h1>
        <p style={{ margin: '16px 0' }}>Mở liên kết xác minh trong email để truy cập PTITSocial.</p>
        <SendVerification />
        <button className="gray_btn" style={{ marginTop: 20 }} onClick={handleLogout}>
          Đăng xuất
        </button>
        {error && <p className="text_error">{error}</p>}
      </section>
      {token && <ActivateAccount token={token} />}
    </main>
  );
}
