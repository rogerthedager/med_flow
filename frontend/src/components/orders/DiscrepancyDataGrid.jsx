import { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import apiClient from "../../api/client.js";

const columns = [
  { field: "order_id", headerName: "Order ID", width: 70 },
  { field: "title", headerName: "Order Title", width: 160 },
  {
    field: "equipment_hospital_id",
    headerName: "Equipment Hospital ID",
    width: 110,
    type: "number",
  },
  {
    field: "technician_hospital_id",
    headerName: "Technician Hospital ID",
    width: 110,
    type: "number",
  },
];

const PRIORITY_OPTIONS = ["", "Low", "Medium", "Critical"];

function DiscrepancyDataGrid({ refreshKey = 0 }) {
  const [Discrepancy, setDiscrepancy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priority, setPriority] = useState("");
  const [deviceCount, setDeviceCount] = useState(0);
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    async function fetchDiscrepancies() {
      try {
        const params = { priority: priority || undefined };

        const [listResponse, summaryResponse] = await Promise.all([
          apiClient.get("/orders/discrepancies", { params }),
          apiClient.get("/orders/discrepancies/summary", { params }),
        ]);

        if (isMounted) {
          setDiscrepancy(listResponse.data);
          setDeviceCount(summaryResponse.data.device_count);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load discrepancy report.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchDiscrepancies();

    return () => {
      isMounted = false;
    };
  }, [priority, refreshKey]);

  //loads data grid component if all goes well
  return (
    <Box>
      <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
        <InputLabel id="priority-filter-lable">Priority</InputLabel>
        <Select
          labelId="priority-filter-lable"
          label="priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <MenuItem key={option || "all"} value={option}>
              {option === "" ? "ALL" : option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Co-Location Discrepancy</Typography>

              <Typography
                variant="h3"
                color={deviceCount > 0 ? "warning.main" : "success.main"}
              >
                {deviceCount}
              </Typography>

              <Typography color="text.secondary">
                Distinct devices assigned to technicians at another hospital.
                Priority: {priority || "All"}
              </Typography>
            </CardContent>
          </Card>

          <Box sx={{ height: 400, width: "100%" }}>
            <DataGrid
              rows={Discrepancy}
              columns={columns}
              getRowId={(row) => row.order_id}
            />
          </Box>
        </>
      )}
    </Box>
  );
}

export default DiscrepancyDataGrid;
