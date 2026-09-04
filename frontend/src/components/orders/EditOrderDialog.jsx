import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import apiClient from "../../api/client.js";

const PRIORITY_OPTIONS = ["Low", "Medium", "Critical"];

function EditOrderDialog({
  order,
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({
    title: order.title,
    priority: order.priority,
    equipment_id: String(order.equipment_id),
    technician_id: String(order.technician_id),
  });
  const [options, setOptions] = useState({
    equipments: [],
    technicians: [],
  });
  const [loadingOptions, setLoadingOptions] =
    useState(true);
  const [optionError, setOptionError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const response = await apiClient.get(
          "/orders/create-options",
        );

        if (active) {
          setOptions(response.data);
          setOptionError("");
        }
      } catch {
        if (active) {
          setOptionError(
            "Could not load equipment and technicians.",
          );
        }
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const title = form.title.trim();

  const equipmentId =
    form.equipment_id.trim() === ""
      ? Number.NaN
      : Number(form.equipment_id);

  const technicianId =
    form.technician_id.trim() === ""
      ? Number.NaN
      : Number(form.technician_id);

  const titleValid =
    title.length >= 1 && title.length <= 100;

  const priorityValid = PRIORITY_OPTIONS.includes(
    form.priority,
  );

  const equipmentValid =
    Number.isSafeInteger(equipmentId) &&
    equipmentId >= 1;

  const technicianValid =
    Number.isSafeInteger(technicianId) &&
    technicianId >= 1;

  const changed =
    title !== order.title ||
    form.priority !== order.priority ||
    equipmentId !== Number(order.equipment_id) ||
    technicianId !== Number(order.technician_id);

  const canSave =
    titleValid &&
    priorityValid &&
    equipmentValid &&
    technicianValid &&
    changed &&
    !loadingOptions &&
    !optionError &&
    !saving;

  const selectedEquipment = options.equipments.find(
    (equipment) => equipment.id === equipmentId,
  );

  const selectedTechnician = options.technicians.find(
    (technician) => technician.id === technicianId,
  );

  const differentHospitals =
    selectedEquipment &&
    selectedTechnician &&
    selectedEquipment.hospital_id !==
      selectedTechnician.hospital_id;

  const changeField = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  async function handleSave() {
    if (!canSave || savingRef.current) return;

    const payload = {};

    if (title !== order.title) {
      payload.title = title;
    }

    if (form.priority !== order.priority) {
      payload.priority = form.priority;
    }

    if (equipmentId !== Number(order.equipment_id)) {
      payload.equipment_id = equipmentId;
    }

    if (
      technicianId !== Number(order.technician_id)
    ) {
      payload.technician_id = technicianId;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError("");

    try {
      const response = await apiClient.patch(
        `/orders/${order.id}`,
        payload,
      );

      onUpdated?.(response.data);
      onClose();
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 400 && typeof detail === "string") {
        setSaveError(detail);
      } else if (status === 404) {
        setSaveError(
          "Order was not found. It may have been deleted.",
        );
      } else if (status === 401 || status === 403) {
        setSaveError(
          "You do not have permission to edit orders.",
        );
      } else if (Array.isArray(detail)) {
        setSaveError(
          detail
            .map((item) => item.msg)
            .filter(Boolean)
            .join(" "),
        );
      } else if (typeof detail === "string") {
        setSaveError(detail);
      } else {
        setSaveError(
          "Could not update order. Please try again.",
        );
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      fullWidth
      maxWidth="sm"
      onClose={saving ? undefined : onClose}
    >
      <DialogTitle>
        Edit Order #{order.id}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {loadingOptions && (
            <CircularProgress size={24} />
          )}

          {optionError && (
            <Alert severity="error">
              {optionError}
            </Alert>
          )}

          {saveError && (
            <Alert severity="error">
              {saveError}
            </Alert>
          )}

          <TextField
            autoFocus
            label="Title"
            value={form.title}
            onChange={changeField("title")}
            disabled={saving}
            error={
              form.title.length > 0 && !titleValid
            }
            helperText="Required, maximum 100 characters."
          />

          <TextField
            select
            label="Priority"
            value={form.priority}
            onChange={changeField("priority")}
            disabled={loadingOptions || saving}
          >
            {PRIORITY_OPTIONS.map((priority) => (
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
            disabled={loadingOptions || saving}
          >
            {options.equipments.map((equipment) => (
              <MenuItem
                key={equipment.id}
                value={String(equipment.id)}
              >
                {equipment.serial_number} —{" "}
                {equipment.model} — Hospital{" "}
                {equipment.hospital_id}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Technician"
            value={form.technician_id}
            onChange={changeField("technician_id")}
            disabled={loadingOptions || saving}
          >
            {options.technicians.map((technician) => (
              <MenuItem
                key={technician.id}
                value={String(technician.id)}
              >
                {technician.name} — Hospital{" "}
                {technician.hospital_id}
              </MenuItem>
            ))}
          </TextField>

          {differentHospitals && (
            <Alert severity="warning">
              The equipment and technician are assigned
              to different hospitals.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Save"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditOrderDialog;