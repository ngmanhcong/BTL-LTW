import React, { useRef, useEffect } from 'react';
import { useDeletePost } from 'features/posts/hooks/useDeletePost';
import useOnClickOutside from 'shared/hooks/useOnClickOutside';
import Card from 'shared/components/ui/Card/Card';
import MenuItem from './MenuItem';
import classes from './Post.module.css';
import { saveAs } from 'file-saver';
import { IoIosLink } from 'react-icons/io';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';

function PostMenu({ showMenu, setShowMenu, post, user, postRef }) {
  const menuRef = useRef();
  const isOwner = post.user._id === user._id;

  const { data, mutate } = useDeletePost(post._id);
  const deleteHandler = () => {
    mutate({ post: post._id });
  };

  const downloadImages = async () => {
    post.images.foreach((img) => {
      const filename = img.split('/').pop();
      saveAs(img, filename);
    });
    setShowMenu(false);
  };

  useEffect(() => {
    if (data?.status === 'success') {
      toast.success('Đã xóa thành công!');
      postRef.current.remove();
    }
  }, [data, postRef]);

  useOnClickOutside(menuRef, showMenu, () => {
    setShowMenu(false);
  });

  const full = `${window.location.origin}/${post.user.username}/posts/${post._id}`;

  return (
    <Card className={classes.menu} innerRef={menuRef}>
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
        <MenuItem icon="save_icon" title="Lưu bài viết" subtitle="Thêm vào mục đã lưu." />
        {post.images.length > 0 && (
          <div onClick={() => downloadImages()}>
            <MenuItem icon="download_icon" title="Tải xuống" />
          </div>
        )}
        {isOwner && (
          <>
            <div className="line" />
            <div onClick={() => deleteHandler()}>
              <MenuItem
                icon="trash_icon"
                title="Chuyển vào thùng rác"
                subtitle="Nội dung trong thùng rác sẽ bị xóa sau 30 ngày"
              />
            </div>
          </>
        )}
      </ul>
    </Card>
  );
}

export default PostMenu;
