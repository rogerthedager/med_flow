import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import apiClient from "../../api/client.js";

const STATUS_OPTIONS = ["Available", "In-Use", "Maintenance", "Offline"];

function errorMessage(error) {
  const status = error.response?.status;

  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "Only administrators can edit equipment.";
  if (status === 404) return "This equipment no longer exists.";
  if (status === 409) return "The serial number may already be in use.";

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join("; ");
  }

  return "Could not update the equipment.";
}

function EditEquipmentDialog({ equipment, onClose, onUpdated }) {
  const [form, setForm] = useState({
    serial_number: equipment.serial_number,
    model: equipment.model,
    status: equipment.status,
    charge_level: String(equipment.charge_level),
    hospital_id: String(equipment.hospital_id),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const savingRef = useRef(false);

  const serialNumber = form.serial_number.trim();
  const model = form.model.trim();
  const chargeLevel =
    form.charge_level.trim() === "" ? Number.NaN : Number(form.charge_level);
  const hospitalId = Number(form.hospital_id);

  const valid =
    serialNumber.length >= 1 &&
    serialNumber.length <= 50 &&
    model.length >= 1 &&
    model.length <= 100 &&
    Number.isFinite(chargeLevel) &&
    chargeLevel >= 0 &&
    chargeLevel <= 100 &&
    Number.isSafeInteger(hospitalId) &&
    hospitalId >= 1 &&
    STATUS_OPTIONS.includes(form.status);

  const changed =
    serialNumber !== equipment.serial_number ||
    model !== equipment.model ||
    form.status !== equipment.status ||
    chargeLevel !== Number(equipment.charge_level) ||
    hospitalId !== equipment.hospital_id;

  const canSave = valid && changed && !saving;

  const changeField = (field) => (event) => {
    const value = event.target.value;

    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  function closeDialog() {
    if (!savingRef.current) onClose();
  }

  async function handleSave() {
    if (!canSave || savingRef.current) return;

    const payload = {};

    if (serialNumber !== equipment.serial_number) {
      payload.serial_number = serialNumber;
    }

    if (model !== equipment.model) {
      payload.model = model;
    }

    if (form.status !== equipment.status) {
      payload.status = form.status;
    }

    if (chargeLevel !== Number(equipment.charge_level)) {
      payload.charge_level = chargeLevel;
    }

    if (hospitalId !== equipment.hospital_id) {
      payload.hospital_id = hospitalId;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const response = await apiClient.patch(
        `/equipments/${equipment.id}`,
        payload,
      );

      onUpdated(response.data);
    } catch (error) {
      setError(errorMessage(error));
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onClose();
  }

  return (
    <Dialog open onClose={closeDialog} fullWidth maxWidth="sm">
      <DialogTitle>Edit Equipment #{equipment.id}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Serial Number"
            value={form.serial_number}
            onChange={changeField("serial_number")}
            disabled={saving}
            error={serialNumber.length === 0 || serialNumber.length > 50}
            helperText={`${serialNumber.length}/50 characters`}
            required
          />

          <TextField
            label="Model"
            value={form.model}
            onChange={changeField("model")}
            disabled={saving}
            error={model.length === 0 || model.length > 100}
            helperText={`${model.length}/100 characters`}
            required
          />

          <TextField
            label="Charge Level"
            type="number"
            value={form.charge_level}
            onChange={changeField("charge_level")}
            disabled={saving}
            error={
              !Number.isFinite(chargeLevel) ||
              chargeLevel < 0 ||
              chargeLevel > 100
            }
            helperText="Enter a value from 0 to 100."
            required
          />

          <TextField
            label="Hospital ID"
            type="number"
            value={form.hospital_id}
            onChange={changeField("hospital_id")}
            disabled={saving}
            error={!Number.isSafeInteger(hospitalId) || hospitalId < 1}
            helperText="Enter an existing hospital ID."
            required
          />

          <TextField
            select
            label="Status"
            value={form.status}
            onChange={changeField("status")}
            disabled={saving}
            required
          >
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>

          {form.status === "Offline" && (
            <Alert severity="warning">
              Offline equipment will disappear from the active equipment list
              after saving.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={closeDialog} disabled={saving}>
          Cancel
        </Button>

        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditEquipmentDialog;
