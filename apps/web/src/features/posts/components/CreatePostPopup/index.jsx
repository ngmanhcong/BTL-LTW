import React, { useState, useRef, useEffect } from 'react';
import AudiencePicker from './AudiencePicker';
import { FiArrowLeft } from 'react-icons/fi';
import PostAudienceIcon from 'shared/icons/PostAudienceIcon';
import ImagePreviewStyles from './ImagePreview.module.css';
import classes from './CreatePostPopup.module.css';
import Portal from 'shared/lib/Portal';
import Card from 'shared/components/ui/Card/Card';
import EmojiPickerBackground from './EmojiPickerBackground';
import AddToYourPost from './AddToYourPost';
import ImagePreview from './ImagePreview';
import { useSelector, useDispatch } from 'react-redux';
import * as createPostSlice from 'app/slices/createPostSlice';
import useOnClickOutside from 'shared/hooks/useOnClickOutside';
import dataURItoBlob from 'shared/lib/dataURItoBlob';
import FormLoader from 'shared/components/FormLoader/index';
import { postBackgrounds } from 'features/posts/data/post';
import isRTL from 'shared/lib/isRTL';
import { useCreatePost } from 'features/posts/hooks/useCreatePost';

function CreatePostPopup({ user }) {
  const dispatch = useDispatch();

  const [picker, setPicker] = useState(false);
  const [audience, setAudience] = useState('public');
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [viewers, setViewers] = useState([]);
  const createPost = useSelector((state) => state.createPost);
  const postText = createPost.postText;
  const postImage = createPost.type === 'image';
  const postNormal = createPost.type === 'normal';
  const postBackground = createPost.type === 'background';
  const postTextRef = useRef();
  const bgRef = useRef();
  const popUpRef = useRef(null);
  const setPostText = (txt) => {
    dispatch(createPostSlice.postText(txt.replace(/(^[ \t]*\n)/gm, '')));
  };

  useEffect(() => {
    if (postBackground) {
      bgRef.current.style.backgroundImage = `url(${postBackgrounds[createPost.background - 1]})`;
    } else {
      bgRef.current.style.backgroundImage = null;
    }
  }, [postBackground, createPost.background]);

  useOnClickOutside(popUpRef, createPost.isOpen, () => {
    dispatch(createPostSlice.open());
  });

  const { data, isLoading, isSuccess, error, mutate } = useCreatePost(user.username);

  useEffect(() => {
    if (isSuccess && data?.data?.status === 'success') {
      setTimeout(() => {
        dispatch(createPostSlice.success());
      }, 300);
    }
  }, [data, isSuccess]);

  const postSubmit = () => {
    let form = new FormData();
    form.append('audience', audience);
    form.append(
      'allowedViewers',
      JSON.stringify(audience === 'selected' ? viewers.map((v) => v._id) : [])
    );
    form.append('type', createPost.type);
    form.append('text', createPost.postText);
    if (createPost.type === 'background') form.append('background', createPost.background);

    if (createPost.type === 'image') {
      const postImages = createPost.images.map((img) => {
        return dataURItoBlob(img);
      });
      postImages.forEach((image) => {
        form.append('images', image);
      });
    }
    if (createPost.type === 'image') {
      mutate({ data: form, type: 'image' });
    } else {
      mutate({ data: Object.fromEntries(form), type: createPost.type });
    }
  };

  return (
    <Portal>
      <div className={`${classes.wrap} blur`}>
        <Card className={classes.card} innerRef={popUpRef}>
          <FormLoader loading={isLoading} isError={error}>
            <div className={classes.header}>
              {audienceOpen && (
                <button
                  type="button"
                  className={classes.audienceBack}
                  aria-label="Quay lại tạo bài viết"
                  onClick={() => setAudienceOpen(false)}
                >
                  <FiArrowLeft />
                </button>
              )}
              <span>{audienceOpen ? 'Đối tượng bài viết' : 'Tạo bài viết'}</span>
              <div className={`${classes.exit} small_circle`}>
                <i
                  onClick={() => {
                    dispatch(createPostSlice.open());
                  }}
                  className="exit_icon"
                ></i>
              </div>
            </div>
            <div className={audienceOpen ? classes.composerHidden : undefined}>
              <div className={classes.profile}>
                <img src={user.photo} alt={user.name} className={classes.photo} />
                <div className={classes.profile_1}>
                  <span className={classes.user_name}>
                    {`${user.first_name} ${user.last_name}`}{' '}
                  </span>
                  <button
                    type="button"
                    className={classes.privacy}
                    aria-expanded={audienceOpen}
                    aria-controls="post-audience"
                    onClick={() => setAudienceOpen((open) => !open)}
                  >
                    <PostAudienceIcon audience={audience} />
                    <span>
                      {audience === 'public'
                        ? 'Công khai'
                        : audience === 'friends'
                          ? 'Bạn bè'
                          : `Bạn bè được chọn (${viewers.length})`}
                    </span>
                    <i className="arrowDown_icon"></i>
                  </button>
                </div>
              </div>

              <div className={classes.content}>
                <div
                  className={classes.container}
                  style={{ overflowY: postBackground ? 'hidden' : 'scroll' }}
                >
                  <div className={`${postImage ? ImagePreviewStyles.header_wrapper : ''}`}>
                    <div
                      ref={bgRef}
                      className={postBackground ? classes.post_input_background : ''}
                    >
                      <textarea
                        style={{
                          height: `${postBackground ? `${postText.length * 1.1}px` : 'auto'}`,
                          fontSize: `${postNormal && postText.length > 75 ? '15px' : ''}`,
                          direction: `${isRTL(postText) ? 'rtl' : 'ltr'}`,
                        }}
                        ref={postTextRef}
                        placeholder={`${user?.first_name}, bạn đang nghĩ gì?`}
                        className={`${classes.post_input}`}
                        maxLength={300}
                        onChange={(e) => {
                          setPostText(e.target.value);
                        }}
                        onClick={() => setPicker(false)}
                        value={postText}
                      ></textarea>
                    </div>
                    <EmojiPickerBackground
                      createPost={createPost}
                      postTextRef={postTextRef}
                      postText={postText}
                      setPostText={setPostText}
                      picker={picker}
                      setPicker={setPicker}
                      postBackgrounds={postBackgrounds}
                    />
                  </div>
                  {postImage && <ImagePreview images={createPost.images} />}
                </div>
                <div className={classes.cfooter}>
                  <AddToYourPost />
                  <button
                    disabled={isLoading || (audience === 'selected' && !viewers.length)}
                    className="btn_blue"
                    onClick={() => {
                      postSubmit();
                    }}
                  >
                    Đăng
                  </button>
                </div>
              </div>
            </div>
            {audienceOpen && (
              <AudiencePicker
                audience={audience}
                setAudience={setAudience}
                viewers={viewers}
                setViewers={setViewers}
                onDone={() => setAudienceOpen(false)}
              />
            )}
          </FormLoader>
        </Card>
      </div>
    </Portal>
  );
}

export default CreatePostPopup;
