import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AuthRoute: Protects routes that require a logged-in user.
 * Redirects to /login if not authenticated.
 */
export const AuthRoute = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // or a nice spinner

  if (!session) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * SubRoute: Protects routes that require a logged-in user WITH an active subscription.
 * Redirects to /subscribe if no active subscription found.
 */
export const SubRoute = () => {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.subscription_status !== 'active') {
    return <Navigate to="/subscribe" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * AdminRoute: Protects routes that require a logged-in user with the 'admin' role.
 * Redirects to /dashboard if not an admin.
 */
export const AdminRoute = () => {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    // If they aren't an admin, send them back to the user dashboard
    return <Navigate to="/dashboard" replace />;
  }


  return <Outlet />;
};
