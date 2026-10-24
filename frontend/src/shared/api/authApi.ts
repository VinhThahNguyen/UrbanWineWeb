import { apiClient } from '@/shared/api/client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
}

export interface VerifyOtpPayload {
  email: string;
  otpCode: string;
}

export interface ResetPasswordPayload {
  email: string;
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  role: string;
}

export interface LoginSuccessResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  email: string;
  fullName: string;
  role: string;
}

export interface LoginRequiresOtpResponse {
  requiresOtp: boolean;
  email: string;
  message: string;
}

export const authApi = {
  // 1. Đăng nhập (Dùng chung cho cả Customer và Staff)
  login: async (payload: LoginPayload): Promise<LoginSuccessResponse | LoginRequiresOtpResponse> => {
    const res = await apiClient.post('/auth/login', payload);
    return res.data;
  },

  // 2. Xác thực OTP đăng nhập dành cho Customer 2FA
  verifyLoginOtp: async (payload: VerifyOtpPayload): Promise<LoginSuccessResponse> => {
    const res = await apiClient.post('/auth/verify-login-otp', payload);
    return res.data;
  },

  // 3. Đăng ký tài khoản khách hàng (Kiểm tra 18+)
  register: async (payload: RegisterPayload) => {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },

  // 4. Xác thực OTP kích hoạt tài khoản đăng ký
  verifyRegisterOtp: async (payload: VerifyOtpPayload) => {
    const res = await apiClient.post('/auth/verify-register-otp', payload);
    return res.data;
  },

  // 5. Quên mật khẩu - gửi mã OTP
  forgotPassword: async (email: string) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  // 6. Đặt lại mật khẩu với OTP
  resetPassword: async (payload: ResetPasswordPayload) => {
    const res = await apiClient.post('/auth/reset-password', payload);
    return res.data;
  },
};
