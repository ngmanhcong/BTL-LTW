import React from 'react';
import Card from 'shared/components/ui/Card/Card';
import styles from './SendVerification.module.css';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Lottie from 'react-lottie-player';
import successAnimation from 'shared/components/ui/Lottie/success.json';
import BarLoader from 'react-spinners/BarLoader';

function SendVerification() {
  const enabled = false;
  const { fetchStatus, status, error, data, refetch } = useQuery({
    queryKey: ['resendEmail'],
    queryFn: async () => {
      const { data } = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/resendEmailVerifivation`,
        {},
        {
          withCredentials: true,
        }
      );
      return data;
    },
    enabled,
    retry: false,
  });

  const resendEmail = () => {
    refetch();
  };

  if (data?.status === 'success')
    return (
      <Card className={styles.done}>
        <p className="text_success">Đã gửi lại email xác minh</p>

        <Lottie
          style={{
            width: 20,
            height: 20,
            transform: 'translateY(2px)',
          }}
          animationData={successAnimation}
          play
          loop={false}
        />
      </Card>
    );

  if (fetchStatus === 'fetching' && status === 'loading')
    return (
      <Card className={styles.done}>
        <BarLoader
          color="#1876f2"
          size={20}
          width="100%"
          loading={fetchStatus === 'fetching' && status === 'loading'}
        />
      </Card>
    );

  return (
    <Card className={styles.ActiveAccount}>
      <span>Vui lòng xác minh email trước khi sử dụng PTITSocial.</span>
      <div className={styles.link} onClick={resendEmail}>
        Gửi lại email xác minh
      </div>
      {error ? <p className="text_error">{error.response?.data?.message}</p> : ''}
    </Card>
  );
}

export default SendVerification;
