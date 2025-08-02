import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { BiometricProvider } from './contexts/BiometricContext';

// Components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import Dashboard from './pages/Dashboard/Dashboard';
import HealthProfile from './pages/Profile/HealthProfile';
import BiometricDashboard from './pages/Biometric/BiometricDashboard';
import WorkoutLibrary from './pages/Workouts/WorkoutLibrary';
import WorkoutDetail from './pages/Workouts/WorkoutDetail';
import NutritionPlan from './pages/Nutrition/NutritionPlan';
import Community from './pages/Community/Community';
import ExpertConsultation from './pages/Experts/ExpertConsultation';
import Settings from './pages/Settings/Settings';
import RecommendationsPage from './pages/Recommendations/RecommendationsPage';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#9bb5ff',
      dark: '#3f51b5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f093fb',
      light: '#ff94b9',
      dark: '#c56aff',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          color: '#333',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <SocketProvider>
              <BiometricProvider>
                <div className="App">
                  <Routes>
                    {/* Public Routes */}
                    <Route 
                      path="/" 
                      element={
                        <PublicRoute>
                          <LandingPage />
                        </PublicRoute>
                      } 
                    />
                    <Route 
                      path="/login" 
                      element={
                        <PublicRoute>
                          <LoginPage />
                        </PublicRoute>
                      } 
                    />
                    <Route 
                      path="/register" 
                      element={
                        <PublicRoute>
                          <RegisterPage />
                        </PublicRoute>
                      } 
                    />
                    
                    {/* Protected Routes */}
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Dashboard />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <HealthProfile />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/biometric" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <BiometricDashboard />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/workouts" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <WorkoutLibrary />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/workouts/:id" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <WorkoutDetail />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/nutrition" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <NutritionPlan />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/recommendations" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <RecommendationsPage />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/community" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Community />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/experts" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <ExpertConsultation />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Settings />
                          </Layout>
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* Fallback Route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  
                  {/* Toast Notifications */}
                  <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                    style={{ zIndex: 9999 }}
                  />
                </div>
              </BiometricProvider>
            </SocketProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;