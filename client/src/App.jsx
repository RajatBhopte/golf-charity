import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import {
  UserRoute,
  AdminRoute,
  AdminLoginRoute,
  AuthEntryRoute,
} from "./components/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Subscribe from "./pages/Subscribe";
import Charities from "./pages/Charities";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route element={<AuthEntryRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>
            <Route
              path="/get-started"
              element={<Navigate to="/signup" replace />}
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/charities" element={<Charities />} />
            <Route element={<AdminLoginRoute />}>
              <Route path="/admin/login" element={<AdminLogin />} />
            </Route>

            {/* Protected User Routes (Login + Non-Admin Required) */}
            <Route element={<UserRoute />}>
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Add other login-only routes here (like account settings) */}
            </Route>

            {/* Admin Routes (Login + Admin Role Required) */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
