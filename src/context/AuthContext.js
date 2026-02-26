import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

// FIX 1: Base URL - BILKUL YEH COPY KARO
const baseURL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_URL = baseURL;

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          try {
            // FIX 2: Simple fetch - NO .replace()
            const response = await fetch(`${API_URL}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            const data = await response.json();
            if (data.success && data.user) {
              const updatedUser = {
                ...userData,
                ...data.user,
                metaAccessToken: userData.metaAccessToken || data.user.metaAccessToken,
                metaAdAccountId: userData.metaAdAccountId || data.user.metaAdAccountId
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              setUser(updatedUser);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
      } catch (error) {
        console.error('Token decode error:', error);
        logout();
      }
    }
    setLoading(false);
  };

  // Login function - FIXED
  const login = async (email, password) => {
    try {
      // FIX 3: NO .replace() - BILKUL YEH COPY KARO
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user, token } = data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  };

  // Register function - FIXED
  const register = async (userData) => {
    try {
      // FIX 4: NO .replace() - BILKUL YEH COPY KARO
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user, token } = data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || 'Registration failed',
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateMetaCredentials = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/meta-credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentUser,
          metaAccessToken: data.metaAccessToken || currentUser.metaAccessToken,
          metaAdAccountId: data.metaAdAccountId || currentUser.metaAdAccountId
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        return { 
          success: true, 
          message: result.message,
          metaAdAccountId: updatedUser.metaAdAccountId 
        };
      } else {
        return {
          success: false,
          error: result.error || 'Update failed',
        };
      }
    } catch (error) {
      console.error('Update meta credentials error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  };

  const getCurrentUser = () => user;
  const isAdmin = () => user?.role === 'admin';
  const isMetaConnected = () => !!(user?.metaAccessToken && user?.metaAdAccountId);

  const value = {
    user,
    login,
    register,
    logout,
    updateMetaCredentials,
    getCurrentUser,
    isAdmin,
    isMetaConnected,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};