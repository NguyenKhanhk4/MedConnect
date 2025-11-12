import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";

const PatientMiddleware = () => {
  const { user, loading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();

  // Show loading while checking authentication
  if (loading || profileLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "16px",
          color: "#666",
        }}
      >
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/dang-nhap" replace />;
  }

  // Check if user is a patient
  // For now, we'll allow any authenticated user to access patient routes
  // You can add more specific role checking here if needed
  const isPatient =
    userProfile?.role === "patient" ||
    userProfile?.role === "user" ||
    !userProfile?.role;

  if (!isPatient) {
    // Auto-redirect based on user role instead of showing error
    const userRole = userProfile?.role || user?.role;

    if (userRole === "doctor") {
      return <Navigate to="/bac-si/trang-chu" replace />;
    } else if (userRole === "admin" || userRole === "ADMIN") {
      return <Navigate to="/admin/trang-chu" replace />;
    }

    // Default: redirect to home if role is unknown
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PatientMiddleware;
