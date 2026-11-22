import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useCreatePost } from 'features/posts/hooks/useCreatePost';
import isRTL from 'shared/lib/isRTL';
import Portal from 'shared/lib/Portal';
import FormLoader from 'shared/components/FormLoader/index';
import Card from 'shared/components/ui/Card/Card';
import classes from './CreateSharePost.module.css';
import SharedPost from './SharedPost';
import toast from 'react-hot-toast';
import useOnClickOutside from 'shared/hooks/useOnClickOutside';

function CreateSharePost({ showSharePost, setShowSharePost, post }) {
  const [description, setDescription] = useState('');
  const createShareRef = useRef();

  const username = useSelector((state) => state.user.userinfo?.username);
  const { isLoading, mutate } = useCreatePost(username);

  useOnClickOutside(createShareRef, showSharePost, () => {
    setShowSharePost(false);
  });

  const sharePostHandler = () => {
    if (isLoading) return;
    let form = new FormData();
    form.append('type', 'share');
    form.append('text', description);
    form.append('sharedID', post._id);
    mutate(
      { data: Object.fromEntries(form), type: 'share' },
      {
        onSuccess: () => {
          setShowSharePost(false);
          toast.success('Đã chia sẻ thành công!');
        },
        onError: (error) =>
          toast.error(
            error.response?.data?.message || 'Chưa chia sẻ được bài viết. Vui lòng thử lại.'
          ),
      }
    );
  };

  return (
    <Portal>
      <div className={`${classes.wrap} blur`}>
        <Card className={classes.card} innerRef={createShareRef}>
          <div className={classes.header}>
            Chia sẻ bài viết
            <div className="small_circle" onClick={() => setShowSharePost(false)}>
              <i className="exit_icon"></i>
            </div>
          </div>
          <div className={classes.content}>
            <FormLoader loading={isLoading}>
              <textarea
                style={{
                  fontSize: `${description && description.length > 75 ? '15px' : ''}`,
                  direction: `${isRTL(description) ? 'rtl' : 'ltr'}`,
                }}
                placeholder="Mô tả"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={classes.textarea_blue}
              ></textarea>
              <SharedPost post={post} />
              <div className={classes.btns}>
                <button className="gray_btn" onClick={() => setShowSharePost(false)}>
                  Hủy
                </button>
                <button
                  className="btn_blue"
                  disabled={isLoading}
                  onClick={() => sharePostHandler()}
                >
                  Chia sẻ
                </button>
              </div>
            </FormLoader>
          </div>
        </Card>
      </div>
    </Portal>
  );
}

export default CreateSharePost;
