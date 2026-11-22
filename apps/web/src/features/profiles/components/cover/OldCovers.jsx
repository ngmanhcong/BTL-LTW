import React, { useRef } from 'react';
import useOnClickOutside from 'shared/hooks/useOnClickOutside';
import Card from 'shared/components/ui/Card/Card';
import classes from './OldCovers.module.css';

function OldCovers({ setShowOldCover, setImage, photosData, showOldCover }) {
  const oldCoversCardRef = useRef(null);

  useOnClickOutside(oldCoversCardRef, showOldCover, () => {
    setShowOldCover(false);
  });

  return (
    <div className={`${classes.wrap} blur`}>
      <Card className={classes.card} innerRef={oldCoversCardRef}>
        <div className={classes.header}>
          Cập nhật ảnh bìa
          <div className="small_circle" onClick={() => setShowOldCover(false)}>
            <i className="exit_icon"></i>
          </div>
        </div>
        <div className={classes.content}>
          {photosData?.profileCovers.length > 0 && (
            <>
              <div>Chọn ảnh bìa cũ</div>
              <div className={classes.old_photos}>
                {photosData?.profileCovers.map((photo) => (
                  <img
                    src={photo.url}
                    alt={photo.id}
                    onClick={() => {
                      setImage(photo.url);
                      setShowOldCover(false);
                    }}
                    key={photo.id}
                  />
                ))}
              </div>
            </>
          )}
          {photosData?.resources.length > 0 && (
            <>
              <div>Chọn từ ảnh trên trang cá nhân</div>
              <div className={classes.old_photos}>
                {photosData?.resources.map((photo) => (
                  <img
                    src={photo.url}
                    alt={photo.id}
                    onClick={() => {
                      setImage(photo.url);
                      setShowOldCover(false);
                    }}
                    key={photo.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default OldCovers;
