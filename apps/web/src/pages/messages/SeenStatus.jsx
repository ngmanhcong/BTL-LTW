import React from 'react';
import { UnSeen } from 'shared/icons/index';
import styles from './messages.module.css';
import { isMessageUnread } from 'shared/lib/messageReadState';

function SeenStatus({ chat, user }) {
  return (
    <>
      {chat?.latestMessage?.sender._id === user._id ? (
        chat?.latestMessage?.seen === 'seen' ? (
          <img src={chat?.photo} alt="" className={styles.seen_status_s} />
        ) : (
          <span className={styles.seen_status_s}>
            <UnSeen />
          </span>
        )
      ) : isMessageUnread(chat?.latestMessage, user._id) ? (
        <span className={styles.seen_status} />
      ) : (
        ''
      )}
    </>
  );
}

export default SeenStatus;
