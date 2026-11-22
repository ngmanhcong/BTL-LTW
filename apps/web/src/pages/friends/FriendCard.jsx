import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useRelationship } from 'features/connections/hooks/useRelationship';
import classes from './style.module.css';
import { useGetChat } from 'features/messaging/hooks/useGetChat';
import { useNavigate } from 'react-router-dom';

export default function FriendCard({ user, type, requestId, refetch }) {
  const { mutate, data } = useRelationship(user.username);
  const navigate = useNavigate();
  const { mutate: openChat, isLoading: openingChat } = useGetChat();

  const acceptRequest = async (requestId) => {
    mutate({ id: requestId, type: 'acceptRequest' });
  };

  const cancelRequestHandler = async (userId) => {
    mutate({ id: requestId, type: 'Hủy' });
  };

  useEffect(() => {
    if (data?.status === 'success') {
      refetch();
    }
  }, [data]);

  return (
    <div className={classes.req_card}>
      <Link to={`/profile/${user.username}`} className={classes.photo}>
        <img src={user.photo} alt="" />
        <div className={classes.req_name}>
          {user.first_name} {user.last_name}
        </div>
      </Link>
      {type === 'sent' ? (
        <div className={classes.btns}>
          <button className="btn_blue" onClick={() => cancelRequestHandler(requestId)}>
            Hủy lời mời
          </button>
        </div>
      ) : type === 'request' ? (
        <div className={classes.btns}>
          <button className="btn_blue" onClick={() => acceptRequest(requestId)}>
            Chấp nhận
          </button>
          <button className="gray_btn" onClick={() => cancelRequestHandler(requestId)}>
            Xóa
          </button>
        </div>
      ) : (
        <div className={classes.btns}>
          <button
            className="gray_btn"
            disabled={openingChat}
            onClick={() =>
              openChat(
                { user: user._id },
                { onSuccess: (result) => navigate(`/messages/${result.data.chat._id}`) }
              )
            }
          >
            Nhắn tin
          </button>
        </div>
      )}
    </div>
  );
}
