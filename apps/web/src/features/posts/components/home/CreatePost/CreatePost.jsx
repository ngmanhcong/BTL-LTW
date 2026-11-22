import React from 'react';
import { Photo } from 'shared/icons/index';
import styles from './CreatePost.module.css';
import * as createPostSlice from 'app/slices/createPostSlice';
import { useSelector, useDispatch } from 'react-redux';

function CreatePost({ user }) {
  const dispatch = useDispatch();
  const createPost = useSelector((state) => state.createPost);

  return (
    <div className={styles.create_post}>
      <div className={styles.header}>
        <img src={user?.photo} alt="" />
        <div
          className={`${styles.open_post} hover2`}
          onClick={() => {
            dispatch(createPostSlice.open());
          }}
        >
          {createPost.postText ? createPost.postText : `${user?.first_name}, bạn đang nghĩ gì?`}
        </div>
      </div>
      <div className={styles.splitter} />
      <div className={styles.post_body}>
        <div
          className={`${styles.createPost_icon} hover1`}
          onClick={() => {
            dispatch(createPostSlice.open('photo'));
          }}
        >
          <Photo color="#4bbf67" />
          Ảnh
        </div>
      </div>
    </div>
  );
}

export default CreatePost;
