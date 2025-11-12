import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";

const GuestMiddleware = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();

  if (authLoading || profileLoading) return null;

  // Only redirect doctors from guest routes (login, register, etc.)
  // Patients and admins can access guest routes if needed
  // But for login/register pages, it makes sense to redirect authenticated users
  if (user && userProfile) {
    const userRole = userProfile?.role || user?.role;

    // For guest routes like login/register, redirect authenticated users to their dashboard
    // But doctors can't stay on these pages anyway
    if (userRole === "doctor") {
      return <Navigate to="/bac-si/trang-chu" replace />;
    } else if (userRole === "admin" || userRole === "ADMIN") {
      // Admin can stay on guest routes if they want (for flexibility)
      // But typically should redirect from login/register
      return <Navigate to="/admin/trang-chu" replace />;
    } else if (userRole === "patient" || userRole === "user" || !userRole) {
      return <Navigate to="/benh-nhan/trang-chu" replace />;
    }
  }

  return <Outlet />;
};

export default GuestMiddleware;
