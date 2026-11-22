import { useRef, useEffect } from 'react';
import isRTL from 'shared/lib/isRTL';
import classes from './intro.module.css';

function EditArea({
  innerRef,
  infos,
  handleChange,
  setShow,
  max,
  remain,
  updateDetails,
  details,
  name,
  placeholder,
  rel,
}) {
  const isChanged = rel ? false : details?.[name] === infos?.[name];
  const editAreaRef = useRef(null);

  useEffect(() => {
    editAreaRef.current.focus();
  }, []);

  return (
    <div className={classes.bio_wrap} ref={innerRef}>
      {rel ? (
        <select
          ref={editAreaRef}
          className={classes.select_rel}
          name={name}
          value={infos.relationship}
          onChange={handleChange}
        >
          <option value="" disabled defaultValue>
            Chọn tình trạng
          </option>

          <option value="Single">Độc thân</option>
          <option value="In a realationship">Đang hẹn hò</option>
          <option value="Married">Đã kết hôn</option>
          <option value="Divorced">Đã ly hôn</option>
          <option value="">Xóa tình trạng quan hệ</option>
        </select>
      ) : (
        <textarea
          ref={editAreaRef}
          style={{
            fontSize: `${infos?.[name] && infos?.[name].length > 75 ? '15px' : ''}`,
            direction: `${isRTL(infos?.[name]) ? 'rtl' : 'ltr'}`,
          }}
          placeholder={placeholder}
          value={infos?.[name]}
          onChange={handleChange}
          className={classes.textarea_blue}
          maxLength={max}
          name={name}
        ></textarea>
      )}
      {name === 'bio' && <div className={classes.remaining}>{remain} ký tự còn lại</div>}
      <div className={classes.save_btns}>
        <button className="gray_btn" onClick={() => setShow(false)}>
          Hủy
        </button>
        <button
          disabled={isChanged}
          className={isChanged ? `gray_btn` : `btn_blue`}
          onClick={() => {
            updateDetails();
            setShow(false);
          }}
          style={{
            color: `${isChanged ? `#bcc0c4` : `#fff`}`,
            cursor: `${isChanged ? `not-allowed` : `pointer`}`,
          }}
        >
          Lưu
        </button>
      </div>
    </div>
  );
}

export default EditArea;
