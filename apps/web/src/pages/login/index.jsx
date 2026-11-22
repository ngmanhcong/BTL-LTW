import { useState } from 'react';
import LoginForm from 'features/auth/components/login/LoginForm';
import styles from './style.module.css';
import SignupForm from 'features/auth/components/login/SignupForm';

function Login() {
  const [renderSignUp, setRenderSignUp] = useState(false);
  return (
    <div className="login">
      <div className={styles.wrapper}>
        <LoginForm setRenderSignUp={setRenderSignUp} />
        {renderSignUp && (
          <SignupForm renderSignUp={renderSignUp} setRenderSignUp={setRenderSignUp} />
        )}
      </div>
    </div>
  );
}

export default Login;
