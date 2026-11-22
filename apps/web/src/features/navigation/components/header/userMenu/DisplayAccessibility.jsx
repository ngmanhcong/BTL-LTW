import { useDispatch, useSelector } from 'react-redux';
import { changeTheme } from 'app/slices/userSlice';
import styles from './UserMenu.module.css';

export default function DisplayAccessibility({ setVisible }) {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.user.theme);
  return (
    <div className={styles.absolute_wrap}>
      <div className={styles.absolute_wrap_header}>
        <div
          className={`${styles.circle} hover1`}
          onClick={() => {
            setVisible(0);
          }}
        >
          <i className="arrow_back_icon"></i>
        </div>
        Hiển thị và trợ năng
      </div>
      <div className={styles.mmenu_main}>
        <div className={styles.small_circle} style={{ width: '50px' }}>
          <i className="dark_filled_icon"></i>
        </div>
        <div className={styles.mmenu_col}>
          <span className={styles.mmenu_span1}>Chế độ tối</span>
          <span className={styles.mmenu_span2}>
            Điều chỉnh giao diện để giảm chói và giúp mắt thoải mái hơn.
          </span>
        </div>
      </div>
      <label
        htmlFor="darkOff"
        className="hover1"
        onClick={() => {
          dispatch(changeTheme('light'));
        }}
      >
        <span>Tắt</span>
        {theme === 'light' ? (
          <input type="radio" name="dark" id="darkOff" defaultChecked={true} />
        ) : (
          <input type="radio" name="dark" id="darkOff" />
        )}
      </label>
      <label
        htmlFor="darkOn"
        className="hover1"
        onClick={() => {
          dispatch(changeTheme('dark'));
        }}
      >
        <span>Bật</span>
        {theme === 'light' ? (
          <input type="radio" name="dark" id="darkOn" />
        ) : (
          <input type="radio" name="dark" id="darkOn" defaultChecked={true} />
        )}
      </label>
      <div className={styles.mmenu_main}>
        <div className={styles.small_circle} style={{ width: '50px' }}>
          <i className="compact_icon"></i>
        </div>
        <div className={styles.mmenu_col}>
          <span className={styles.mmenu_span1}>Chế độ thu gọn</span>
          <span className={styles.mmenu_span2}>
            Giảm kích thước chữ để hiển thị được nhiều nội dung hơn.
          </span>
        </div>
      </div>
      <label htmlFor="compactOff" className="hover1">
        <span>Tắt</span>
        <input type="radio" name="compact" id="compactOff" />
      </label>
      <label htmlFor="compactOn" className="hover1">
        <span>Bật</span>
        <input type="radio" name="compact" id="compactOn" />
      </label>
      <div className={`${styles.mmenu_item} hover3`}>
        <div className={styles.small_circle} style={{ width: '50px' }}>
          <i className="keyboard_icon"></i>
        </div>
        <span>Bàn phím</span>
        <div className="rArrow">
          <i className="right_icon"></i>
        </div>
      </div>
    </div>
  );
}
