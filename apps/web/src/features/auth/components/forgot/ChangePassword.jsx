import { useState } from 'react';
import Card from 'shared/components/ui/Card/Card';
import styles from './style.module.css';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import LoginInput from 'shared/components/inputs/login/index';
import FormLoader from 'shared/components/FormLoader/index';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { login } from 'app/slices/userSlice';

function ChangePassword({ setUserInfos, userInfos }) {
  const { email, token, password, passwordConfirm } = userInfos;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setUserInfos({ ...userInfos, [name]: value });
  };

  const changePasswordValid = Yup.object({
    password: Yup.string()
      .required('Vui lòng nhập mật khẩu')
      .min(6)
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#_$%^&*])(?=.{6,})/,
        'Mật khẩu phải có ít nhất một chữ thường, một chữ hoa, một chữ số và một ký tự đặc biệt'
      ),
    passwordConfirm: Yup.string().test(
      'passwords-match',
      'Mật khẩu nhập lại không khớp!',
      function (value) {
        return this.parent.password === value;
      }
    ),
  });

  const submitHandler = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.patch(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/resetPassword`,
        {
          email,
          token,
          password: values.password,
          passwordConfirm: values.passwordConfirm,
        },
        {
          withCredentials: true,
        }
      );
      dispatch(login(data));
      setError('');
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.message);
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <Card className={styles.wrap}>
      <div className={styles.header}>Đổi mật khẩu</div>
      {error ? (
        <div className={styles.error}>
          <div className={styles.error_header}>Đã có lỗi xảy ra</div>
          <span>{error}</span>
        </div>
      ) : (
        ''
      )}

      <div className={styles.content}>
        <span className={styles.text}>Vui lòng tạo mật khẩu mới cho tài khoản</span>
        <Formik
          enableReinitialize
          initialValues={{ password, passwordConfirm }}
          validationSchema={changePasswordValid}
          onSubmit={(values) => {
            submitHandler(values);
          }}
        >
          {(formik) => (
            <Form noValidate>
              <FormLoader loading={loading} className={styles.form}>
                <LoginInput
                  className={styles.input}
                  type="text"
                  name="password"
                  placeholder="Mật khẩu mới"
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
                <LoginInput
                  className={styles.input}
                  type="text"
                  name="passwordConfirm"
                  placeholder="Nhập lại mật khẩu mới"
                  onChange={handlePasswordChange}
                  disabled={loading}
                />
              </FormLoader>

              <div className={styles.btns}>
                <Link className="gray_btn" to="/login">
                  Hủy
                </Link>
                <button type="submit" className="btn_blue">
                  Tiếp tục
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Card>
  );
}

export default ChangePassword;
