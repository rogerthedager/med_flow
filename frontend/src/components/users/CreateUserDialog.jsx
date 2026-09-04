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

const ROLE_OPTIONS = ["Clinical Admin", "Field Technician", "Auditor"];

const TECHNICIAN_ROLE = "Field Technician";

function CreateUserDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "Auditor",
    technician_id: "",
  });
  const [technicians, setTechnicians] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionError, setOptionError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const response = await apiClient.get("/users/create-options");

        if (active) {
          setTechnicians(response.data.technicians);
          setOptionError("");
        }
      } catch {
        if (active) {
          setOptionError("Could not load available technicians.");
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

  const username = form.username.trim();
  const isTechnician = form.role === TECHNICIAN_ROLE;

  const technicianId =
    form.technician_id.trim() === "" ? Number.NaN : Number(form.technician_id);

  const usernameValid = username.length >= 3 && username.length <= 50;

  const passwordValid = form.password.length >= 8;

  const roleValid = ROLE_OPTIONS.includes(form.role);

  const technicianValid =
    !isTechnician ||
    (Number.isSafeInteger(technicianId) &&
      technicianId >= 1 &&
      !loadingOptions &&
      !optionError);

  const canSubmit =
    usernameValid && passwordValid && roleValid && technicianValid && !saving;

  const changeField = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  function handleRoleChange(event) {
    const role = event.target.value;

    setForm((previous) => ({
      ...previous,
      role,
      technician_id: role === TECHNICIAN_ROLE ? previous.technician_id : "",
    }));
  }

  async function handleCreate() {
    if (!canSubmit || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/register", {
        username,
        password: form.password,
        role: form.role,
        technician_id: isTechnician ? technicianId : null,
      });

      onCreated?.(response.data);
      onClose();
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 401 || status === 403) {
        setError("You do not have permission to create users.");
      } else if (
        (status === 400 || status === 409) &&
        typeof detail === "string"
      ) {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg)
            .filter(Boolean)
            .join(" "),
        );
      } else {
        setError("Could not create user. Please try again.");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={saving ? undefined : onClose}>
      <DialogTitle>Add User</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            autoFocus
            label="Username"
            value={form.username}
            onChange={changeField("username")}
            error={form.username.length > 0 && !usernameValid}
            helperText="3–50 characters."
          />

          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={changeField("password")}
            error={form.password.length > 0 && !passwordValid}
            helperText="At least 8 characters."
          />

          <TextField
            select
            label="Role"
            value={form.role}
            onChange={handleRoleChange}
          >
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>

          {isTechnician && (
            <>
              {loadingOptions && <CircularProgress size={24} />}

              {optionError && <Alert severity="error">{optionError}</Alert>}

              {!loadingOptions && !optionError && technicians.length === 0 && (
                <Alert severity="warning">
                  No unbound technicians are available.
                </Alert>
              )}

              <TextField
                select
                label="Technician"
                value={form.technician_id}
                onChange={changeField("technician_id")}
                disabled={loadingOptions || Boolean(optionError) || saving}
              >
                {technicians.map((technician) => (
                  <MenuItem key={technician.id} value={String(technician.id)}>
                    {technician.name} — Hospital {technician.hospital_id}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
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

export default CreateUserDialog;
