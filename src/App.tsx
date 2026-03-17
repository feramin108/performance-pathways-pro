import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EvaluationWizard from "./pages/employee/EvaluationWizard";
import EvaluationDetail from "./pages/employee/EvaluationDetail";
import GoalSettingPage from "./pages/employee/GoalSettingPage";
import ProfilePage from "./pages/employee/ProfilePage";
import NotificationsPage from "./pages/employee/NotificationsPage";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerReview from "./pages/manager/ManagerReview";
import PendingReviews from "./pages/manager/PendingReviews";
import TeamEvaluations from "./pages/manager/TeamEvaluations";
import ApprovedEvaluations from "./pages/manager/ApprovedEvaluations";
import ManagerNotifications from "./pages/manager/ManagerNotifications";
import HCDashboard from "./pages/hc/HCDashboard";
import HCPendingValidation from "./pages/hc/HCPendingValidation";
import HCEvaluationValidation from "./pages/hc/HCEvaluationValidation";
import HCAllEvaluations from "./pages/hc/HCAllEvaluations";
import HCCalibration from "./pages/hc/HCCalibration";
import HCEmployeeDirectory from "./pages/hc/HCEmployeeDirectory";
import HCKPIManagement from "./pages/hc/HCKPIManagement";
import HCCycles from "./pages/hc/HCCycles";
import HCReports from "./pages/hc/HCReports";
import HCAuditLog from "./pages/hc/HCAuditLog";
import HCNotifications from "./pages/hc/HCNotifications";
import ComingSoon from "./pages/ComingSoon";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            {/* Employee Portal */}
            <Route path="/employee/dashboard" element={<ProtectedRoute allowedRole="employee"><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/evaluation/new" element={<ProtectedRoute allowedRole="employee"><EvaluationWizard /></ProtectedRoute>} />
            <Route path="/employee/evaluation/:id/edit" element={<ProtectedRoute allowedRole="employee"><EvaluationWizard /></ProtectedRoute>} />
            <Route path="/employee/evaluation/:id" element={<ProtectedRoute allowedRole="employee"><EvaluationDetail /></ProtectedRoute>} />
            <Route path="/employee/evaluations" element={<ProtectedRoute allowedRole="employee"><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/goals" element={<ProtectedRoute allowedRole="employee"><GoalSettingPage /></ProtectedRoute>} />
            <Route path="/employee/profile" element={<ProtectedRoute allowedRole="employee"><ProfilePage /></ProtectedRoute>} />
            <Route path="/employee/notifications" element={<ProtectedRoute allowedRole="employee"><NotificationsPage /></ProtectedRoute>} />
            <Route path="/employee/*" element={<ProtectedRoute allowedRole="employee"><ComingSoon /></ProtectedRoute>} />

            {/* Manager Portal */}
            <Route path="/manager/dashboard" element={<ProtectedRoute allowedRole="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/pending" element={<ProtectedRoute allowedRole="manager"><PendingReviews /></ProtectedRoute>} />
            <Route path="/manager/review/:id" element={<ProtectedRoute allowedRole="manager"><ManagerReview /></ProtectedRoute>} />
            <Route path="/manager/team" element={<ProtectedRoute allowedRole="manager"><TeamEvaluations /></ProtectedRoute>} />
            <Route path="/manager/approved" element={<ProtectedRoute allowedRole="manager"><ApprovedEvaluations /></ProtectedRoute>} />
            <Route path="/manager/notifications" element={<ProtectedRoute allowedRole="manager"><ManagerNotifications /></ProtectedRoute>} />
            <Route path="/manager/*" element={<ProtectedRoute allowedRole="manager"><ComingSoon /></ProtectedRoute>} />

            {/* HC Portal */}
            <Route path="/hc/dashboard" element={<ProtectedRoute allowedRole="hc"><HCDashboard /></ProtectedRoute>} />
            <Route path="/hc/pending" element={<ProtectedRoute allowedRole="hc"><HCPendingValidation /></ProtectedRoute>} />
            <Route path="/hc/evaluation/:id" element={<ProtectedRoute allowedRole="hc"><HCEvaluationValidation /></ProtectedRoute>} />
            <Route path="/hc/evaluations" element={<ProtectedRoute allowedRole="hc"><HCAllEvaluations /></ProtectedRoute>} />
            <Route path="/hc/calibration" element={<ProtectedRoute allowedRole="hc"><HCCalibration /></ProtectedRoute>} />
            <Route path="/hc/employees" element={<ProtectedRoute allowedRole="hc"><HCEmployeeDirectory /></ProtectedRoute>} />
            <Route path="/hc/kpis" element={<ProtectedRoute allowedRole="hc"><HCKPIManagement /></ProtectedRoute>} />
            <Route path="/hc/cycles" element={<ProtectedRoute allowedRole="hc"><HCCycles /></ProtectedRoute>} />
            <Route path="/hc/reports" element={<ProtectedRoute allowedRole="hc"><HCReports /></ProtectedRoute>} />
            <Route path="/hc/audit" element={<ProtectedRoute allowedRole="hc"><HCAuditLog /></ProtectedRoute>} />
            <Route path="/hc/notifications" element={<ProtectedRoute allowedRole="hc"><HCNotifications /></ProtectedRoute>} />
            <Route path="/hc/*" element={<ProtectedRoute allowedRole="hc"><ComingSoon /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
