import { Link } from 'react-router-dom';
import styles from './LoginFooter.module.css';

export default function LoginFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.warp}>
        <span>Tiếng Việt</span>
      </div>
      <div className="line-spliter"></div>
      <div className={styles.warp}>
        <Link to="/">Đăng ký</Link>
        <Link to="/">Đăng nhập</Link>
        <Link to="/">Tin nhắn</Link>
        <Link to="/">PTITSocial rút gọn</Link>
        <Link to="/">Video</Link>
        <Link to="/">Địa điểm</Link>
        <Link to="/">Trò chơi</Link>
        <Link to="/">Chợ mua bán</Link>
        <Link to="/">Thanh toán</Link>
        <Link to="/">Oculus</Link>
        <Link to="/">Portal</Link>
        <Link to="/">Instagram</Link>
        <Link to="/">Bản tin</Link>
        <Link to="/">Địa phương</Link>
        <Link to="/">Gây quỹ</Link>
        <Link to="/">Dịch vụ</Link>
        <Link to="/">Trung tâm thông tin bầu cử</Link>
        <Link to="/">Nhóm</Link>
        <Link to="/">Giới thiệu</Link>
        <Link to="/">Tạo quảng cáo</Link>
        <Link to="/">Tạo trang</Link>
        <Link to="/">Nhà phát triển</Link>
        <Link to="/">Tuyển dụng</Link>
        <Link to="/">Quyền riêng tư</Link>
        <Link to="/">Tệp cookie</Link>
        <Link to="/">
          Lựa chọn quảng cáo
          <i className="adChoices_icon"></i>
        </Link>
        <Link to="/">Điều khoản</Link>
        <Link to="/">Trợ giúp</Link>
      </div>
      <div className={styles.warp}>
        <Link to="/" style={{ fontSize: '12px', marginTop: '10px' }}>
          PTITSocial © 2026
        </Link>
      </div>
    </footer>
  );
}
