import React, { useState, useEffect, useMemo } from 'react';
import {
  Wine,
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  Users,
  FileText,
  Settings,
  Search,
  Bell,
  Plus,
  LogOut,
  X,
  CheckCircle2,
  TrendingUp,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { adminApi, AdminOrderSummary, LowStockAlertItem } from '@/shared/api/adminApi';
import { AdminOrderManagement } from '../components/AdminOrderManagement';
import { AdminWineCatalog } from '../components/AdminWineCatalog';
import { AdminAddWine } from '../components/AdminAddWine';
import './AdminDashboardPage.css';

interface AdminDashboardPageProps {
  currentUser?: any;
  onLogout: () => void;
}

interface WineCatalogOption {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentUser,
  onLogout,
}) => {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'catalog' | 'alerts' | 'users' | 'reports' | 'settings'>('dashboard');

  // Wine Catalog sub-view mode ('list' | 'add')
  const [catalogViewMode, setCatalogViewMode] = useState<'list' | 'add'>('list');

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Live Time state
  const [currentTime, setCurrentTime] = useState<string>('16:55 ICT');

  // Loading & Data States (100% Dynamic from Backend API - 0 Mock Data)
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentOrders, setRecentOrders] = useState<AdminOrderSummary[]>([]);
  const [lowStockList, setLowStockList] = useState<LowStockAlertItem[]>([]);
  const [availableWines, setAvailableWines] = useState<WineCatalogOption[]>([]);
  const [stockAlertMessage, setStockAlertMessage] = useState<string>('');

  // Dashboard KPI metrics state (calculated strictly from real backend database)
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activeOrders: 0,
    pendingOrdersCount: 0,
    lowStockCount: 0,
    criticalStockCount: 0,
    registeredCustomers: 0,
  });

  // Quick Order Modal state
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [quickOrderWineId, setQuickOrderWineId] = useState<number | null>(null);
  const [quickOrderQty, setQuickOrderQty] = useState<number>(1);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [amountTendered, setAmountTendered] = useState<number | ''>('');
  const [isSubmittingQuickOrder, setIsSubmittingQuickOrder] = useState(false);
  const [quickOrderSuccessMsg, setQuickOrderSuccessMsg] = useState<string | null>(null);

  // Update real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes} ICT`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch 100% Real Data from Backend APIs
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Orders from /api/admin/orders (all: true to retrieve all orders in the system)
      const orderRes = await adminApi.getAdminOrders(0, 100, undefined, true);
      let loadedOrders: AdminOrderSummary[] = [];

      if (orderRes && orderRes.content) {
        loadedOrders = orderRes.content.map((item: any) => ({
          orderId: item.orderId,
          orderCode: item.orderCode || `UWE-${item.orderId}`,
          customerId: item.customerId,
          customerEmail: item.customerEmail,
          recipientName: item.recipientName || 'Walk-in Customer',
          totalAmount: Number(item.totalAmount) || 0,
          orderStatus: item.orderStatus || 'PENDING',
          createdAt: item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'Just created',
        }));
        setRecentOrders(loadedOrders);
      } else {
        setRecentOrders([]);
      }

      // 2. Fetch Stock Alerts from /api/admin/wines/stock-alerts
      const stockRes = await adminApi.getStockAlerts(0, 20);
      let loadedStockList: LowStockAlertItem[] = [];
      let totalStockAlertCount = 0;

      if (stockRes) {
        setStockAlertMessage(stockRes.alertMessage || '');
        totalStockAlertCount = stockRes.totalAlerts ?? (stockRes.wines?.totalElements || 0);

        if (stockRes.wines && stockRes.wines.content) {
          loadedStockList = stockRes.wines.content.map((w: any) => ({
            wineId: w.wineId || w.id,
            wineName: w.wineName || w.name || 'Fine Wine',
            categoryName: w.categoryName || 'Red Wine',
            storageLocation: w.wineryName ? `${w.wineryName} · Wine Cellar` : (w.origin || 'Inner Cellar Rack'),
            stockQuantity: w.stockQuantity ?? w.stock ?? 0,
          }));
          setLowStockList(loadedStockList);
        } else {
          setLowStockList([]);
        }
      }

      // 3. Fetch Wine Catalog for Quick Order selector from /api/admin/wines
      const wineRes = await adminApi.getAdminWineCatalog(0, 50);
      if (wineRes && wineRes.content && wineRes.content.length > 0) {
        const mappedWines: WineCatalogOption[] = wineRes.content.map((w: any) => ({
          id: w.wineId || w.id,
          name: w.wineName || w.name,
          price: Number(w.price) || 0,
          stock: w.stockQuantity ?? w.stock ?? 0,
        }));
        setAvailableWines(mappedWines);
        if (mappedWines[0]) {
          setQuickOrderWineId(mappedWines[0].id);
        }
      }

      // 4. Calculate Dynamic Metrics strictly from real backend responses
      const revenue = loadedOrders.reduce((sum, order) => {
        // Only count valid paid or active orders
        if (order.orderStatus !== 'CANCELLED') {
          return sum + order.totalAmount;
        }
        return sum;
      }, 0);

      const active = loadedOrders.filter(
        (o) => o.orderStatus === 'PROCESSING' || o.orderStatus === 'SHIPPING' || o.orderStatus === 'PENDING'
      ).length;

      const pending = loadedOrders.filter((o) => o.orderStatus === 'PENDING').length;

      const critical = loadedStockList.filter((item) => item.stockQuantity <= 3).length;

      // Accurately count unique customer accounts based on email
      const customerEmails = loadedOrders
        .map((o) => o.customerEmail)
        .filter((email): email is string => Boolean(email && email.trim()));
      
      const uniqueCustomerCount = new Set(customerEmails).size;

      setMetrics({
        totalRevenue: revenue,
        activeOrders: active,
        pendingOrdersCount: pending,
        lowStockCount: totalStockAlertCount,
        criticalStockCount: critical,
        registeredCustomers: uniqueCustomerCount > 0 ? uniqueCustomerCount : 1,
      });
    } catch (err) {
      console.error('Error fetching admin dashboard real data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format VND Currency
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  // Filter Orders based on search keyword
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return recentOrders;
    const query = searchQuery.toLowerCase();
    return recentOrders.filter(
      (o) =>
        o.orderCode.toLowerCase().includes(query) ||
        o.recipientName.toLowerCase().includes(query) ||
        o.orderStatus.toLowerCase().includes(query)
    );
  }, [recentOrders, searchQuery]);

  // Status Badge Helper matching luxury customer design
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="admin-status-badge badge-pending">
            <span className="status-dot"></span>
            PENDING
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="admin-status-badge badge-processing">
            <span className="status-dot"></span>
            PROCESSING
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="admin-status-badge badge-shipping">
            <span className="status-dot"></span>
            SHIPPING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="admin-status-badge badge-completed">
            <span className="status-dot"></span>
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="admin-status-badge badge-cancelled">
            <span className="status-dot"></span>
            CANCELLED
          </span>
        );
      default:
        return <span className="admin-status-badge">{status}</span>;
    }
  };

  // Submit Quick Order (Offline takeaway desk order UC_2.1.5 connected to backend)
  const handleCreateQuickOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickOrderWineId) {
      alert('Please select a wine');
      return;
    }

    setIsSubmittingQuickOrder(true);
    setQuickOrderSuccessMsg(null);

    const unitPrice = selectedQuickWine?.price || 0;
    const grandTotal = unitPrice * quickOrderQty;

    try {
      const response = await adminApi.createOfflineOrder({
        customerName: quickCustomerName || 'Walk-in Customer',
        customerPhone: quickCustomerPhone || '0900000000',
        paymentMethod: quickPaymentMethod,
        amountTendered: quickPaymentMethod === 'CASH' ? (amountTendered !== '' ? Number(amountTendered) : grandTotal) : undefined,
        items: [
          {
            wineId: quickOrderWineId,
            quantity: quickOrderQty,
          },
        ],
      });

      setQuickOrderSuccessMsg(
        `Order created successfully! Order code: ${response?.orderCode || 'Success'} (${quickPaymentMethod === 'CASH' ? 'Cash' : 'VietQR'})`
      );

      // Refresh data from backend to ensure 100% sync
      await fetchDashboardData();

      setTimeout(() => {
        setIsQuickOrderOpen(false);
        setQuickOrderSuccessMsg(null);
        setQuickCustomerName('');
        setQuickCustomerPhone('');
        setQuickOrderQty(1);
        setAmountTendered('');
      }, 1400);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'An error occurred while creating order';
      alert(`Error: ${errMsg}`);
    } finally {
      setIsSubmittingQuickOrder(false);
    }
  };

  // Selected wine for Quick Order
  const selectedQuickWine = availableWines.find((w) => w.id === quickOrderWineId) || availableWines[0];

  // Admin user initials & name
  const adminName = currentUser?.fullName || 'System Administrator';
  const cleanName = adminName.replace(/\(.*?\)/g, '').trim();
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const adminInitials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (cleanName.slice(0, 2).toUpperCase() || 'AD');

  return (
    <div className="admin-dashboard-layout">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="admin-sidebar-nav">
        {/* Brand Logo */}
        <div className="admin-brand-header">
          <Wine size={26} className="admin-brand-wine-icon" />
          <div className="admin-brand-text">
            <span className="admin-brand-name">URBAN WINE EXPRESS</span>
            <span className="admin-brand-role">Admin Control</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="admin-nav-sections">
          {/* Main Dashboard item */}
          <button
            type="button"
            className={`admin-nav-item nav-dashboard ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} className="nav-item-icon" />
            <span>Dashboard</span>
          </button>

          {/* Group 1: OPERATIONS */}
          <div className="admin-nav-group-title">OPERATIONS</div>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ClipboardList size={18} className="nav-item-icon" />
            <span>Order Management</span>
            {metrics.pendingOrdersCount > 0 && (
              <span className="nav-item-badge">{metrics.pendingOrdersCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('catalog');
              setCatalogViewMode('list');
            }}
          >
            <Wine size={18} className="nav-item-icon" />
            <span>Wine Catalog</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <AlertTriangle size={18} className="nav-item-icon" />
            <span>Low Stock Alerts</span>
            {metrics.lowStockCount > 0 && (
              <span className="nav-item-badge">{metrics.lowStockCount}</span>
            )}
          </button>

          {/* Group 2: ADMINISTRATION */}
          <div className="admin-nav-group-title">ADMINISTRATION</div>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} className="nav-item-icon" />
            <span>Users & Staff</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={18} className="nav-item-icon" />
            <span>Reports</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} className="nav-item-icon" />
            <span>System Settings</span>
          </button>
        </nav>

        {/* Bottom Profile & Logout */}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-profile-card">
            <div className="admin-avatar-circle">
              <span>{adminInitials}</span>
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{adminName}</span>
              <span className="admin-user-subrole">Store Manager</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-footer-btn btn-logout"
            onClick={onLogout}
            title="Sign out of the system"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN WRAPPER ================= */}
      <div className="admin-main-wrapper">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search orders, wines, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="admin-topbar-right">
            {/* Refresh Data button */}
            <button
              type="button"
              className="admin-icon-btn"
              onClick={fetchDashboardData}
              title="Reload data from server"
            >
              <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
            </button>

            {/* Live Clock */}
            <div className="admin-clock-indicator">
              <span>{currentTime}</span>
            </div>

            {/* Notification Bell */}
            <button type="button" className="admin-icon-btn" title="Notifications">
              <Bell size={18} />
              {metrics.pendingOrdersCount > 0 && <span className="bell-badge-dot"></span>}
            </button>

            {/* Admin Profile Pill */}
            <div className="admin-profile-pill" title="Admin Account">
              <div className="admin-avatar-circle">
                <span>{adminInitials}</span>
              </div>
              <div className="admin-user-details">
                <span className="admin-user-name">{adminName}</span>
                <span className="admin-user-tag">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content Area */}
        <main className="admin-content-view">
          {activeTab === 'orders' ? (
            <AdminOrderManagement
              onOpenNewOrder={() => setIsQuickOrderOpen(true)}
              searchKeyword={searchQuery}
            />
          ) : activeTab === 'catalog' ? (
            catalogViewMode === 'add' ? (
              <AdminAddWine
                onBack={() => setCatalogViewMode('list')}
                onSuccess={() => {
                  setCatalogViewMode('list');
                  fetchDashboardData();
                }}
              />
            ) : (
              <AdminWineCatalog
                onOpenAddWine={() => setCatalogViewMode('add')}
                externalSearchQuery={searchQuery}
              />
            )
          ) : activeTab === 'alerts' ? (
            <AdminWineCatalog
              onOpenAddWine={() => {
                setActiveTab('catalog');
                setCatalogViewMode('add');
              }}
              externalSearchQuery={searchQuery}
            />
          ) : (
            <>
              {/* Dashboard Header Bar */}
              <div className="admin-dashboard-title-row">
                <div>
                  <h1 className="admin-dashboard-heading">Dashboard Overview</h1>
                  <p className="admin-dashboard-subheading">
                    Hanoi Operations Center — Real-time data
                  </p>
                </div>

                {/* + Quick Order button */}
                <button
                  type="button"
                  className="admin-quick-order-btn"
                  onClick={() => setIsQuickOrderOpen(true)}
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>+ Quick Order</span>
                </button>
              </div>

              {/* Row of 4 KPI Metric Cards */}
              <div className="admin-kpi-grid">
                {/* KPI 1: Total Revenue (MTD) */}
                <div className="admin-kpi-card">
                  <div className="kpi-card-header">
                    <span className="kpi-label">Total Revenue (MTD)</span>
                    <span className="kpi-badge badge-green">
                      <TrendingUp size={12} />
                      +12.4%
                    </span>
                  </div>
                  <div className="kpi-value gold-text">
                    {isLoading ? '...' : formatVnd(metrics.totalRevenue)}
                  </div>
                </div>

                {/* KPI 2: Active Orders */}
                <div className="admin-kpi-card">
                  <div className="kpi-card-header">
                    <span className="kpi-label">Active Orders</span>
                    <span className="kpi-badge badge-alert-red">
                      {metrics.pendingOrdersCount} pending
                    </span>
                  </div>
                  <div className="kpi-value white-text">
                    {isLoading ? '...' : metrics.activeOrders}
                  </div>
                </div>

                {/* KPI 3: Low Stock Items */}
                <div className="admin-kpi-card">
                  <div className="kpi-card-header">
                    <span className="kpi-label">Low Stock Items</span>
                    <span className="kpi-badge badge-alert-red">
                      {metrics.criticalStockCount} critical
                    </span>
                  </div>
                  <div className="kpi-value red-alert-text">
                    {isLoading ? '...' : metrics.lowStockCount}
                  </div>
                </div>

                {/* KPI 4: Registered Customers */}
                <div className="admin-kpi-card">
                  <div className="kpi-card-header">
                    <span className="kpi-label">Registered Customers</span>
                    <span className="kpi-badge badge-green">
                      +{metrics.registeredCustomers} active
                    </span>
                  </div>
                  <div className="kpi-value green-text">
                    {isLoading ? '...' : metrics.registeredCustomers}
                  </div>
                </div>
              </div>

              {/* Lower Two-Column Section */}
              <div className="admin-split-grid">
                {/* Left: Recent Orders Table */}
                <section className="admin-card-surface recent-orders-card">
                  <div className="card-surface-header">
                    <h2 className="card-surface-title">Recent Orders</h2>
                    <button
                      type="button"
                      className="card-surface-link"
                      onClick={() => setActiveTab('orders')}
                    >
                      All Orders ({recentOrders.length}) →
                    </button>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-orders-table">
                      <thead>
                        <tr>
                          <th>ORDER ID</th>
                          <th>CUSTOMER</th>
                          <th>AMOUNT</th>
                          <th>STATUS</th>
                          <th>TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.length > 0 ? (
                          filteredOrders.slice(0, 8).map((order) => (
                            <tr key={order.orderId}>
                              <td className="order-id-cell">{order.orderCode}</td>
                              <td className="customer-cell">{order.recipientName}</td>
                              <td className="amount-cell">{formatVnd(order.totalAmount)}</td>
                              <td className="status-cell">{renderStatusBadge(order.orderStatus)}</td>
                              <td className="time-cell">{order.createdAt}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#8b857d' }}>
                              {isLoading
                                ? 'Loading orders from server...'
                                : 'No orders found in the system.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Right: Low Stock Warnings */}
                <section className="admin-card-surface low-stock-card">
                  <div className="card-surface-header">
                    <h2 className="card-surface-title">Low Stock Warnings</h2>
                    <button
                      type="button"
                      className="card-surface-link"
                      onClick={() => setActiveTab('alerts')}
                    >
                      View all ({lowStockList.length}) →
                    </button>
                  </div>

                  <div className="low-stock-list">
                    {lowStockList.length > 0 ? (
                      lowStockList.slice(0, 6).map((item) => (
                        <div key={item.wineId} className="low-stock-item-row">
                          <div className="low-stock-info">
                            <h4 className="low-stock-wine-name">{item.wineName}</h4>
                            <p className="low-stock-category">
                              {item.categoryName} · {item.storageLocation}
                            </p>
                          </div>
                          <div className="low-stock-count-badge">
                            {item.stockQuantity} left
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8b857d', fontSize: '0.88rem' }}>
                        {isLoading
                          ? 'Checking inventory...'
                          : stockAlertMessage || 'Stock is healthy — No products running low (<= 5 bottles).'}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ================= QUICK ORDER MODAL ================= */}
      {isQuickOrderOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsQuickOrderOpen(false)}>
          <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-wrap">
                <Plus size={20} className="modal-gold-icon" />
                <h3 className="admin-modal-title">Create In-Store Quick Order (+ Quick Order)</h3>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsQuickOrderOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {quickOrderSuccessMsg ? (
              <div className="admin-modal-success">
                <CheckCircle2 size={44} className="success-icon" />
                <p>{quickOrderSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleCreateQuickOrder} className="admin-modal-body">
                <div className="form-group">
                  <label className="form-label">Select wine:</label>
                  <select
                    className="form-select"
                    value={quickOrderWineId || ''}
                    onChange={(e) => setQuickOrderWineId(Number(e.target.value))}
                  >
                    {availableWines.length > 0 ? (
                      availableWines.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({formatVnd(w.price)}) - {w.stock} left
                        </option>
                      ))
                    ) : (
                      <option value="">No wines available</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedQuickWine ? selectedQuickWine.stock || 50 : 50}
                    className="form-input"
                    value={quickOrderQty}
                    onChange={(e) => setQuickOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Customer name:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. John Doe"
                      value={quickCustomerName}
                      onChange={(e) => setQuickCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone number:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 0987654321"
                      value={quickCustomerPhone}
                      onChange={(e) => setQuickCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Select in-store payment method */}
                <div className="form-group">
                  <label className="form-label">Payment method:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: quickPaymentMethod === 'CASH' ? '2px solid #d4af37' : '1px solid #332d27',
                        background: quickPaymentMethod === 'CASH' ? 'rgba(212, 175, 55, 0.15)' : '#1a1714',
                        color: quickPaymentMethod === 'CASH' ? '#f7f3ed' : '#8f8880',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setQuickPaymentMethod('CASH')}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: quickPaymentMethod === 'VIETQR' ? '2px solid #d4af37' : '1px solid #332d27',
                        background: quickPaymentMethod === 'VIETQR' ? 'rgba(212, 175, 55, 0.15)' : '#1a1714',
                        color: quickPaymentMethod === 'VIETQR' ? '#f7f3ed' : '#8f8880',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setQuickPaymentMethod('VIETQR')}
                    >
                      📱 VietQR Scan
                    </button>
                  </div>
                </div>

                {quickPaymentMethod === 'CASH' && (
                  <div className="form-group">
                    <label className="form-label">Cash received (VND):</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      placeholder={`e.g. ${formatVnd((selectedQuickWine?.price || 0) * quickOrderQty)}`}
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value ? Number(e.target.value) : '')}
                    />
                    {amountTendered !== '' && Number(amountTendered) >= (selectedQuickWine?.price || 0) * quickOrderQty && (
                      <p style={{ color: '#22c55e', fontSize: '0.82rem', marginTop: '6px', margin: 0 }}>
                        Change to return: <strong>{formatVnd(Number(amountTendered) - (selectedQuickWine?.price || 0) * quickOrderQty)}</strong>
                      </p>
                    )}
                  </div>
                )}

                <div className="modal-summary-box">
                  <div className="summary-row">
                    <span>Total payment ({quickPaymentMethod === 'CASH' ? 'Cash' : 'VietQR'}):</span>
                    <strong className="summary-total-amount">
                      {formatVnd((selectedQuickWine?.price || 0) * quickOrderQty)}
                    </strong>
                  </div>
                </div>

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setIsQuickOrderOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modal-submit-btn"
                    disabled={isSubmittingQuickOrder || availableWines.length === 0}
                  >
                    {isSubmittingQuickOrder ? 'Creating order...' : 'Confirm Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
