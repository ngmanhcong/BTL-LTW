import { useState } from 'react';
import Card from 'shared/components/ui/Card/Card';
import styles from './style.module.css';
import axios from 'axios';
import FormLoader from 'shared/components/FormLoader/index';

function SendEmail({ setVisible, userInfos }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitHandler = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/forgotPassword`,
        {
          email: userInfos.email,
        },
        {
          withCredentials: true,
        }
      );
      setError('');
      setLoading(false);
      setVisible(2);
    } catch (error) {
      setError(error.response?.data?.message);
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <Card className={styles.wrap}>
      <div className={styles.header}>Đặt lại mật khẩu</div>
      {error ? (
        <div className={styles.error}>
          <div className={styles.error_header}>Lỗi</div>
          <span>{error}</span>
        </div>
      ) : (
        ''
      )}

      <FormLoader loading={loading}>
        <div className={styles.s_content}>
          <div className={styles.s_left}>
            <span className={styles.s_left_text}>
              Bạn muốn nhận mã đặt lại mật khẩu bằng cách nào?
            </span>
            <label htmlFor="email" className="hover1">
              <input type="radio" name="" id="email" checked readOnly />
              <div className={styles.label_col}>
                <span>Gửi mã qua email</span>
                <span>{userInfos.email}</span>
              </div>
            </label>
          </div>
          <div className={styles.s_right}>
            <img src={userInfos.photo} alt="" />
            <span>{userInfos.email}</span>
            <span>{userInfos.first_name}</span>
          </div>
        </div>
      </FormLoader>
      <div className={styles.btns}>
        <button className="gray_btn" onClick={() => setVisible(0)}>
          Không phải bạn?
        </button>
        <button className="btn_blue" onClick={submitHandler}>
          Tiếp tục
        </button>
      </div>
    </Card>
  );
}

export default SendEmail;
