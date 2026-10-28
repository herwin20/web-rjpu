// App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import LoginPage from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/DashboardPage";
import NotFoundPage from "./pages/404/NotFoundPage";
import loginService from "./api/loginSheetService";
import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children, isLoggedIn, user }) => {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children, isLoggedIn }) => {
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Main App Content with Router
const AppContent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = loginService.checkAuth();
      if (loggedIn) {
        const user = loginService.getCurrentUser();
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    //navigate("/dashboard");
  };

  const handleLogout = async () => {
    await loginService.logout();
    setCurrentUser(null);
    setIsLoggedIn(false);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute isLoggedIn={isLoggedIn}>
            <LoginPage onLogin={handleLogin} />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn} user={currentUser}>
            <Dashboard user={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* 404 Page - Catch all unmatched routes */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;
