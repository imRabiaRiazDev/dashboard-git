import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

// =============== FIXED API URL ===============
// Development ke liye localhost, production ke liye environment variable
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000' 
  : (process.env.REACT_APP_API_URL || 'https://your-backend-name.railway.app');

console.log('🚀 API URL:', API_URL);
console.log('📱 Environment:', process.env.NODE_ENV);

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
          console.log('⏰ Token expired');
          logout();
        } else {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          try {
            console.log('🔍 Verifying auth with server...');
            const response = await fetch(`${API_URL}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            });
            
            const text = await response.text();
            console.log('📡 Auth response:', text.substring(0, 150));
            
            // Check if response is HTML (404 page)
            if (text.startsWith('<!DOCTYPE')) {
              console.warn('⚠️ Server returned HTML - API route not found');
              return;
            }
            
            try {
              const data = JSON.parse(text);
              if (data.success && data.user) {
                const updatedUser = {
                  ...userData,
                  ...data.user,
                  metaAccessToken: userData.metaAccessToken || data.user.metaAccessToken,
                  metaAdAccountId: userData.metaAdAccountId || data.user.metaAdAccountId
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                console.log('✅ User data updated from server');
              }
            } catch (parseError) {
              console.error('❌ Failed to parse JSON response:', parseError);
            }
          } catch (error) {
            console.error('❌ Error fetching user data:', error);
          }
        }
      } catch (error) {
        console.error('❌ Token decode error:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const loginUrl = `${API_URL}/api/auth/login`;
      console.log('📤 Login request to:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      console.log('📥 Login raw response:', text.substring(0, 200));
      
      // Check if response is HTML
      if (text.startsWith('<!DOCTYPE')) {
        console.error('❌ Server returned HTML - API URL might be wrong:', API_URL);
        return {
          success: false,
          error: 'Server se HTML mil raha hai. API URL check karein: ' + API_URL
        };
      }

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        return {
          success: false,
          error: 'Server se invalid response. Response: ' + text.substring(0, 100)
        };
      }

      if (response.ok && data.success) {
        const { user, token } = data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        console.log('✅ Login successful for:', user.email);
        return { success: true };
      } else {
        console.error('❌ Login failed:', data.error);
        return {
          success: false,
          error: data.error || 'Login failed',
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: 'Network error. API URL check karein: ' + API_URL,
      };
    }
  };

  const register = async (userData) => {
    try {
      const registerUrl = `${API_URL}/api/auth/register`;
      console.log('📤 Register request to:', registerUrl);
      
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const text = await response.text();
      console.log('📥 Register raw response:', text.substring(0, 200));
      
      if (text.startsWith('<!DOCTYPE')) {
        return {
          success: false,
          error: 'Server se HTML mil raha hai. API URL check karein!'
        };
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        return {
          success: false,
          error: 'Server se invalid response'
        };
      }

      if (response.ok && data.success) {
        const { user, token } = data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        console.log('✅ Registration successful for:', user.email);
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || 'Registration failed',
        };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
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
    console.log('👋 User logged out');
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
        console.log('✅ Meta credentials updated');
        
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
      console.error('❌ Update meta credentials error:', error);
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