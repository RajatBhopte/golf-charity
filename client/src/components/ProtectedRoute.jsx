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

  // Temporarily disabling subscription check until Stripe is implemented
  // if (user?.subscription_status !== 'active') {
  //   // If they don't have an active subscription, send them to the plan selection
  //   // (This usually means their payment failed, they canceled, or they haven't finished signup)
  //   return <Navigate to="/subscribe" state={{ from: location }} replace />;
  // }

  return <Outlet />;
};
