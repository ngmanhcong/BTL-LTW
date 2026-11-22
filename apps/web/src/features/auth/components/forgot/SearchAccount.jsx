import { useState } from 'react';
import Card from 'shared/components/ui/Card/Card';
import styles from './style.module.css';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import LoginInput from 'shared/components/inputs/login/index';
import FormLoader from 'shared/components/FormLoader/index';
import { Link } from 'react-router-dom';
import axios from 'axios';

const initialforgotInfos = {
  email: '',
};

function SearchAccount({ setVisible, setUserInfos }) {
  const [forgotInfo, setForgotInfo] = useState(initialforgotInfos);
  const { email } = forgotInfo;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotChange = (e) => {
    const { name, value } = e.target;
    setForgotInfo({ ...forgotInfo, [name]: value });
  };

  const forgotValidation = Yup.object({
    email: Yup.string()
      .required('Vui lòng nhập địa chỉ email.')
      .email('Địa chỉ email không hợp lệ.')
      .max(100),
  });

  const submitHandler = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/forgotPassword`,
        {
          params: { email: values.email },
        },
        {
          withCredentials: true,
        }
      );
      setUserInfos(data.data);
      setVisible(1);
      setError('');
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.message);
      setTimeout(() => {
        setForgotInfo(initialforgotInfos);
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <Card className={styles.wrap}>
      <div className={styles.header}>Tìm tài khoản</div>
      {error ? (
        <div className={styles.error}>
          <div className={styles.error_header}>Không tìm thấy kết quả</div>
          <span>Không tìm thấy tài khoản. Vui lòng thử lại với thông tin khác.</span>
        </div>
      ) : (
        ''
      )}

      <div className={styles.content}>
        <span className={styles.text}>Nhập địa chỉ email để tìm tài khoản của bạn.</span>
        <Formik
          enableReinitialize
          initialValues={{ email }}
          validationSchema={forgotValidation}
          onSubmit={(values) => {
            submitHandler(values);
          }}
        >
          {(formik) => (
            <Form noValidate>
              <FormLoader loading={loading} className={styles.form}>
                <LoginInput
                  className={styles.input}
                  type="email"
                  name="email"
                  placeholder="Địa chỉ email"
                  onChange={handleForgotChange}
                  disabled={loading}
                />
              </FormLoader>

              <div className={styles.btns}>
                <Link className="gray_btn" to="/login">
                  Hủy
                </Link>
                <button type="submit" className="btn_blue">
                  Tìm kiếm
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Card>
  );
}

export default SearchAccount;
