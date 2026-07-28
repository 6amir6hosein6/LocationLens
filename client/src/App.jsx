import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppReadyProvider } from './contexts/AppReadyContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Discover from './pages/Discover';
import SwipeView from './pages/SwipeView';
import Wallet from './pages/Wallet';
import AddLocation from './pages/AddLocation';
import SavedLocations from './pages/SavedLocations';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import SplashScreen from './components/SplashScreen';

function App() {
  return (
    <AuthProvider>
      <AppReadyProvider>
        <SplashScreen />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Discover />} />
              <Route path="/swipe" element={<SwipeView />} />
              <Route path="/add" element={<AddLocation />} />
              <Route path="/saved" element={<SavedLocations />} />
              <Route path="/wallet" element={<Wallet />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppReadyProvider>
    </AuthProvider>
  );
}

export default App;
