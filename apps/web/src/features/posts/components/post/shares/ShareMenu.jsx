import React, { useRef, useState } from 'react';
import useOnClickOutside from 'shared/hooks/useOnClickOutside';
import Card from 'shared/components/ui/Card/Card';
import MenuItem from 'features/posts/components/post/MenuItem';
import classes from 'features/posts/components/post/Post.module.css';
import { IoIosLink } from 'react-icons/io';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import CreateSharePost from './CreateSharePost';

function ShareMenu({ showMenu, setShowMenu, post, user, postRef }) {
  const menuRef = useRef();

  const [showSharePost, setShowSharePost] = useState(false);

  useOnClickOutside(menuRef, showMenu, () => {
    if (showSharePost) return;
    setShowMenu(false);
  });

  const full = `${window.location.origin}/${post.user.username}/posts/${post._id}`;

  return (
    <Card className={classes.menu} innerRef={menuRef} style={{ padding: '10px' }}>
      <ul>
        <CopyToClipboard
          text={full}
          onCopy={() => {
            toast.success('Đã sao chép!');
            setShowMenu(false);
          }}
        >
          <li className="hover1">
            <IoIosLink size={22} />
            <div className={classes.post_menu_text}>
              <span>Sao chép liên kết bài viết</span>
              <span className={classes.menu_post_col}>Sao chép liên kết vào bộ nhớ tạm</span>
            </div>
          </li>
        </CopyToClipboard>

        <div className="line" />
        <div onClick={() => setShowSharePost((perv) => !perv)}>
          <MenuItem
            icon="share_icon"
            title="Chia sẻ bài viết"
            subtitle="Chia sẻ bài viết với bạn bè"
          />
        </div>
      </ul>
      {showSharePost && (
        <CreateSharePost
          showSharePost={showSharePost}
          setShowSharePost={setShowSharePost}
          post={post}
        />
      )}
    </Card>
  );
}

export default ShareMenu;
