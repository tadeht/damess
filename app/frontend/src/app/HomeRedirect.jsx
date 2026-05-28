import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export function HomeRedirect() {
  const { user } = useAuth();
  const roleCode = user?.role?.code;

  if (roleCode === "REQUESTER") {
    return <Navigate to="/requests/new" replace />;
  }

  if (roleCode === "ASSIGNEE") {
    return <Navigate to="/processing" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
