import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import usePushNotifications from '../hooks/usePushNotifications';

export default function AppLayout() {
  usePushNotifications();

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
