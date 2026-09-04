import { useRef, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import apiClient from "../../api/client.js";

function CreateHospitalDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    location_region: "",
    capacity: "",
    supervisor_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  const name = form.name.trim();
  const region = form.location_region.trim();

  const capacity =
    form.capacity.trim() === "" ? Number.NaN : Number(form.capacity);

  const supervisorId =
    form.supervisor_id.trim() === "" ? Number.NaN : Number(form.supervisor_id);

  const nameValid = name.length >= 1 && name.length <= 100;

  const regionValid = region.length >= 1 && region.length <= 50;

  const capacityValid = Number.isSafeInteger(capacity) && capacity >= 0;

  const supervisorValid =
    Number.isSafeInteger(supervisorId) && supervisorId >= 1;

  const canSubmit =
    nameValid && regionValid && capacityValid && supervisorValid && !saving;

  const changeField = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  async function handleCreate() {
    if (!canSubmit || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setError("");

    try {
      const response = await apiClient.post("/hospitals", {
        name,
        location_region: region,
        capacity,
        supervisor_id: supervisorId,
      });

      onCreated?.(response.data);
      onClose();
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 401 || status === 403) {
        setError("You do not have permission to create hospitals.");
      } else if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg)
            .filter(Boolean)
            .join(" "),
        );
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Could not create hospital. Please try again.");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={saving ? undefined : onClose}>
      <DialogTitle>Add Hospital</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            autoFocus
            label="Hospital Name"
            value={form.name}
            onChange={changeField("name")}
            error={form.name.length > 0 && !nameValid}
            helperText="Required, maximum 100 characters."
          />

          <TextField
            label="Region"
            value={form.location_region}
            onChange={changeField("location_region")}
            error={form.location_region.length > 0 && !regionValid}
            helperText="Required, maximum 50 characters."
          />

          <TextField
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={changeField("capacity")}
            error={form.capacity.length > 0 && !capacityValid}
            helperText="Enter zero or a positive whole number."
          />

          <TextField
            label="Supervisor ID"
            type="number"
            value={form.supervisor_id}
            onChange={changeField("supervisor_id")}
            error={form.supervisor_id.length > 0 && !supervisorValid}
            helperText="Enter a positive whole number."
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!canSubmit}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateHospitalDialog;
