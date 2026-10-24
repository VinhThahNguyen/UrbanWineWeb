import React, { useState, useEffect } from 'react';
import { Wine, X, Eye, EyeOff, ShieldAlert, ArrowLeft, Calendar, CheckCircle } from 'lucide-react';
import { authApi } from '@/shared/api/authApi';
import './AuthModal.css';

export type AuthView =
  | 'CUSTOMER_SIGNIN'
  | 'CUSTOMER_REGISTER'
  | 'CUSTOMER_LOGIN_OTP'
  | 'REGISTER_OTP'
  | 'FORGOT_PASSWORD'
  | 'RESET_PASSWORD'
  | 'STAFF_LOGIN';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
  onLoginSuccess?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialView = 'CUSTOMER_SIGNIN',
  onLoginSuccess,
}) => {
  const [view, setView] = useState<AuthView>(initialView);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Staff state
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // OTP State (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(285); // 04:45 in seconds

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync initial view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialView]);

  // Countdown timer for OTP
  useEffect(() => {
    if (!['CUSTOMER_LOGIN_OTP', 'REGISTER_OTP', 'FORGOT_PASSWORD'].includes(view)) return;
    if (otpTimer <= 0) return;

    const timer = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [view, otpTimer]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const getFullOtp = () => otpDigits.join('');

  // 1. Submit Customer Sign In
  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      if ('requiresOtp' in res && res.requiresOtp) {
        // Customer 2FA enabled: Switch to OTP verification
        setOtpTimer(285);
        setOtpDigits(['', '', '', '', '', '']);
        setView('CUSTOMER_LOGIN_OTP');
      } else {
        localStorage.setItem('urbanwine_token', (res as any).accessToken);
        localStorage.setItem('urbanwine_user', JSON.stringify(res));
        if (onLoginSuccess) onLoginSuccess(res);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Customer 2FA OTP
  const handleVerifyCustomerLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const otpCode = getFullOtp();
    if (otpCode.length < 6) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số OTP');
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.verifyLoginOtp({ email, otpCode });
      localStorage.setItem('urbanwine_token', res.accessToken);
      localStorage.setItem('urbanwine_user', JSON.stringify(res));
      if (onLoginSuccess) onLoginSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Customer Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!birthDate) {
      setErrorMsg('Vui lòng chọn ngày sinh để xác nhận từ 18 tuổi trở lên (Quy định BR-01)');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        email,
        password,
        fullName,
        phone,
        birthDate,
      });
      setOtpTimer(285);
      setOtpDigits(['', '', '', '', '', '']);
      setView('REGISTER_OTP');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Đăng ký không thành công. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Register OTP Activation
  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const otpCode = getFullOtp();
    try {
      await authApi.verifyRegisterOtp({ email, otpCode });
      setSuccessMsg('Kích hoạt tài khoản thành công! Bây giờ bạn có thể đăng nhập.');
      setView('CUSTOMER_SIGNIN');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  // 5. Send Forgot Password OTP
  const handleSendForgotPasswordOtp = async () => {
    if (!email) {
      setErrorMsg('Vui lòng nhập địa chỉ email');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setOtpTimer(285);
      setSuccessMsg('Mã OTP 6 số đã được gửi tới email của bạn!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Không tìm thấy tài khoản với email này');
    } finally {
      setLoading(false);
    }
  };

  // 6. Verify Forgot Password Code & Proceed to Set Password
  const handleVerifyForgotCode = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = getFullOtp();
    if (otpCode.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số OTP');
      return;
    }
    setErrorMsg(null);
    setView('RESET_PASSWORD');
  };

  // 7. Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    setLoading(true);
    try {
      const otpCode = getFullOtp();
      await authApi.resetPassword({
        email,
        otpCode,
        newPassword,
        confirmPassword,
      });
      setSuccessMsg('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setView('CUSTOMER_SIGNIN');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  // 8. Staff Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // Backend chấp nhận email nhân viên nội bộ
      const res = await authApi.login({
        email: staffUsername,
        password: staffPassword,
      });

      if ('requiresOtp' in res && res.requiresOtp) {
        setErrorMsg('Tài khoản này không phải là nhân viên nội bộ hợp lệ.');
      } else {
        const staffRes = res as any;
        localStorage.setItem('urbanwine_token', staffRes.accessToken);
        localStorage.setItem('urbanwine_user', JSON.stringify(staffRes));
        if (onLoginSuccess) onLoginSuccess(staffRes);
        onClose();
        alert(`Chào mừng nhân viên ${staffRes.fullName || staffRes.email}! Vai trò: ${staffRes.role}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Thông tin đăng nhập nhân viên không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="auth-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        {/* -------------------- VIEW 1: CUSTOMER SIGN IN (Ảnh 1) -------------------- */}
        {view === 'CUSTOMER_SIGNIN' && (
          <div>
            <div className="auth-header">
              <Wine className="auth-logo-icon" size={32} />
              <div className="auth-brand-text">
                <span className="auth-welcome">Welcome to</span>
                <span className="auth-brand-name">Urban Wine Express</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button className="auth-tab-btn active">Customer Sign In</button>
              <button
                className="auth-tab-btn"
                onClick={() => {
                  setErrorMsg(null);
                  setView('CUSTOMER_REGISTER');
                }}
              >
                Create Account
              </button>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}
            {successMsg && <div className="auth-success-banner">{successMsg}</div>}

            <form onSubmit={handleCustomerSignIn} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address (Username) *</label>
                <input
                  type="email"
                  required
                  placeholder="vinh123@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="form-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-forgot-row">
                <span
                  className="link-forgot"
                  onClick={() => {
                    setErrorMsg(null);
                    setView('FORGOT_PASSWORD');
                  }}
                >
                  Forgot password?
                </span>
              </div>

              <button type="submit" disabled={loading} className="btn-auth-primary">
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>

            {/* Footer link to Staff Login */}
            <div className="auth-switch-footer">
              <span>Are you a store employee?</span>
              <span
                className="auth-switch-link"
                onClick={() => {
                  setErrorMsg(null);
                  setView('STAFF_LOGIN');
                }}
              >
                Log in as Store Staff
              </span>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 2: CREATE ACCOUNT (Ảnh 4) -------------------- */}
        {view === 'CUSTOMER_REGISTER' && (
          <div>
            <div className="auth-header">
              <Wine className="auth-logo-icon" size={32} />
              <div className="auth-brand-text">
                <span className="auth-welcome">Welcome to</span>
                <span className="auth-brand-name">Urban Wine Express</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button
                className="auth-tab-btn"
                onClick={() => {
                  setErrorMsg(null);
                  setView('CUSTOMER_SIGNIN');
                }}
              >
                Customer Sign In
              </button>
              <button className="auth-tab-btn active">Create Account</button>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            <form onSubmit={handleRegister} className="auth-form">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập họ và tên đầy đủ..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="Nhập số điện thoại (10 chữ số)..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Username) *</label>
                <input
                  type="email"
                  required
                  placeholder="vinh123@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="form-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <div className="form-input-wrapper">
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="form-input"
                  />
                  <span className="input-icon-btn" style={{ pointerEvents: 'none' }}>
                    <Calendar size={16} />
                  </span>
                </div>
                <span className="form-hint">Must be 18 years or older to register</span>
              </div>

              <button type="submit" disabled={loading} className="btn-auth-primary">
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className="auth-switch-footer">
              <span>Are you a store employee?</span>
              <span
                className="auth-switch-link"
                onClick={() => {
                  setErrorMsg(null);
                  setView('STAFF_LOGIN');
                }}
              >
                Log in as Store Staff
              </span>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 3: FORGOT PASSWORD (Ảnh 2) -------------------- */}
        {view === 'FORGOT_PASSWORD' && (
          <div>
            <div
              className="auth-back-link"
              onClick={() => {
                setErrorMsg(null);
                setView('CUSTOMER_SIGNIN');
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </div>

            <div className="auth-header">
              <Wine className="auth-logo-icon" size={28} />
              <div className="auth-brand-text">
                <span className="auth-welcome">Welcome to</span>
                <span className="auth-brand-name">Urban Wine Express</span>
              </div>
            </div>

            <h2 className="auth-view-title">Forgot Password</h2>
            <p className="auth-view-desc">
              Enter your registered email to receive a 6-digit OTP code.
            </p>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}
            {successMsg && <div className="auth-success-banner">{successMsg}</div>}

            <div className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="vinh123@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="button"
                onClick={handleSendForgotPasswordOtp}
                disabled={loading || !email}
                className="btn-secondary-action"
              >
                {loading ? 'SENDING...' : 'SEND OTP CODE'}
              </button>

              <form onSubmit={handleVerifyForgotCode} className="otp-container">
                <label className="form-label">Verification Code (6-digit OTP) *</label>
                <div className="otp-inputs-grid">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-input-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="otp-digit-input"
                    />
                  ))}
                </div>

                <div className="otp-timer-row">
                  <span>
                    Expires in: <strong className="otp-expires-badge">{formatTimer(otpTimer)}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={otpTimer > 0}
                    onClick={handleSendForgotPasswordOtp}
                    className="btn-resend-link"
                  >
                    Didn't receive code? Resend
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={getFullOtp().length < 6}
                  className="btn-auth-primary"
                >
                  VERIFY CODE
                </button>
              </form>
            </div>

            <p className="auth-footer-caption">
              A 6-digit code has been dispatched to your mailbox.
            </p>
          </div>
        )}

        {/* -------------------- VIEW 4: SET NEW PASSWORD (Ảnh 3) -------------------- */}
        {view === 'RESET_PASSWORD' && (
          <div>
            <div className="auth-header">
              <Wine className="auth-logo-icon" size={28} />
              <div className="auth-brand-text">
                <span className="auth-welcome">Welcome to</span>
                <span className="auth-brand-name">Urban Wine Express</span>
              </div>
            </div>

            <h2 className="auth-view-title">Set New Password</h2>
            <div className="auth-success-banner">
              <CheckCircle size={14} />
              <span>Email Verified Successfully</span>
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-group">
                <label className="form-label">New Password *</label>
                <div className="form-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="form-hint">Must be at least 8 characters</span>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password *</label>
                <div className="form-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-auth-primary">
                {loading ? 'RESETTING...' : 'RESET PASSWORD'}
              </button>
            </form>

            <div className="auth-switch-footer">
              <span>Remember password?</span>
              <span
                className="auth-switch-link"
                onClick={() => {
                  setErrorMsg(null);
                  setView('CUSTOMER_SIGNIN');
                }}
              >
                Back to Login
              </span>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 5: STORE STAFF LOGIN (Ảnh 5) -------------------- */}
        {view === 'STAFF_LOGIN' && (
          <div>
            <div
              className="auth-back-link"
              onClick={() => {
                setErrorMsg(null);
                setView('CUSTOMER_SIGNIN');
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Customer Login</span>
            </div>

            <div className="auth-header">
              <Wine className="auth-logo-icon" size={28} />
              <div className="auth-brand-text">
                <span className="auth-welcome">Welcome to</span>
                <span className="auth-brand-name">Urban Wine Express</span>
              </div>
            </div>

            <div className="staff-badge">
              <ShieldAlert size={12} />
              <span>INTERNAL ACCESS ONLY</span>
            </div>

            <h2 className="auth-view-title">Store Staff Login</h2>
            <p className="auth-view-desc">Restricted to authorized Urban Wine Express employees</p>

            <div className="staff-warning-box">
              This portal is for Urban Wine Express employees only. Unauthorized access attempts
              are logged and may result in legal action.
            </div>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            <form onSubmit={handleStaffLogin} className="auth-form">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="staff.username or email@urbanwine.com"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="form-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Staff password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-auth-staff">
                {loading ? 'LOGGING IN...' : 'STAFF LOGIN'}
              </button>
            </form>
          </div>
        )}

        {/* -------------------- VIEW 6: CUSTOMER 2FA OTP MODAL -------------------- */}
        {view === 'CUSTOMER_LOGIN_OTP' && (
          <div>
            <div
              className="auth-back-link"
              onClick={() => {
                setErrorMsg(null);
                setView('CUSTOMER_SIGNIN');
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </div>

            <div className="auth-header">
              <Wine className="auth-logo-icon" size={28} />
              <div className="auth-brand-text">
                <span className="auth-welcome">Welcome to</span>
                <span className="auth-brand-name">Urban Wine Express</span>
              </div>
            </div>

            <h2 className="auth-view-title">Two-Factor Authentication</h2>
            <p className="auth-view-desc">
              A 6-digit OTP code has been sent to <strong>{email}</strong> for secure customer sign-in.
            </p>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            <form onSubmit={handleVerifyCustomerLoginOtp} className="otp-container">
              <label className="form-label">Enter 6-digit OTP *</label>
              <div className="otp-inputs-grid">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-input-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="otp-digit-input"
                  />
                ))}
              </div>

              <div className="otp-timer-row">
                <span>
                  Expires in: <strong className="otp-expires-badge">{formatTimer(otpTimer)}</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || getFullOtp().length < 6}
                className="btn-auth-primary"
              >
                {loading ? 'VERIFYING...' : 'CONFIRM & SIGN IN'}
              </button>
            </form>
          </div>
        )}

        {/* -------------------- VIEW 7: REGISTER OTP ACTIVATION -------------------- */}
        {view === 'REGISTER_OTP' && (
          <div>
            <div className="auth-header">
              <Wine className="auth-logo-icon" size={28} />
              <div className="auth-brand-text">
                <span className="auth-welcome">Welcome to</span>
                <span className="auth-brand-name">Urban Wine Express</span>
              </div>
            </div>

            <h2 className="auth-view-title">Verify & Activate Account</h2>
            <p className="auth-view-desc">
              We have sent a verification code to <strong>{email}</strong>. Please enter the OTP below to activate your account.
            </p>

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

            <form onSubmit={handleVerifyRegisterOtp} className="otp-container">
              <label className="form-label">Activation Code (6-digit OTP) *</label>
              <div className="otp-inputs-grid">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-input-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="otp-digit-input"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || getFullOtp().length < 6}
                className="btn-auth-primary"
              >
                {loading ? 'ACTIVATING...' : 'ACTIVATE ACCOUNT'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
