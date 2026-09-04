import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import apiClient from "../../api/client.js";

const columns = [
  {
    field: "hospital_name",
    headerName: "Hospital",
    width: 220,
  },
  {
    field: "equipment_count",
    headerName: "Total Equipment",
    type: "number",
    width: 160,
  },
  {
    field: "maintenance_count",
    headerName: "In Maintenance",
    type: "number",
    width: 160,
  },
  {
    field: "maintenance_pct",
    headerName: "Maintenance %",
    type: "number",
    width: 170,
    renderCell: ({ value }) =>
      value == null ? "—" : `${Number(value).toFixed(2)}%`,
  },
];

function MaintenanceDataGrid({ refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMaintenance() {
      try {
        const response = await apiClient.get("/hospitals/maintenance-flags");

        if (isMounted) {
          setRows(response.data);
          setError(null);
        }
      } catch (error) {
        if (isMounted) {
          setError(
            error.response?.status === 401
              ? "Please log out and sign in again."
              : "Could not load maintenance flags.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchMaintenance();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Hospitals with more than 30% of equipment in maintenance. Total
        equipment includes Offline devices.
      </Typography>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Flagged hospitals: {rows.length}
      </Typography>

      {rows.length === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          No hospitals exceed the 30% maintenance threshold.
        </Alert>
      )}

      <Box sx={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.hospital_id}
        />
      </Box>
    </Box>
  );
}

export default MaintenanceDataGrid;
