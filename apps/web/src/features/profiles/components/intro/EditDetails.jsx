import { useRef } from 'react';
import useOnClickOutside from 'shared/hooks/useOnClickOutside';
import Portal from 'shared/lib/Portal';
import Card from 'shared/components/ui/Card/Card';
import Detail from './Detail';
import classes from './EditDetails.module.css';

function EditDetails({ showEdit, setShowEdit, infos, handleChange, updateDetails, details }) {
  const editDetailsRef = useRef(null);

  useOnClickOutside(editDetailsRef, showEdit, () => {
    setShowEdit(false);
  });

  return (
    <Portal>
      <div className={`${classes.wrap} blur`}>
        <Card className={classes.card} innerRef={editDetailsRef}>
          <div className={classes.header}>
            Chỉnh sửa thông tin
            <div className="small_circle" onClick={() => setShowEdit(false)}>
              <i className="exit_icon"></i>
            </div>
          </div>
          <div className={classes.content}>
            <div className={classes.h_col}>
              <span className={classes.t1}>Chỉnh sửa phần giới thiệu</span>
              <span className={classes.t2}>Các thông tin bạn chọn sẽ được hiển thị công khai.</span>
              <div className={classes.details_header}>Tên khác</div>
              <Detail
                value={details?.otherName}
                img="studies"
                placeholder="Thêm tên khác"
                name="otherName"
                text="Tên khác"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
              <div className={classes.details_header}>Công việc</div>
              <Detail
                value={details?.job}
                img="job"
                placeholder="Thêm công việc"
                name="job"
                text="công việc"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
              <Detail
                value={details?.workplace}
                img="job"
                placeholder="Thêm nơi làm việc"
                name="workplace"
                text="nơi làm việc"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
              <div className={classes.details_header}>Học vấn</div>
              <Detail
                value={details?.highSchool}
                img="studies"
                placeholder="Thêm trường trung học"
                name="highSchool"
                text="trường trung học"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
              <Detail
                value={details?.college}
                img="studies"
                placeholder="Thêm trường đại học"
                name="college"
                text="trường đại học"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
              <div className={classes.details_header}>Nơi sống hiện tại</div>
              <Detail
                value={details?.currentCity}
                img="home"
                placeholder="Thêm nơi sống hiện tại"
                name="currentCity"
                text="nơi sống hiện tại"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
              <div className={classes.details_header}>Quê quán</div>
              <Detail
                value={details?.homeTown}
                img="from"
                placeholder="Thêm quê quán"
                name="homeTown"
                text="quê quán"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
              <div className={classes.details_header}>Tình trạng quan hệ</div>
              <Detail
                value={details?.relationship}
                img="relationship"
                placeholder="Thêm tình trạng quan hệ"
                name="relationship"
                text="tình trạng quan hệ"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
                rel={true}
              />
              <div className={classes.details_header}>Instagram</div>
              <Detail
                value={details?.instagram}
                img="instagram"
                placeholder="Thêm tài khoản Instagram"
                name="instagram"
                text="tài khoản Instagram"
                handleChange={handleChange}
                updateDetails={updateDetails}
                infos={infos}
                details={details}
                max={20}
              />
            </div>
          </div>
        </Card>
      </div>
    </Portal>
  );
}

export default EditDetails;
