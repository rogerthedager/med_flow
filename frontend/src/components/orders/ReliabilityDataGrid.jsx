import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import apiClient from "../../api/client.js";

const columns = [
  { field: "model", headerName: "Model", width: 200 },
  {
    field: "completed",
    headerName: "Completed",
    type: "number",
    width: 120,
  },
  {
    field: "failed",
    headerName: "Failed",
    type: "number",
    width: 100,
  },
  {
    field: "completion_failure_ratio",
    headerName: "Completed / Failed",
    type: "number",
    width: 180,
    renderCell: ({ value }) =>
      value == null ? "—" : Number(value).toFixed(2),
  },
  {
    field: "completion_rate_pct",
    headerName: "Completion Rate",
    type: "number",
    width: 170,
    renderCell: ({ value }) =>
      value == null ? "—" : `${Number(value).toFixed(2)}%`,
  },
];

function ReliabilityDataGrid() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchReliability() {
      try {
        const response = await apiClient.get("/orders/reliability");

        if (isMounted) {
          setRows(response.data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load reliability metrics.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchReliability();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Ratios use Completed and Failed orders only.
        A dash means the denominator is zero.
      </Typography>

      <Box sx={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.model}
        />
      </Box>
    </Box>
  );
}

export default ReliabilityDataGrid;