import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeePanelPage from "./pages/EmployeePanelPage";
import ManagerPanelPage from "./pages/ManagerPanelPage";
import HRPanelPage from "./pages/HRPanelPage";
import NewEvaluationPage from "./pages/NewEvaluationPage";
import EvaluationDetailPage from "./pages/EvaluationDetailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employee" element={<EmployeePanelPage />} />
          <Route path="/employee/evaluations" element={<EmployeePanelPage />} />
          <Route path="/manager" element={<ManagerPanelPage />} />
          <Route path="/manager/reviews" element={<ManagerPanelPage />} />
          <Route path="/hr" element={<HRPanelPage />} />
          <Route path="/hr/evaluations" element={<HRPanelPage />} />
          <Route path="/evaluation/new" element={<NewEvaluationPage />} />
          <Route path="/evaluation/:id" element={<EvaluationDetailPage />} />
          <Route path="/analytics" element={<DashboardPage />} />
          <Route path="/audit" element={<DashboardPage />} />
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
