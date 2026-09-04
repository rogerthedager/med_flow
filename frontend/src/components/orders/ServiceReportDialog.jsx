import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";


const ACCEPTED_FILES = ".pdf,.txt,.png,.jpg,.jpeg";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return fallback;
}

function displayName(fileUrl) {
  const value = fileUrl.split("/").at(-1) || "Service report";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ServiceReportDialog({ order, onClose, onSuccess }) {
  const { user } = useAuth();
  const canUpload =
    user?.role === "Clinical Admin" || user?.role === "Field Technician";
  const canDelete = user?.role === "Clinical Admin";

  const [reports, setReports] = useState([]);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadReports() {
      try {
        const response = await apiClient.get(
          `/orders/${order.id}/service-reports`,
        );
        if (active) setReports(response.data);
      } catch (requestError) {
        if (active) {
          setError(errorMessage(requestError, "Could not load service reports."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReports();
    return () => {
      active = false;
    };
  }, [order.id]);

  function chooseFile(event) {
    const selected = event.target.files?.[0] || null;
    event.target.value = "";
    if (selected && selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setError("Service reports must be 10 MB or smaller.");
      return;
    }
    setFile(selected);
    setError(null);
  }

  async function uploadReport() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    if (notes.trim()) body.append("notes", notes.trim());
    try {
      const response = await apiClient.post(
        `/orders/${order.id}/service-reports`,
        body,
      );
      setReports((current) => [response.data, ...current]);
      setFile(null);
      setNotes("");
      onSuccess?.(`Service report uploaded for order ${order.id}.`);
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not upload the service report."));
    } finally {
      setUploading(false);
    }
  }

  async function deleteReport(report) {
    if (!canDelete) return;
    setError(null);
    try {
      await apiClient.delete(`/service-reports/${report.id}`);
      setReports((current) => current.filter((item) => item.id !== report.id));
      onSuccess?.(`Service report ${report.id} deleted.`);
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not delete the service report."));
    }
  }

  return (
    <Dialog open onClose={uploading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Service Reports — Order #{order.id}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {canUpload && (
            <Box>
              <Stack spacing={2}>
                <Button component="label" variant="outlined" disabled={uploading}>
                  Choose PDF, TXT, or image
                  <input hidden type="file" accept={ACCEPTED_FILES} onChange={chooseFile} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "Maximum file size: 10 MB"}
                </Typography>
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  inputProps={{ maxLength: 2000 }}
                  multiline
                  minRows={2}
                  disabled={uploading}
                />
                <Button variant="contained" onClick={uploadReport} disabled={!file || uploading}>
                  {uploading ? "Uploading..." : "Upload report"}
                </Button>
              </Stack>
              <Divider sx={{ my: 3 }} />
            </Box>
          )}

          {loading && <CircularProgress size={28} />}
          {!loading && reports.length === 0 && (
            <Alert severity="info">No service reports have been attached.</Alert>
          )}
          {!loading && reports.map((report) => (
            <Box key={report.id} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography fontWeight={600}>{displayName(report.file_url)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(report.created_at).toLocaleString()}
              </Typography>
              {report.notes && <Typography sx={{ my: 1 }}>{report.notes}</Typography>}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {report.download_url ? (
                  <Button component="a" href={report.download_url} target="_blank" rel="noreferrer" size="small">
                    Download
                  </Button>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Seed reference; no S3 object is available.
                  </Typography>
                )}
                {canDelete && (
                  <Button size="small" color="error" onClick={() => deleteReport(report)}>
                    Delete
                  </Button>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ServiceReportDialog;
