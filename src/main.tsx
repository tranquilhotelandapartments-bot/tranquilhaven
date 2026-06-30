import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { ToastContainer } from 'react-toastify';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <App />
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop aria-label="System Notifications" />
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>,
);
