import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LogOut, LayoutDashboard, Users, Briefcase, Inbox, BarChart3, User, Bell } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';
import api from '../services/api';
import socketService from '../services/socket';

const Layout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadUnreadCount();

    // Connect to socket for real-time notification updates
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);

      // Listen for new notifications
      socketService.on('notification', () => {
        loadUnreadCount();
      });
    }

    return () => {
      socketService.off('notification');
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const notifications = await api.getNotifications({ unread: true }) as any[];
      setUnreadNotifications(notifications.length);
    } catch (error) {
      console.error('Failed to load unread notifications:', error);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-3">
                <img src="/logo.png" alt="FreelanceFlow Logo" className="h-10 w-10 object-contain rounded-xl" />
                <span className="text-2xl font-bold text-purple-600">FreelanceFlow</span>
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Overview
                </Link>
                <Link
                  to="/clients"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Clients
                </Link>
                <Link
                  to="/projects"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Projects
                </Link>
                <Link
                  to="/inbox"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Inbox className="w-4 h-4 mr-2" />
                  Inbox
                </Link>
                <Link
                  to="/analytics"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/inbox?tab=notifications"
                className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link
                to="/profile"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <User className="w-4 h-4" />
                <span>{user?.name || user?.email}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            &copy; 2024 FreelanceFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
