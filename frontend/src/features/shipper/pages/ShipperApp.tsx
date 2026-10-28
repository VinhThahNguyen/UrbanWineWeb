import React, { useState } from 'react';
import { ShipperDashboardPage } from './ShipperDashboardPage';
import { ShipperOrderDetailPage } from './ShipperOrderDetailPage';
import { AssignedOrdersPage } from './AssignedOrdersPage';
import { ShipperProfilePage } from './ShipperProfilePage';

type ShipperTab = 'HOME' | 'ORDERS' | 'DETAIL' | 'PROFILE';

interface ShipperAppProps {
  onLogout: () => void;
}

export const ShipperApp: React.FC<ShipperAppProps> = ({ onLogout }) => {
  const [currentTab, setCurrentTab] = useState<ShipperTab>('HOME');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const handleNavigateToDetail = (orderId: number) => {
    setSelectedOrderId(orderId);
    setCurrentTab('DETAIL');
  };

  const handleBackToHome = () => {
    setCurrentTab('HOME');
  };

  const handleBackToOrders = () => {
    setCurrentTab('ORDERS');
  };

  return (
    <>
      {currentTab === 'HOME' && (
        <ShipperDashboardPage
          onNavigateToDetail={handleNavigateToDetail}
          onNavigateToOrders={() => setCurrentTab('ORDERS')}
          onNavigateToProfile={() => setCurrentTab('PROFILE')}
        />
      )}

      {currentTab === 'DETAIL' && selectedOrderId && (
        <ShipperOrderDetailPage
          orderId={selectedOrderId}
          onBack={handleBackToHome}
          onOrderCompleted={() => {
            setCurrentTab('HOME');
          }}
        />
      )}

      {currentTab === 'ORDERS' && (
        <AssignedOrdersPage
          onBackToHome={handleBackToHome}
          onSelectOrder={handleNavigateToDetail}
          onNavigateToProfile={() => setCurrentTab('PROFILE')}
        />
      )}

      {currentTab === 'PROFILE' && (
        <ShipperProfilePage
          onBackToHome={handleBackToHome}
          onNavigateToOrders={() => setCurrentTab('ORDERS')}
          onLogout={onLogout}
        />
      )}
    </>
  );
};
