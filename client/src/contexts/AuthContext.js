import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext({});

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Verify token is still valid
          try {
            const response = await api.get('/auth/me');
            setUser(response.data.user);
          } catch (error) {
            // Token is invalid
            logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/register', userData);
      
      const { token, user: newUser, message } = response.data;
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(newUser));
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      toast.success(message || 'Registration successful!');
      return { success: true, user: newUser };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user: loggedInUser, message } = response.data;
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(loggedInUser));
      
      setUser(loggedInUser);
      setIsAuthenticated(true);
      
      toast.success(message || 'Login successful!');
      return { success: true, user: loggedInUser };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint if user is authenticated
      if (isAuthenticated) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state regardless of API call result
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      setUser(null);
      setIsAuthenticated(false);
      toast.info('Logged out successfully');
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/profile', profileData);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      toast.success('Profile updated successfully!');
      return { success: true, user: updatedUser };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Password changed successfully!');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Password reset link sent to your email!');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password reset failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successful!');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Password reset failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Verify email
  const verifyEmail = async (token) => {
    try {
      await api.post('/auth/verify-email', { token });
      
      // Update user verification status
      const updatedUser = { ...user, isEmailVerified: true };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      toast.success('Email verified successfully!');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Email verification failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const refreshedUser = response.data.user;
      
      setUser(refreshedUser);
      localStorage.setItem('userData', JSON.stringify(refreshedUser));
      
      return { success: true, user: refreshedUser };
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false, error: error.message };
    }
  };

  // Check subscription status
  const checkSubscription = () => {
    if (!user?.subscription) return { isActive: false, type: 'free' };
    
    const { type, endDate } = user.subscription;
    const now = new Date();
    const expiryDate = new Date(endDate);
    
    return {
      isActive: type !== 'free' && (!endDate || expiryDate > now),
      type,
      expiryDate: endDate,
      daysRemaining: endDate ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) : null
    };
  };

  // Get user's fitness level and goals
  const getUserGoals = () => {
    return {
      fitnessGoals: user?.healthProfile?.fitnessGoals || [],
      activityLevel: user?.healthProfile?.activityLevel || 'moderately-active',
      dietaryRestrictions: user?.healthProfile?.dietaryRestrictions || [],
      currentLevel: user?.gamification?.level || 1,
      experience: user?.gamification?.experience || 0
    };
  };

  // Calculate user progress metrics
  const getProgressMetrics = () => {
    const subscription = checkSubscription();
    const goals = getUserGoals();
    
    return {
      profileCompletion: calculateProfileCompletion(),
      streaks: user?.gamification?.streaks || {},
      badges: user?.gamification?.badges || [],
      level: goals.currentLevel,
      nextLevelXP: (goals.currentLevel * 1000) - goals.experience,
      subscription
    };
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    if (!user) return 0;
    
    let completed = 0;
    const total = 10;
    
    if (user.firstName) completed++;
    if (user.lastName) completed++;
    if (user.email) completed++;
    if (user.isEmailVerified) completed++;
    if (user.dateOfBirth) completed++;
    if (user.gender) completed++;
    if (user.healthProfile?.height?.value) completed++;
    if (user.healthProfile?.weight?.value) completed++;
    if (user.healthProfile?.fitnessGoals?.length > 0) completed++;
    if (user.profilePicture) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const value = {
    // State
    user,
    loading,
    isAuthenticated,
    
    // Auth functions
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    refreshUser,
    
    // Utility functions
    checkSubscription,
    getUserGoals,
    getProgressMetrics,
    
    // API instance for making authenticated requests
    api
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;