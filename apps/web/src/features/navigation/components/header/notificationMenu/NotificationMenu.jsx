import { notificationIcon, localizeSystemText } from 'app/locale';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React from 'react';
import Skeleton from 'react-loading-skeleton';
import Moment from 'react-moment';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateNStats } from 'app/slices/userSlice';
import { useSeenNotification } from 'features/notifications/hooks/useSeenNotification';
import styles from './NotificationMenu.module.css';

function NotificationMenu({ setShowNotificationMenu }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    isLoading: isNotificationLoading,
    data: NotiFicationData,
    isSuccess: isNotificationSuccess,
  } = useQuery({
    queryKey: ['getNotifications'],
    queryFn: async () => {
      const { data } = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/notifications`,
        {
          withCredentials: true,
        }
      );
      return data;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    onSuccess: (data) => {
      dispatch(
        updateNStats({
          unseenNotification: 0,
        })
      );
    },
  });

  const { mutate: SeenNotification } = useSeenNotification();

  return (
    <div className={`${styles.menu} shadow`}>
      <h2>Thông báo</h2>
      <div>
        {!isNotificationLoading &&
          isNotificationSuccess &&
          NotiFicationData &&
          (NotiFicationData?.data.notifications.length > 0
            ? NotiFicationData?.data.notifications.map((notification) => (
                <div className={`${styles.notification} hover2`} key={notification._id}>
                  <div
                    className={styles.content}
                    onClick={() => {
                      SeenNotification({ nid: notification._id });
                      setShowNotificationMenu(false);
                      navigate(notification.click);
                    }}
                  >
                    <div className={styles.img}>
                      <img src={notification?.sender?.photo} alt="" />
                      <img
                        className={styles.type}
                        src={`../../../reacts/${notificationIcon(notification)}.svg`}
                        alt=""
                      />
                    </div>
                    <div className={styles.content_2}>
                      <span>{localizeSystemText(notification.content)}</span>
                      <span className={styles.time}>
                        <Moment fromNow interval={30}>
                          {notification.createdAt}
                        </Moment>
                      </span>
                    </div>
                    <div>
                      {notification.seen === 'unseen' && (
                        <p
                          style={{
                            background: `#0096ff`,
                            width: '12px',
                            height: '12px',
                            borderRadius: '100%',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            : 'Chưa có thông báo')}
        {isNotificationLoading && (
          <>
            <Skeleton className={styles.notification} height={76} style={{ marginTop: '8px' }} />
            <Skeleton className={styles.notification} height={76} style={{ marginTop: '8px' }} />
            <Skeleton className={styles.notification} height={76} style={{ marginTop: '8px' }} />
          </>
        )}
      </div>
    </div>
  );
}

export default NotificationMenu;
