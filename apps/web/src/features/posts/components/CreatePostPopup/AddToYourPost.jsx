import React from 'react';
import { Photo } from 'shared/icons/index';
import classes from './CreatePostPopup.module.css';
import { useDispatch } from 'react-redux';
import * as createPostSlice from 'app/slices/createPostSlice';

function AddToYourPost() {
  const dispatch = useDispatch();

  return (
    <div className={classes.add_to}>
      <div className={classes.addto_text}>Thêm vào bài viết</div>
      <div className={classes.icons}>
        <div className="hover1" onClick={() => dispatch(createPostSlice.type('image'))}>
          <Photo color="#45bd62" />
        </div>
      </div>
    </div>
  );
}

export default AddToYourPost;
