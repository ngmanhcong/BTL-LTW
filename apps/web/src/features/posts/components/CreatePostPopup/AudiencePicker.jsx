import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiSearch } from 'react-icons/fi';
import PostAudienceIcon from 'shared/icons/PostAudienceIcon';
import classes from './CreatePostPopup.module.css';

export default function AudiencePicker({ audience, setAudience, viewers, setViewers, onDone }) {
  const [friends, setFriends] = useState([]);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/v1/friends/friendsPage`, {
        withCredentials: true,
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const accepted = data.data.friendLists.filter(Boolean);
        setFriends(accepted);
        setViewers((old) =>
          old.filter((viewer) => accepted.some((friend) => friend._id === viewer._id))
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Không tải được danh sách bạn bè.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, setViewers]);

  const normalize = (text) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase();
  const visibleFriends = friends.filter((friend) =>
    normalize(`${friend.first_name} ${friend.last_name} ${friend.username}`).includes(
      normalize(term.trim())
    )
  );

  return (
    <div
      id="post-audience"
      className={classes.audience}
      role="group"
      aria-label="Đối tượng bài viết"
    >
      <p className={classes.audienceIntro}>Ai có thể xem bài viết của bạn?</p>
      <label
        className={`${classes.audienceOption} ${audience === 'public' ? classes.activeOption : ''}`}
      >
        <span className={classes.audienceIcon}>
          <PostAudienceIcon audience="public" />
        </span>
        <span className={classes.optionText}>
          <strong>Công khai</strong>
          <small>Mọi người trên PTITSocial</small>
        </span>
        <input
          type="radio"
          name="audience"
          checked={audience === 'public'}
          onChange={() => setAudience('public')}
        />
      </label>
      <label
        className={`${classes.audienceOption} ${audience === 'friends' ? classes.activeOption : ''}`}
      >
        <span className={classes.audienceIcon}>
          <PostAudienceIcon audience="friends" />
        </span>
        <span className={classes.optionText}>
          <strong>Bạn bè</strong>
          <small>Tất cả những người đã kết bạn với bạn</small>
        </span>
        <input
          type="radio"
          name="audience"
          checked={audience === 'friends'}
          onChange={() => setAudience('friends')}
        />
      </label>
      <label
        className={`${classes.audienceOption} ${audience === 'selected' ? classes.activeOption : ''}`}
      >
        <span className={classes.audienceIcon}>
          <PostAudienceIcon audience="selected" />
        </span>
        <span className={classes.optionText}>
          <strong>Bạn bè được chọn</strong>
          <small>Chỉ bạn và những bạn bè bạn chọn</small>
        </span>
        <input
          type="radio"
          name="audience"
          checked={audience === 'selected'}
          onChange={() => setAudience('selected')}
        />
      </label>
      {audience === 'selected' && (
        <div className={classes.friendPicker}>
          <div className={classes.friendListHeading}>
            <strong>Chọn bạn bè</strong>
            <span>Đã chọn {viewers.length}/100</span>
          </div>
          <div className={classes.friendSearch}>
            <FiSearch />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tìm trong danh sách bạn bè"
              aria-label="Tìm trong danh sách bạn bè"
            />
          </div>
          <div className={classes.viewerResults} aria-live="polite">
            {loading && <p className={classes.listMessage}>Đang tải bạn bè…</p>}
            {error && (
              <div className={classes.listMessage} role="alert">
                {error}{' '}
                <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                  Thử lại
                </button>
              </div>
            )}
            {!loading && !error && !friends.length && (
              <p className={classes.listMessage}>
                Bạn chưa kết bạn với ai. Hãy kết bạn trước để dùng chế độ này.
              </p>
            )}
            {!loading && !error && friends.length > 0 && !visibleFriends.length && (
              <p className={classes.listMessage}>Không tìm thấy bạn bè phù hợp.</p>
            )}
            {!loading &&
              !error &&
              visibleFriends.map((friend) => {
                const checked = viewers.some((viewer) => viewer._id === friend._id);
                return (
                  <label
                    className={`${classes.friendRow} ${checked ? classes.selectedFriend : ''}`}
                    key={friend._id}
                  >
                    <img src={friend.photo} alt="" />
                    <span className={classes.optionText}>
                      <strong>
                        {friend.first_name} {friend.last_name}
                      </strong>
                      <small>@{friend.username}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && viewers.length >= 100}
                      onChange={(e) =>
                        setViewers((old) =>
                          e.target.checked
                            ? [...old, friend]
                            : old.filter((viewer) => viewer._id !== friend._id)
                        )
                      }
                    />
                  </label>
                );
              })}
          </div>
        </div>
      )}
      <button
        type="button"
        className={`btn_blue ${classes.audienceDone}`}
        disabled={audience === 'selected' && (loading || Boolean(error) || !viewers.length)}
        onClick={onDone}
      >
        Xong
      </button>
    </div>
  );
}
