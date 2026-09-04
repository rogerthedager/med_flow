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

function DeleteOrderDialog({ order, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const deletingRef = useRef(false);

  async function handleDelete() {
    if (deletingRef.current) return;

    deletingRef.current = true;
    setDeleting(true);
    setError("");

    try {
      await apiClient.delete(`/orders/${order.id}`);

      onDeleted?.(order);
      onClose();
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 404) {
        setError("Order was not found. It may already be deleted.");
      } else if (status === 401 || status === 403) {
        setError("You do not have permission to delete orders.");
      } else if (status === 409 && typeof detail === "string") {
        setError(detail);
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Could not delete order. Please try again.");
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
      <DialogTitle>Delete Order #{order.id}?</DialogTitle>

      <DialogContent>
        <Typography>
          Are you sure you want to permanently delete{" "}
          <strong>{order.title}</strong>?
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Orders with existing service reports cannot be deleted.
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

export default DeleteOrderDialog;
