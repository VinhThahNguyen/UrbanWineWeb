import React from 'react';
import { HomePage } from '@/features/home/pages/HomePage';

export const AppRoutes: React.FC = () => {
  return (
    <HomePage
      onSignInClick={() => {
        alert('Nút Sign In: Sẵn sàng kết nối màn hình Đăng nhập / Xác thực phân quyền!');
      }}
    />
  );
};
