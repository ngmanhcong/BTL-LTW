import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import FriendCard from './FriendCard';
import classes from './style.module.css';

const tabs = [
  { type: 'all', text: 'Tất cả bạn bè' },
  { type: 'requests', text: 'Lời mời kết bạn' },
  { type: 'sent', text: 'Đã gửi' },
];
export default function FriendsPage() {
  const { type = 'all' } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['getFriendsPage'],
    queryFn: async () =>
      (
        await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/v1/friends/friendsPage`, {
          withCredentials: true,
        })
      ).data,
    refetchOnWindowFocus: false,
  });
  const values = data?.data;
  const items =
    type === 'requests'
      ? values?.recivedRequests
      : type === 'sent'
        ? values?.sentRequests
        : values?.friendLists;
  const emptyText =
    type === 'requests'
      ? 'Bạn chưa có lời mời kết bạn mới.'
      : type === 'sent'
        ? 'Bạn chưa gửi lời mời kết bạn nào.'
        : 'Bạn chưa có bạn bè. Hãy tìm kiếm và kết nối với mọi người nhé.';
  return (
    <main className={classes.main}>
      <div className={classes.header}>
        <div>
          <h1>Bạn bè</h1>
          <p>Kết nối và giữ liên lạc với những người bạn quan tâm.</p>
        </div>
        <Link to="/" className="gray_btn">
          Về bảng tin
        </Link>
      </div>
      <nav className={classes.tabs} aria-label="Danh sách bạn bè">
        {tabs.map((tab) => (
          <Link
            key={tab.type}
            to={`/friends/${tab.type}`}
            className={type === tab.type ? classes.active_friends : ''}
          >
            {tab.text}
            {tab.type === 'requests' && values?.recivedRequestsCount > 0 && (
              <span>{values.recivedRequestsCount}</span>
            )}
          </Link>
        ))}
      </nav>
      {isLoading ? (
        <p className={classes.empty}>Đang tải danh sách...</p>
      ) : isError ? (
        <p className={classes.empty}>
          Chưa tải được danh sách.{' '}
          <button className="gray_btn" onClick={() => refetch()}>
            Thử lại
          </button>
        </p>
      ) : items?.length ? (
        <div className={classes.flex_wrap}>
          {items.map((item) => (
            <FriendCard
              key={item._id}
              user={type === 'requests' ? item.sender : type === 'sent' ? item.recipient : item}
              type={type === 'requests' ? 'request' : type === 'sent' ? 'sent' : 'friends'}
              requestId={item._id}
              refetch={refetch}
            />
          ))}
        </div>
      ) : (
        <p className={classes.empty}>{emptyText}</p>
      )}
    </main>
  );
}
