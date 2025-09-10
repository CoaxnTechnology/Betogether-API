// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials");
    }
  };

  const handleDemoLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
              BT
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            BeTogether Admin
          </h2>
          <p className="text-gray-500 text-sm">
            Sign in to access the admin dashboard
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Sign In
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Demo Credentials
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-300">
                Super Admin
              </span>
              <button
                className="text-blue-600 hover:underline"
                onClick={() =>
                  handleDemoLogin("admin@betogether.com", "admin123")
                }
              >
                Use
              </button>
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-300">Manager</span>
              <button
                className="text-blue-600 hover:underline"
                onClick={() =>
                  handleDemoLogin("manager@betogether.com", "manager123")
                }
              >
                Use
              </button>
            </div>
            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-300">Support</span>
              <button
                className="text-blue-600 hover:underline"
                onClick={() =>
                  handleDemoLogin("support@betogether.com", "support123")
                }
              >
                Use
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
