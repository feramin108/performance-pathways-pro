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
import HCDashboard from "./pages/hc/HCDashboard";
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
            <Route path="/manager/*" element={<ProtectedRoute allowedRole="manager"><ComingSoon /></ProtectedRoute>} />

            {/* HC Portal */}
            <Route path="/hc/dashboard" element={<ProtectedRoute allowedRole="hc"><HCDashboard /></ProtectedRoute>} />
            <Route path="/hc/*" element={<ProtectedRoute allowedRole="hc"><ComingSoon /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
