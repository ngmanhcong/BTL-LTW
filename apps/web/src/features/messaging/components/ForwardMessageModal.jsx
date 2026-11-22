import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiX, FiSearch, FiCornerUpRight, FiCheck } from 'react-icons/fi';
import Portal from 'shared/lib/Portal';
import { useSendMessage } from '../hooks/useSendMessage';
import { messagePreview } from './MessageContext';
import styles from 'pages/messages/messages.module.css';

export default function ForwardMessageModal({ message, currentChatId, onClose }) {
  const [targets, setTargets] = useState([]);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [sent, setSent] = useState([]);
  const [sending, setSending] = useState(null);
  const lock = useRef(false);
  const { mutateAsync: sendMessage } = useSendMessage();

  useEffect(() => {
    const controller = new AbortController();
    const options = { withCredentials: true, signal: controller.signal };
    setLoading(true);
    setError('');
    Promise.all([
      axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/chats?sort=-updatedAt&limit=1000`,
        options
      ),
      axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/v1/friends/friendsPage`, options),
    ])
      .then(([chats, friends]) => {
        if (controller.signal.aborted) return;
        const existing = chats.data.data.chats;
        const privateUsers = new Set(
          existing
            .filter((chat) => chat.type === 'private')
            .flatMap((chat) => chat.users.map((user) => user._id))
        );
        setTargets([
          ...existing
            .filter((chat) => chat._id !== currentChatId)
            .map((chat) => ({
              key: chat._id,
              chatId: chat._id,
              name: chat.chatName,
              photo: chat.photo,
            })),
          ...friends.data.data.friendLists
            .filter((friend) => friend && !privateUsers.has(friend._id))
            .map((friend) => ({
              key: friend._id,
              userId: friend._id,
              name: `${friend.first_name} ${friend.last_name}`,
              photo: friend.photo,
            })),
        ]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Không tải được danh sách người nhận.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [currentChatId, attempt]);

  const forward = async (target) => {
    if (lock.current || sent.includes(target.key)) return;
    lock.current = true;
    setSending(target.key);
    setError('');
    try {
      let chatId = target.chatId;
      if (!chatId) {
        const { data } = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/v1/chats/create/private`,
          { userId: target.userId },
          { withCredentials: true }
        );
        chatId = data.data.chat._id;
      }
      await sendMessage({ chatId, forwardMessageId: message._id });
      setSent((old) => [...old, target.key]);
    } catch (error) {
      setError(error.response?.data?.message || 'Chuyển tiếp thất bại. Hãy thử lại.');
    } finally {
      lock.current = false;
      setSending(null);
    }
  };

  const normalized = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase();
  const visible = targets.filter((target) =>
    normalized(target.name).includes(normalized(term.trim()))
  );
  return (
    <Portal>
      <div
        className={styles.forwardOverlay}
        onClick={(event) => {
          if (event.target === event.currentTarget && !sending) onClose();
        }}
      >
        <section
          className={styles.forwardDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forward-message-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !sending) onClose();
          }}
        >
          <header>
            <h2 id="forward-message-title">Chuyển tiếp tin nhắn</h2>
            <button
              type="button"
              aria-label="Đóng chuyển tiếp"
              disabled={Boolean(sending)}
              onClick={onClose}
            >
              <FiX />
            </button>
          </header>
          <div className={styles.forwardPreview}>
            <FiCornerUpRight />
            <span>{messagePreview(message)}</span>
          </div>
          <label className={styles.forwardSearch}>
            <FiSearch />
            <input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Tìm bạn bè hoặc cuộc trò chuyện"
              aria-label="Tìm người nhận"
            />
          </label>
          {error && (
            <p role="alert" className={styles.forwardStatus}>
              {error}{' '}
              <button type="button" onClick={() => setAttempt((old) => old + 1)}>
                Thử lại
              </button>
            </p>
          )}
          <div className={styles.forwardTargets}>
            {loading ? (
              <p className={styles.forwardStatus}>Đang tải…</p>
            ) : !visible.length ? (
              <p className={styles.forwardStatus}>Không có người nhận phù hợp.</p>
            ) : (
              visible.map((target) => (
                <div key={target.key} className={styles.forwardTarget}>
                  <img src={target.photo} alt="" />
                  <span>{target.name}</span>
                  <button
                    type="button"
                    disabled={Boolean(sending) || sent.includes(target.key)}
                    onClick={() => forward(target)}
                  >
                    {sent.includes(target.key) ? (
                      <>
                        <FiCheck /> Đã gửi
                      </>
                    ) : sending === target.key ? (
                      'Đang gửi…'
                    ) : (
                      'Gửi'
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Portal>
  );
}
