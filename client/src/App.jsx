import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AuthRoute, SubRoute } from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Subscribe from './pages/Subscribe';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected Routes (Login Required) */}
            <Route element={<AuthRoute />}>
              <Route path="/subscribe" element={<Subscribe />} />
              {/* Add other login-only routes here (like account settings) */}
            </Route>

            {/* Subscription Routes (Login + Active Sub Required) */}
            <Route element={<SubRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Add other sub-only routes here (like score entry) */}
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
