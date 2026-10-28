import React, { useState } from 'react';
import { 
  ArrowLeft, 
  User as UserIcon, 
  ShieldCheck, 
  KeyRound, 
  LogOut, 
  Phone, 
  Calendar,
  Sparkles,
  Home as HomeIcon,
  Package,
  Signal,
  Wifi,
  BatteryMedium
} from 'lucide-react';

import { ShipperConfirmModal, ShipperToastType } from '../components/ShipperConfirmModal';

interface ShipperProfilePageProps {
  onBackToHome: () => void;
  onNavigateToOrders: () => void;
  onLogout: () => void;
}

export const ShipperProfilePage: React.FC<ShipperProfilePageProps> = ({
  onBackToHome,
  onNavigateToOrders,
  onLogout,
}) => {
  const [currentUser] = useState<any>(() => {
    try {
      const userStr = localStorage.getItem('urbanwine_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);

  // Custom Confirmation Popup Modal
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    type: ShipperToastType;
    title: string;
    message: string;
    showCancel?: boolean;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'INFO',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fullName = currentUser?.fullName || currentUser?.name || 'Nguyễn Văn Hùng';
  const staffId = currentUser?.userId ? `#SHP-0${currentUser.userId}` : '#SHP-01';
  const phone = currentUser?.phoneNumber || '0911 111 111';

  return (
    <div className="shipper-viewport-container">
      <div className="shipper-app-frame">
        {/* Status Bar */}
        <div className="shipper-status-bar">
          <span>9:41</span>
          <div className="shipper-status-island" />
          <div className="shipper-status-icons">
            <Signal size={13} />
            <Wifi size={13} />
            <BatteryMedium size={14} />
          </div>
        </div>

        {/* Topbar */}
        <div className="shipper-detail-topbar">
          <button type="button" className="shipper-back-btn" onClick={onBackToHome}>
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Content */}
        <div className="shipper-content-scroll" style={{ paddingBottom: '5.5rem' }}>
          <h2 className="shipper-detail-title" style={{ marginBottom: '1.25rem' }}>Courier Profile</h2>

          {/* Profile Card */}
          <div className="shipper-profile-card">
            <div className="shipper-profile-avatar-wrap">
              <div className="shipper-profile-avatar">
                <UserIcon size={38} color="#d4af37" />
              </div>
              <div className="shipper-profile-check">
                <ShieldCheck size={14} color="#000" />
              </div>
            </div>

            <div className="shipper-profile-name">{fullName}</div>
            <div className="shipper-profile-id">STAFF ID: <strong>{staffId}</strong></div>

            <div className="shipper-divider" />

            <div className="shipper-profile-badge">
              <ShieldCheck size={14} color="#d4af37" />
              <span>VERIFIED URBAN WINE COURIER</span>
            </div>
          </div>

          {/* Shift & Availability */}
          <div className="shipper-section-head">
            <span className="shipper-section-title">Shift & availability</span>
            <span className="shipper-priority-tag">DUTY SETTINGS</span>
          </div>

          <div className="shipper-detail-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                  <span className={isOnDuty ? 'shipper-duty-dot' : ''} style={{ background: isOnDuty ? '#22c55e' : '#8b857d' }} />
                  <span>{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8b857d', marginTop: '2px' }}>
                  {isOnDuty ? 'Sẵn sàng nhận các đơn rượu cao cấp' : 'Tạm dừng nhận đơn mới'}
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                className={`shipper-toggle-switch ${isOnDuty ? 'active' : ''}`}
                onClick={() => setIsOnDuty(!isOnDuty)}
              >
                <span className="shipper-toggle-knob" />
              </button>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#8b857d', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.85rem', paddingTop: '0.65rem', display: 'flex', gap: '0.45rem' }}>
              <Sparkles size={14} color="#d4af37" style={{ flexShrink: 0 }} />
              <span>Khi bật On Duty, điều phối viên có thể thấy bạn trực tuyến và gán đơn hàng.</span>
            </div>
          </div>

          {/* Account Settings */}
          <div className="shipper-section-head">
            <span className="shipper-section-title">Account settings</span>
          </div>

          <div className="shipper-menu-group">
            <div 
              className="shipper-menu-item" 
              onClick={() => {
                setCustomAlert({
                  isOpen: true,
                  type: 'WARNING',
                  title: 'Báo nghỉ ca khẩn cấp',
                  message: 'Yêu cầu xin nghỉ ca đột xuất của bạn đã được chuyển tới Điều phối viên cửa hàng. Vui lòng chờ xác nhận qua điện thoại.',
                  onConfirm: () => {},
                });
              }}
            >
              <div className="shipper-menu-icon" style={{ background: 'rgba(229,190,62,0.1)', color: '#e5be3e' }}>
                <Calendar size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Request Emergency Shift Leave</div>
                <div style={{ fontSize: '0.7rem', color: '#8b857d' }}>Báo nghỉ ca khẩn cấp với điều phối</div>
              </div>
            </div>

            <div 
              className="shipper-menu-item" 
              onClick={() => {
                setCustomAlert({
                  isOpen: true,
                  type: 'INFO',
                  title: 'Đổi mật khẩu',
                  message: 'Để đổi mật khẩu tài khoản giao hàng, vui lòng liên hệ Bộ phận Kỹ thuật / Quản lý cửa hàng hoặc sử dụng cổng bảo mật quản trị.',
                  onConfirm: () => {},
                });
              }}
            >
              <div className="shipper-menu-icon" style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37' }}>
                <KeyRound size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Change Password</div>
                <div style={{ fontSize: '0.7rem', color: '#8b857d' }}>Bảo mật tài khoản giao hàng</div>
              </div>
            </div>

            {/* Nút Đăng xuất */}
            <div 
              className="shipper-menu-item" 
              onClick={() => {
                setCustomAlert({
                  isOpen: true,
                  type: 'WARNING',
                  title: 'Đăng xuất ca làm việc',
                  message: 'Bạn có chắc chắn muốn đăng xuất khỏi ca làm việc hiện tại không? Hệ thống sẽ tạm dừng phân bổ đơn mới cho bạn.',
                  showCancel: true,
                  confirmText: 'Đăng xuất',
                  onConfirm: () => onLogout(),
                });
              }} 
              style={{ borderBottom: 'none' }}
            >
              <div className="shipper-menu-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <LogOut size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>Đăng xuất / Kết thúc ca</div>
                <div style={{ fontSize: '0.7rem', color: '#8b857d' }}>Rời khỏi phiên làm việc hiện tại</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <nav className="shipper-bottom-nav">
          <button type="button" className="shipper-nav-item" onClick={onBackToHome}>
            <HomeIcon size={19} />
            <span>Home</span>
          </button>
          <button type="button" className="shipper-nav-item" onClick={onNavigateToOrders}>
            <Package size={19} />
            <span>Orders</span>
          </button>
          <button type="button" className="shipper-nav-item active">
            <UserIcon size={19} />
            <span>Profile</span>
          </button>
        </nav>

        {/* Custom Confirmation Popup Modal */}
        <ShipperConfirmModal
          isOpen={customAlert.isOpen}
          type={customAlert.type}
          title={customAlert.title}
          message={customAlert.message}
          showCancel={customAlert.showCancel}
          confirmText={customAlert.confirmText}
          onConfirm={customAlert.onConfirm}
          onClose={() => setCustomAlert((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
};
