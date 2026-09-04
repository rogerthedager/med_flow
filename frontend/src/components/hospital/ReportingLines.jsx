import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import apiClient from "../../api/client.js";

function ReportingLines({ refreshKey = 0 }) {
  const [supervisorId, setSupervisorId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState(null);
function handleSubmit(event) {
  event.preventDefault();

  const id = Number(supervisorId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    setQuery(null);
    setData(null);
    setLoading(false);
    setError("Please enter a valid positive supervisor ID.");
    return;
  }

  // 保存实际提交的 ID，刷新时不会误用尚未提交的输入。
  setQuery({ supervisorId: id });
}

useEffect(() => {
  if (!query) return;

  let active = true;

  async function fetchReportingLines() {
    setLoading(true);
    setData(null);
    setError(null);

    try {
      const response = await apiClient.get(
        "/hospitals/reporting-lines",
        {
          params: {
            supervisor_id: query.supervisorId,
          },
        },
      );

      if (active) setData(response.data);
    } catch (error) {
      if (!active) return;

      const status = error.response?.status;

      setError(
        status === 401
          ? "Your session expired. Please sign in again."
          : status === 404
            ? "No hospital is assigned to this supervisor."
            : "Could not load reporting lines.",
      );
    } finally {
      if (active) setLoading(false);
    }
  }

  fetchReportingLines();

  return () => {
    active = false;
  };
}, [query, refreshKey]);

  return (
    <Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <TextField
          label="Supervisor ID"
          type="number"
          value={supervisorId}
          onChange={(event) => setSupervisorId(event.target.value)}
          helperText="Use the hospital's supervisor ID."
          disabled={loading}
          required
        />

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
        >
          {loading ? "Loading..." : "Search"}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">
              Supervisor #{data.supervisor_id}
            </Typography>

            <Typography variant="h3" color="primary">
              {data.active_technicians}
            </Typography>

            <Typography color="text.secondary">
              Technicians with active work orders
            </Typography>

            <Typography sx={{ mt: 2 }}>
              Active work orders: {data.active_orders}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Active means Pending or In-Progress.
              Each technician is counted once.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default ReportingLines;