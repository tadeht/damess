import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  const roleCode = user?.role?.code;

  if (!roles.includes(roleCode)) {
    return <Navigate to={window.location.protocol === "file:" ? "/workspaces" : "/"} replace />;
  }

  return children;
}
