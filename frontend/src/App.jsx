import { Container, Typography, Box, Snackbar, Alert } from "@mui/material";
import AppHeader from "./components/layout/AppHeader.jsx";
import LoginForm from "./components/auth/LoginForm.jsx";
import { useState } from "react";
import EquipmentDataGrid from "./components/equipments/EquipmentDataGrid.jsx";
import DiscrepancyDataGrid from "./components/orders/DiscrepancyDataGrid.jsx";
import ReliabilityDataGrid from "./components/orders/ReliabilityDataGrid.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import MaintenanceDataGrid from "./components/hospital/MaintenanceDataGrid.jsx";
import ReportingLines from "./components/hospital/ReportingLines.jsx";
import OrderDataGrid from "./components/orders/OrderDataGrid.jsx";
import HospitalDataGrid from "./components/hospital/HospitalDataGrid.jsx";
import UserDataGrid from "./components/users/UserDataGrid.jsx";

function Dashboard() {
  const { user, logout } = useAuth();
  const [notification, setNotification] = useState(null);
  const [orderRevision, setOrderRevision] = useState(0);
  const [equipmentRevision, setEquipmentRevision] = useState(0);

  const dashboardRevision = `${orderRevision}-${equipmentRevision}`;
  return (
    <>
      <AppHeader username={user?.sub} role={user?.role} onLogout={logout} />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Fleet Overview
        </Typography>
        <Box sx={{ mb: 4 }}>
          <EquipmentDataGrid
            onSuccess={setNotification}
            onEquipmentChanged={() => {
              setEquipmentRevision((previous) => previous + 1);
            }}
          />
        </Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Hospitals
        </Typography>

        <Box sx={{ mb: 4 }}>
          <HospitalDataGrid onSuccess={setNotification} />
        </Box>

        {user?.role === "Clinical Admin" && (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              User Accounts
            </Typography>

            <Box sx={{ mb: 4 }}>
              <UserDataGrid onSuccess={setNotification} />
            </Box>
          </>
        )}

        <Typography variant="h5" component="h2" gutterBottom>
          Work Orders
        </Typography>
        <Box sx={{ mb: 4 }}>
          <OrderDataGrid
            onSuccess={setNotification}
            onStatusChanged={() => {
              setOrderRevision((previous) => previous + 1);
            }}
          />
        </Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Co-Location Discrepancies Overview
        </Typography>
        <Box sx={{ mb: 4 }}>
          <DiscrepancyDataGrid refreshKey={dashboardRevision} />
        </Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Reliability Metrics
        </Typography>
        <Box sx={{ mb: 4 }}>
          <ReliabilityDataGrid key={dashboardRevision} />
        </Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Maintenance Flags
        </Typography>
        <Box sx={{ mb: 4 }}>
          <MaintenanceDataGrid refreshKey={equipmentRevision} />
        </Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Reporting Lines
        </Typography>

        <Box sx={{ mb: 4 }}>
          <ReportingLines refreshKey={orderRevision} />
        </Box>
      </Container>
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
      >
        <Alert severity="success" onClose={() => setNotification(null)}>
          {notification}
        </Alert>
      </Snackbar>
    </>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
