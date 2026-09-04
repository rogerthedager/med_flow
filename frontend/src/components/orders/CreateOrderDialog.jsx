import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "../../context/AuthContext.jsx";

const PRIORITIES = ["Low", "Medium", "Critical"];

const EMPTY_FORM = {
  title: "",
  priority: "Medium",
  equipment_id: "",
  technician_id: "",
};

function errorMessage(error, fallback) {
  const status = error.response?.status;

  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "Only administrators can create work orders.";

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join("; ");
  }

  return fallback;
}

function CreateOrderDialog({ onCreated, disabled = false }) {
  const { user } = useAuth();
  const canCreate = user?.role === "Clinical Admin";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const savingRef = useRef(false);

  useEffect(() => {
    if (!open || !canCreate) return;

    let active = true;

    async function loadOptions() {
      try {
        const response = await apiClient.get("/orders/create-options");

        if (active) setOptions(response.data);
      } catch (error) {
        if (active) {
          setError(
            errorMessage(error, "Could not load equipment and technicians."),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, [open, canCreate]);

  const selectedEquipment = options?.equipments.find(
    (equipment) => equipment.id === Number(form.equipment_id),
  );

  const selectedTechnician = options?.technicians.find(
    (technician) => technician.id === Number(form.technician_id),
  );

  const title = form.title.trim();
  const titleLength = [...title].length;

  const canSubmit = Boolean(
    canCreate &&
    !loading &&
    !saving &&
    titleLength >= 1 &&
    titleLength <= 100 &&
    PRIORITIES.includes(form.priority) &&
    selectedEquipment &&
    selectedTechnician,
  );

  const differentHospitals =
    selectedEquipment &&
    selectedTechnician &&
    selectedEquipment.hospital_id !== selectedTechnician.hospital_id;

  function openDialog() {
    setForm({ ...EMPTY_FORM });
    setOptions(null);
    setError(null);
    setLoading(true);
    setOpen(true);
  }

  function closeDialog() {
    if (!savingRef.current) setOpen(false);
  }

  const changeField = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  async function handleCreate() {
    if (!canSubmit || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setError(null);

    let createdOrder;

    try {
      const response = await apiClient.post("/orders", {
        title,
        priority: form.priority,
        equipment_id: Number(form.equipment_id),
        technician_id: Number(form.technician_id),
      });

      createdOrder = response.data;
    } catch (error) {
      setError(
        errorMessage(
          error,
          "Could not confirm creation. Check the order list before retrying.",
        ),
      );
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    setOpen(false);
    onCreated?.(createdOrder);
  }

  if (!canCreate) return null;

  return (
    <>
      <Button
        variant="contained"
        onClick={openDialog}
        disabled={disabled || saving}
        sx={{ mb: 2 }}
      >
        Add Work Order
      </Button>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add Work Order</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {loading && (
              <Alert severity="info">
                Loading equipment and technicians...
              </Alert>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {options &&
              (!options.equipments.length || !options.technicians.length) && (
                <Alert severity="warning">
                  At least one equipment record and one technician are required.
                </Alert>
              )}

            <TextField
              label="Title"
              value={form.title}
              onChange={changeField("title")}
              disabled={saving}
              error={titleLength > 100}
              helperText={`${titleLength}/100 characters`}
              required
              fullWidth
            />

            <TextField
              select
              label="Priority"
              value={form.priority}
              onChange={changeField("priority")}
              disabled={saving}
              fullWidth
            >
              {PRIORITIES.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Equipment"
              value={form.equipment_id}
              onChange={changeField("equipment_id")}
              disabled={loading || saving || !options}
              required
              fullWidth
            >
              <MenuItem value="" disabled>
                Select equipment
              </MenuItem>
              {options?.equipments.map((equipment) => (
                <MenuItem key={equipment.id} value={String(equipment.id)}>
                  #{equipment.id} — {equipment.serial_number}
                  {" — "}
                  {equipment.status}
                  {" — Hospital "}
                  {equipment.hospital_id}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Technician"
              value={form.technician_id}
              onChange={changeField("technician_id")}
              disabled={loading || saving || !options}
              required
              fullWidth
            >
              <MenuItem value="" disabled>
                Select technician
              </MenuItem>
              {options?.technicians.map((technician) => (
                <MenuItem key={technician.id} value={String(technician.id)}>
                  #{technician.id} — {technician.name}
                  {" — Hospital "}
                  {technician.hospital_id}
                </MenuItem>
              ))}
            </TextField>

            {differentHospitals && (
              <Alert severity="warning">
                The equipment and technician are at different hospitals. This
                assignment is allowed and will appear in the discrepancy report.
              </Alert>
            )}

            <Alert severity="info">New orders start with Pending status.</Alert>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!canSubmit}
          >
            {saving ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CreateOrderDialog;
