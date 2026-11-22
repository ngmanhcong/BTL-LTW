import React from 'react';
import styles from './style.module.css';
import { Link } from 'react-router-dom';
import Brand from 'shared/components/brand/Brand';

function NoAuthHeader() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <Brand compact />
      </Link>
      <Link to="/login" className={styles.login}>
        <button className="btn_blue">Đăng nhập</button>
      </Link>
    </header>
  );
}

export default NoAuthHeader;
