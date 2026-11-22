import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import styles from './CommunityPanel.module.css';

export default function CommunityPanel() {
  const onlineUsers = useSelector((state) => state.soketSlice.onlineUsers);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['getFriendsPage'],
    queryFn: async () =>
      (
        await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/v1/friends/friendsPage`, {
          withCredentials: true,
        })
      ).data,
    refetchOnWindowFocus: false,
  });
  const friends = data?.data.friendLists || [];
  const onlineIds = new Set(onlineUsers.map((user) => user.id));
  const activeFriends = friends.filter((friend) => onlineIds.has(friend._id));
  const requests = data?.data.recivedRequests || [];
  return (
    <aside className={styles.panel} aria-label="Kết nối bạn bè">
      <section>
        <div className={styles.heading}>
          <h2>Lời mời kết bạn</h2>
          <Link to="/friends/requests">Xem tất cả</Link>
        </div>
        {requests.slice(0, 3).map(({ _id, sender }) => (
          <Link key={_id} to={`/profile/${sender.username}`} className={styles.person}>
            <img src={sender.photo} alt="" />
            <span>
              {sender.first_name} {sender.last_name}
              <small>Muốn kết bạn với bạn</small>
            </span>
          </Link>
        ))}
        {!requests.length && (
          <p className={styles.empty}>
            {isLoading
              ? 'Đang tải...'
              : isError
                ? 'Chưa tải được lời mời.'
                : 'Bạn chưa có lời mời mới.'}
          </p>
        )}
      </section>
      <section>
        <div className={styles.heading}>
          <h2>Bạn bè đang hoạt động</h2>
          <span>{activeFriends.length}</span>
        </div>
        {activeFriends.map((friend) => (
          <Link key={friend._id} to={`/profile/${friend.username}`} className={styles.person}>
            <div className={styles.avatar}>
              <img src={friend.photo} alt="" />
              <i />
            </div>
            <span>
              {friend.first_name} {friend.last_name}
            </span>
          </Link>
        ))}
        {!activeFriends.length && <p className={styles.empty}>Chưa có bạn bè đang hoạt động.</p>}
        <Link to="/friends/all" className={styles.all_friends}>
          Xem danh sách bạn bè
        </Link>
      </section>
    </aside>
  );
}
