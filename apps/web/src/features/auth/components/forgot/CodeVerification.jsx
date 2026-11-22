import { useState } from 'react';
import Card from 'shared/components/ui/Card/Card';
import styles from './style.module.css';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import LoginInput from 'shared/components/inputs/login/index';
import FormLoader from 'shared/components/FormLoader/index';
import { Link } from 'react-router-dom';
import axios from 'axios';

function CodeVerification({ setVisible, setUserInfos, userInfos }) {
  const { email, code } = userInfos;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeChange = (e) => {
    const { name, value } = e.target;
    setUserInfos({ ...userInfos, [name]: value });
  };

  const forgotValidation = Yup.object({
    code: Yup.string().required('Vui lòng nhập mã xác nhận.').max(6).min(6),
  });

  const submitHandler = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/resetPassword`,
        {
          email,
          code: values.code,
        },
        {
          withCredentials: true,
        }
      );
      setUserInfos({ ...userInfos, token: data.data.token });
      setVisible(3);
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
      <div className={styles.header}>Nhập mã xác nhận</div>
      {error ? (
        <div className={styles.error}>
          <div className={styles.error_header}>Đã có lỗi xảy ra!</div>
          <span>{error}</span>
        </div>
      ) : (
        ''
      )}

      <div className={styles.content}>
        <span className={styles.text}>
          Vui lòng kiểm tra email để nhận mã xác nhận gồm 8 chữ số.
        </span>
        <Formik
          enableReinitialize
          initialValues={{ code }}
          validationSchema={forgotValidation}
          onSubmit={(values) => {
            submitHandler(values);
          }}
        >
          {(formik) => (
            <Form noValidate>
              <FormLoader loading={loading} className={styles.code_form}>
                <LoginInput
                  className={styles.input}
                  type="number"
                  name="code"
                  placeholder="Nhập mã xác nhận"
                  onChange={handleCodeChange}
                  disabled={loading}
                />
                <div className={styles.label_col}>
                  <span>Mã xác nhận đã được gửi đến:</span>
                  <span>{userInfos.email}</span>
                </div>
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

export default CodeVerification;
