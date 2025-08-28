import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo credentials
    const validCredentials = [
      { email: 'admin@betogether.com', password: 'admin123', role: 'super_admin' },
      { email: 'manager@betogether.com', password: 'manager123', role: 'manager' },
      { email: 'support@betogether.com', password: 'support123', role: 'support' }
    ];

    const validUser = validCredentials.find(
      cred => cred.email === email && cred.password === password
    );

    if (validUser) {
      const userData = {
        id: Date.now().toString(),
        email: validUser.email,
        name: validUser.email.split('@')[0].charAt(0).toUpperCase() + validUser.email.split('@')[0].slice(1),
        role: validUser.role,
        loginTime: new Date().toISOString()
      };
      
      setUser(userData);
      localStorage.setItem('adminUser', JSON.stringify(userData));
      return { success: true };
    } else {
      throw new Error('Invalid email or password');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('adminUser');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};