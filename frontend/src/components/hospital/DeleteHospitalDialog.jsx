import { useRef, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import apiClient from "../../api/client.js";

function DeleteHospitalDialog({ hospital, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const deletingRef = useRef(false);

  async function handleDelete() {
    if (deletingRef.current) return;

    deletingRef.current = true;
    setDeleting(true);
    setError("");

    try {
      await apiClient.delete(`/hospitals/${hospital.id}`);

      onDeleted?.(hospital);
      onClose();
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 404) {
        setError("Hospital was not found. It may already be deleted.");
      } else if (status === 401 || status === 403) {
        setError("You do not have permission to delete hospitals.");
      } else if (status === 409 && typeof detail === "string") {
        setError(detail);
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Could not delete hospital. Please try again.");
      }
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={deleting ? undefined : onClose}
    >
      <DialogTitle>Delete Hospital?</DialogTitle>

      <DialogContent>
        <Typography>
          Are you sure you want to permanently delete{" "}
          <strong>{hospital.name}</strong>?
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Hospitals with existing equipment or technicians cannot be deleted.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>

        <Button
          color="error"
          variant="contained"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <CircularProgress size={20} color="inherit" /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteHospitalDialog;
