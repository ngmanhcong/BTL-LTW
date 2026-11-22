import React, { useState } from 'react';
import ChangePassword from 'features/auth/components/forgot/ChangePassword';
import CodeVerification from 'features/auth/components/forgot/CodeVerification';
import SearchAccount from 'features/auth/components/forgot/SearchAccount';
import SendEmail from 'features/auth/components/forgot/SendEmail';
import NoAuthHeader from 'features/navigation/components/guest-header/index';
import styles from './style.module.css';

function Forgot() {
  const [visible, setVisible] = useState(0);
  const [userInfos, setUserInfos] = useState('');

  return (
    <div className="forgot">
      <NoAuthHeader />
      <div className={styles.wrapper}>
        {visible === 0 && <SearchAccount setVisible={setVisible} setUserInfos={setUserInfos} />}
        {visible === 1 && <SendEmail setVisible={setVisible} userInfos={userInfos} />}
        {visible === 2 && (
          <CodeVerification
            setVisible={setVisible}
            setUserInfos={setUserInfos}
            userInfos={userInfos}
          />
        )}
        {visible === 3 && (
          <ChangePassword
            setVisible={setVisible}
            setUserInfos={setUserInfos}
            userInfos={userInfos}
          />
        )}
      </div>
    </div>
  );
}

export default Forgot;
