import React from 'react';
import classes from './ErrorPage.module.css';
import e404Animation from 'shared/components/ui/Lottie/404.json';
import Lottie from 'react-lottie-player';
import { useNavigate } from 'react-router-dom';

function ErrorPage({ error }) {
  const navigate = useNavigate();

  return (
    <div className={classes.main}>
      <Lottie
        style={{
          transform: 'translateY(2px)',
          width: 300,
          height: 300,
        }}
        animationData={e404Animation}
        loop
        play
      />
      <p>Đã có lỗi xảy ra</p>
      <div
        className="btn_blue"
        style={{ maxWidth: '300px' }}
        onClick={() => {
          navigate('/');
        }}
      >
        Về trang chủ
      </div>
    </div>
  );
}

export default ErrorPage;
