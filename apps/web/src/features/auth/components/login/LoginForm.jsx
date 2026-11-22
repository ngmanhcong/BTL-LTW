import React from 'react';
import * as Yup from 'yup';
import { useState } from 'react';
import styles from './LoginForm.module.css';
import { Formik, Form } from 'formik';
import { Link } from 'react-router-dom';
import LoginInput from 'shared/components/inputs/login/index';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { login } from 'app/slices/userSlice';
import Card from 'shared/components/ui/Card/Card';
import FormLoader from 'shared/components/FormLoader/index';
import Brand from 'shared/components/brand/Brand';

const initialloginInfos = {
  email: '',
  password: '',
};

function LoginForm({ setRenderSignUp }) {
  const dispatch = useDispatch();

  const { email, password } = initialloginInfos;
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loginValidation = Yup.object({
    email: Yup.string()
      .required('Vui lòng nhập địa chỉ email.')
      .email('Địa chỉ email không hợp lệ.')
      .max(100),
    password: Yup.string().required('Vui lòng nhập mật khẩu').min(6),
  });

  const submitHandler = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/login`,
        {
          email: values.email,
          password: values.password,
        },
        {
          withCredentials: true,
        }
      );
      setError('');
      setSuccess(data.status);
      dispatch(login(data));
      setLoading(false);
    } catch (error) {
      setSuccess('');
      setError(error.response?.data?.message);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Brand />
        <h1>
          Kết nối cộng đồng
          <br />
          sinh viên PTIT
        </h1>
        <img
          className={styles.campus}
          src="/images/ptit-campus.png"
          alt="Minh họa sinh viên trò chuyện trong khuôn viên học viện"
        />
      </div>
      <div className={styles.login}>
        <Card className={styles.login_wrapper}>
          <div className={styles.form_heading}>
            <h2>Đăng nhập</h2>
            <p>Chia sẻ câu chuyện, kết nối bạn bè.</p>
          </div>
          <Formik
            enableReinitialize
            validationSchema={loginValidation}
            initialValues={{
              email,
              password,
            }}
            onSubmit={(values) => submitHandler(values)}
          >
            {(formik) => (
              <Form className={styles.form} noValidate>
                <FormLoader loading={loading}>
                  <LoginInput
                    type="email"
                    name="email"
                    placeholder="Địa chỉ email"
                    disabled={loading}
                  />
                  <LoginInput
                    type="password"
                    name="password"
                    placeholder="Mật khẩu"
                    disabled={loading}
                  />
                </FormLoader>

                {error && <div className={styles.error_text}>{error}</div>}
                {success && <div className={styles.success_text}>{success}</div>}
                <button type="submit" className="btn_blue" disabled={loading}>
                  Đăng nhập
                </button>
                {process.env.REACT_APP_DEMO_EMAIL && process.env.REACT_APP_DEMO_PASSWORD && (
                  <button
                    style={{ width: '100%', marginTop: '10px' }}
                    className="gray_btn"
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      submitHandler({
                        email: process.env.REACT_APP_DEMO_EMAIL,
                        password: process.env.REACT_APP_DEMO_PASSWORD,
                      });
                    }}
                  >
                    Dùng thử với tài khoản mẫu
                  </button>
                )}
              </Form>
            )}
          </Formik>
          <Link to="/forgot" className={styles.forgot}>
            Quên mật khẩu?
          </Link>
          <div className="line-spliter"></div>
          <button className={`btn_blue ${styles.signup_btn}`} onClick={() => setRenderSignUp(true)}>
            Tạo tài khoản
          </button>
        </Card>
      </div>
    </main>
  );
}

export default LoginForm;
