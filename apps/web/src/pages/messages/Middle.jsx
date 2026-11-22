import { localizeSystemText } from 'app/locale';
import React, { useState, useRef } from 'react';
import { ArrowDown1, Info, Like } from 'shared/icons/index';
import styles from './messages.module.css';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';
import { socket } from 'routes/IsLoggedIn';
import { useInView } from 'react-intersection-observer';
import { useSeenMessage } from 'features/messaging/hooks/useSeenMessage';
import SeenStatus from './SeenStatus';
import { FiFileText, FiDownload } from 'react-icons/fi';
import MessageMenu from 'features/messaging/components/MessageMenu';
import MessageContext from 'features/messaging/components/MessageContext';
import ForwardMessageModal from 'features/messaging/components/ForwardMessageModal';
import { isMessageUnread } from 'shared/lib/messageReadState';

import { isFirstMsg, isLastMsg, isSameUser, isSingleMsg } from 'shared/lib/messagesPosition';
import Right from './Right';
import SendMessage from './SendMessage';
import { Link, useNavigate } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import { toast } from 'react-hot-toast';
import { chatThemes } from 'features/messaging/data/chatThemes';
import radialToLinearGradient from 'shared/lib/radialToLinearGradient';

function Middle({ chatId, soketSlice, user, pView, setOpenInfo, openInfo }) {
  const messagesEndRef = useRef();
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  useEffect(() => {
    setReplyTo(null);
    setForwardMessage(null);
  }, [chatId]);

  const jumpToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (!element) {
      toast('Tin nhắn gốc nằm trong lịch sử cũ. Cuộn lên để tải thêm.');
      return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.animate(
      [{ backgroundColor: 'rgba(179,33,48,0.25)' }, { backgroundColor: 'transparent' }],
      { duration: 1500 }
    );
  };
  const messageActions = (message) => (
    <MessageMenu message={message} onReply={setReplyTo} onForward={setForwardMessage} />
  );
  const { ref: seenRef, inView: seenView } = useInView();
  const { ref: fetchNextRef, inView: fetchNextView } = useInView();

  let navigate = useNavigate();

  const [isTyping, setIsTyping] = useState({ room: '', status: false });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async ({ pageParam = 1 }) => {
    const { data } = await axios.get(
      `${process.env.REACT_APP_BACKEND_URL}/api/v1/messages/${chatId}?sort=-createdAt&limit=100&page=${pageParam}`,
      {
        withCredentials: true,
      }
    );
    return data;
  };

  const {
    isLoading: isGetMessagesLoading,
    data: getMessagesData,
    isSuccess: isGetMessagesSuccess,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['getMessages', chatId],
    queryFn: fetchMessages,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 100) {
        return undefined;
      } else {
        return pages.length + 1;
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
    onError: (error) => {
      toast.error(error?.response?.data?.message);
      navigate('/messages', { replace: true });
    },
  });

  const FilterdMessages = getMessagesData?.pages
    ?.map((page) => page.data.messages)
    .reduce((accumulator, currentValue) => {
      return accumulator.concat(currentValue);
    }, []);

  const currentChat = getMessagesData?.pages[0]?.data?.chat;

  const isChatSkelton =
    isGetMessagesLoading && !isGetMessagesSuccess && !getMessagesData && !getMessagesData?.data;

  const chatTheme = chatThemes[getMessagesData?.pages[0]?.data?.chat?.theme - 1];

  const { mutate: seenMessage } = useSeenMessage(getMessagesData?.pages[0]?.data?.chat);

  useEffect(() => {
    scrollToBottom();
  }, [chatId]);

  useEffect(() => {
    socket.emit('join_room', chatId);
    socket.on('typing', ({ room, status }) => {
      setIsTyping({ room, status });
    });
  }, [chatId]);

  useEffect(() => {
    if (
      seenView &&
      currentChat?._id === chatId &&
      isMessageUnread(currentChat?.latestMessage, user._id)
    ) {
      seenMessage({
        messageId: currentChat?.latestMessage?._id,
      });
    }
  }, [seenView, getMessagesData]);

  useEffect(() => {
    if (fetchNextView) {
      fetchNextPage();
    }
  }, [fetchNextView]);

  const skl = (
    <div style={{ padding: '10px' }}>
      <div className={`${styles.message}`}>
        <Skeleton
          height={30}
          width={170}
          style={{
            transform: 'translateY(4px)',
            borderRadius: '20px',
          }}
        />
      </div>
      <div className={`${styles.message} ${styles.message_user}`}>
        <Skeleton
          height={30}
          width={150}
          style={{
            transform: 'translateY(4px)',
            borderRadius: '20px',
          }}
        />
      </div>
      <div className={`${styles.message} ${styles.message_user}`}>
        <Skeleton
          height={30}
          width={100}
          style={{
            transform: 'translateY(4px)',
            borderRadius: '20px',
          }}
        />
      </div>
      <div className={`${styles.message}`}>
        <Skeleton
          height={30}
          width={100}
          style={{
            transform: 'translateY(4px)',
            borderRadius: '20px',
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className={`${styles.middle} ${replyTo ? styles.middleReplying : ''}`}>
        <div className={styles.middle_header}>
          {!pView && (
            <Link to={`/messages`} className={`${styles.icon} ${styles.rotate90}`}>
              <ArrowDown1 />
            </Link>
          )}

          <div className={styles.chat_img}>
            {isChatSkelton ? (
              ''
            ) : (
              <div className={styles.chat_img2}>
                <img src={currentChat?.photo} alt="" />
                {soketSlice.onlineUsers.find((u) => u.id === currentChat?.users[0]?._id) &&
                  currentChat?.type === 'private' && <span className={styles.green_dot} />}
              </div>
            )}

            <div className={styles.chat_info}>
              {isChatSkelton ? '' : <span>{currentChat?.chatName}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <div
              className="hover2 small_circle"
              onClick={() => {
                setOpenInfo((prev) => !prev);
              }}
            >
              <Info
                color={chatTheme?.type === 'gradient' ? chatTheme?.topColor : chatTheme?.color}
              />
            </div>
          </div>
        </div>
        <div className={styles.messages}>
          <div ref={messagesEndRef} />
          {!isChatSkelton ? (
            <>
              {FilterdMessages?.map((message, i) => {
                return (
                  <div
                    key={message._id}
                    id={`message-${message._id}`}
                    ref={i === 0 && isSameUser(message, user) ? seenRef : null}
                  >
                    {['text', 'like', 'image', 'file'].includes(message.type) ? (
                      <div
                        className={`${styles.message} ${
                          isSameUser(message, user) ? styles.message_user : ''
                        }`}
                        key={message._id}
                      >
                        {isSameUser(message, user) && (
                          <div className={styles.meesage_user}>
                            {isLastMsg(message, FilterdMessages, i) ||
                            isSingleMsg(message, FilterdMessages, i) ? (
                              <img src={message.sender.photo} alt="" />
                            ) : (
                              ''
                            )}
                          </div>
                        )}
                        {!isSameUser(message, user) && messageActions(message)}
                        <div
                          className={styles.messageStack}
                          title={new Date(message.createdAt || message.updatedAt).toLocaleString(
                            'vi-VN'
                          )}
                        >
                          <MessageContext message={message} onJump={jumpToMessage} />
                          {message.type === 'like' ? (
                            <Like
                              height="60"
                              width="60"
                              style={{ marginTop: '10px' }}
                              color={chatTheme?.color}
                            />
                          ) : (
                            <div
                              style={{
                                backgroundColor: !isSameUser(message, user) ? chatTheme?.color : '',
                                backgroundImage:
                                  !isSameUser(message, user) && chatTheme?.type === 'gradient'
                                    ? radialToLinearGradient(chatTheme?.data)
                                    : '',
                              }}
                              className={`${styles.message_content} ${
                                isSameUser(message, user) ? styles.message_content_user : ''
                              } ${
                                isSameUser(message, user) && isFirstMsg(message, FilterdMessages, i)
                                  ? styles.m_c_u_first_radius
                                  : ''
                              } ${
                                isSameUser(message, user) && isLastMsg(message, FilterdMessages, i)
                                  ? styles.m_c_u_last_radius
                                  : ''
                              } ${
                                !isSameUser(message, user) &&
                                isFirstMsg(message, FilterdMessages, i)
                                  ? styles.m_c_first_radius
                                  : ''
                              } ${
                                !isSameUser(message, user) && isLastMsg(message, FilterdMessages, i)
                                  ? styles.m_c_last_radius
                                  : ''
                              } ${
                                isSingleMsg(message, FilterdMessages, i) ? styles.single_radius : ''
                              }`}
                            >
                              {message.type === 'file' ? (
                                <>
                                  <a className={styles.fileBubble} href={message.content} download>
                                    <FiFileText size={28} />
                                    <span>
                                      <strong>{message.attachment?.name || 'Tệp đính kèm'}</strong>
                                      <small>
                                        {((message.attachment?.size || 0) / 1024).toLocaleString(
                                          'vi-VN',
                                          { maximumFractionDigits: 1 }
                                        )}{' '}
                                        KB · Tải xuống
                                      </small>
                                    </span>
                                    <FiDownload />
                                  </a>
                                  {message.caption && (
                                    <div className={styles.imageCaption}>{message.caption}</div>
                                  )}
                                </>
                              ) : message.type === 'image' ? (
                                <>
                                  <a href={message.content} target="_blank" rel="noreferrer">
                                    <img
                                      className={styles.messageImage}
                                      src={message.content}
                                      alt="Ảnh trong tin nhắn"
                                    />
                                  </a>
                                  {message.caption && (
                                    <div className={styles.imageCaption}>{message.caption}</div>
                                  )}
                                </>
                              ) : (
                                message.content
                              )}
                            </div>
                          )}
                        </div>
                        {isSameUser(message, user) && messageActions(message)}
                        {!isSameUser(message, user) && (
                          <div className={styles.msg_space}>
                            {i === 0 ? <SeenStatus chat={currentChat} user={user} /> : ''}
                          </div>
                        )}
                      </div>
                    ) : message.type === 'info' ? (
                      <div className={styles.info_message}>
                        {localizeSystemText(message.content)}
                      </div>
                    ) : (
                      ''
                    )}
                  </div>
                );
              })}
              <div
                ref={fetchNextRef}
                disabled={!hasNextPage || isFetchingNextPage}
                style={{
                  marginBottom: '20px',
                  textAlign: 'center',
                  color: 'var(--color-secondary)',
                }}
              >
                {isFetchingNextPage
                  ? skl
                  : hasNextPage
                    ? 'Đang tải tin nhắn cũ…'
                    : null}
              </div>
            </>
          ) : (
            skl
          )}
        </div>
        <SendMessage
          key={chatId}
          chat={currentChat}
          chatId={chatId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          setIsTyping={setIsTyping}
          isTyping={isTyping}
          chatTheme={chatTheme}
          scrollToBottom={scrollToBottom}
        />
      </div>
      {forwardMessage && (
        <ForwardMessageModal
          key={forwardMessage._id}
          message={forwardMessage}
          currentChatId={chatId}
          onClose={() => setForwardMessage(null)}
        />
      )}
      {openInfo && (
        <Right
          isChatSkelton={isChatSkelton}
          chat={currentChat}
          soketSlice={soketSlice}
          chatId={chatId}
          user={user}
          setOpenInfo={setOpenInfo}
          pView={pView}
          openInfo={openInfo}
          chatTheme={chatTheme}
        />
      )}
    </>
  );
}

export default Middle;
