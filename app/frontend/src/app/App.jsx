import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { PortalTransitionProvider } from "../components/ui/PortalTransition.jsx";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage.jsx";
import { RegisterPage } from "../features/auth/RegisterPage.jsx";
import { VerifyEmailPage } from "../features/auth/VerifyEmailPage.jsx";
import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";
import { DepartmentsPage } from "../features/departments/DepartmentsPage.jsx";
import { HomePage } from "../features/home/HomePage.jsx";
import { RequestTypesPage } from "../features/request-types/RequestTypesPage.jsx";
import { ProcessingPage } from "../features/processing/ProcessingPage.jsx";
import { ReportsPage } from "../features/reports/ReportsPage.jsx";
import { RulesPage } from "../features/rules/RulesPage.jsx";
import { RequestCreatePage } from "../features/requests/RequestCreatePage.jsx";
import { RequestDetailPage } from "../features/requests/RequestDetailPage.jsx";
import { RequestsPage } from "../features/requests/RequestsPage.jsx";
import { UsersPage } from "../features/users/UsersPage.jsx";
import { WorkspacesPage } from "../features/workspaces/WorkspacesPage.jsx";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { RoleGuard } from "./RoleGuard.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
}

export function App() {
  return (
    <AuthProvider>
      <PortalTransitionProvider>
        <Routes>
          <Route
            path="/"
            element={
              window.location.protocol === "file:" ? (
                <Navigate to="/workspaces" replace />
              ) : (
                <HomePage />
              )
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/workspaces"
            element={(
              <ProtectedRoute>
                <WorkspacesPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/change-password"
            element={(
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            )}
          />
          <Route
            element={(
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            )}
          >
            <Route
              path="dashboard"
              element={(
                <RoleGuard roles={["ADMIN", "ASSIGNEE"]}>
                  <DashboardPage />
                </RoleGuard>
              )}
            />
            <Route
              path="requests"
              element={(
                <RoleGuard roles={["ADMIN", "ASSIGNEE", "REQUESTER"]}>
                  <RequestsPage />
                </RoleGuard>
              )}
            />
            <Route path="requests/new" element={<RequestCreatePage />} />
            <Route path="requests/:id" element={<RequestDetailPage />} />
            <Route
              path="processing"
              element={(
                <RoleGuard roles={["ADMIN", "ASSIGNEE"]}>
                  <ProcessingPage />
                </RoleGuard>
              )}
            />
            <Route
              path="users"
              element={(
                <RoleGuard roles={["ADMIN"]}>
                  <UsersPage />
                </RoleGuard>
              )}
            />
            <Route
              path="departments"
              element={(
                <RoleGuard roles={["ADMIN"]}>
                  <DepartmentsPage />
                </RoleGuard>
              )}
            />
            <Route
              path="request-types"
              element={(
                <RoleGuard roles={["ADMIN"]}>
                  <RequestTypesPage />
                </RoleGuard>
              )}
            />
            <Route
              path="rules"
              element={(
                <RoleGuard roles={["ADMIN"]}>
                  <RulesPage />
                </RoleGuard>
              )}
            />
            <Route
              path="reports"
              element={(
                <RoleGuard roles={["ADMIN"]}>
                  <ReportsPage />
                </RoleGuard>
              )}
            />
          </Route>
        </Routes>
      </PortalTransitionProvider>
    </AuthProvider>
  );
}
