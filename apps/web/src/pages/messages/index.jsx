import React from 'react';
import styles from './messages.module.css';
import { useParams } from 'react-router-dom';
import Middle from './Middle';
import Left from './Left';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery } from 'react-responsive';
import { useState } from 'react';
import { useEffect } from 'react';
import Brand from 'shared/components/brand/Brand';
import { setSelectedChat } from 'app/slices/socketSlice';

function Messages() {
  const { soketSlice, user: userState } = useSelector((state) => ({
    ...state,
  }));
  const dispatch = useDispatch();

  const user = userState.userinfo;
  const { chatId } = useParams();
  const desktopView = useMediaQuery({
    query: '(min-width: 850px)',
  });

  const pView = desktopView || !chatId;

  const [openInfo, setOpenInfo] = useState(false);

  useEffect(() => {
    setOpenInfo(false);
  }, [pView]);

  useEffect(() => {
    dispatch(setSelectedChat(chatId));
  }, [chatId]);

  useEffect(() => {
    const appHeight = (e) => {
      const doc = document.documentElement;
      const h = window.visualViewport.height;
      doc.style.setProperty('--app-height', `${h}px`);
    };
    window.addEventListener('resize', appHeight);
    appHeight();

    return () => {
      window.addEventListener('resize', appHeight);
    };
  }, []);

  return (
    <div
      className={`${styles.main} ${!openInfo ? styles.main_info : ''} ${
        !chatId ? styles.main_info : ''
      }`}
    >
      {pView && <Left chatId={chatId} soketSlice={soketSlice} user={user} />}
      {chatId ? (
        <Middle
          pView={pView}
          chatId={chatId}
          soketSlice={soketSlice}
          user={user}
          setOpenInfo={setOpenInfo}
          openInfo={openInfo}
        />
      ) : (
        <div className={styles.home_desk}>
          <Brand />
          <h2>Bắt đầu cuộc trò chuyện</h2>
          <p>Chọn một cuộc trò chuyện hoặc tìm bạn để nhắn tin.</p>
        </div>
      )}
    </div>
  );
}

export default Messages;
