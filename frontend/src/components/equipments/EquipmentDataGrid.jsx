import { useEffect, useMemo, useRef, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Alert,
  Box,
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Switch,
} from "@mui/material";
import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import EditEquipmentDialog from "./EditEquipmentDialog.jsx";
import OfflineEquipmentDialog from "./OfflineEquipmentDialog.jsx";

const BASE_COLUMNS = [
  { field: "id", headerName: "ID", width: 70 },
  { field: "serial_number", headerName: "Serial Number", width: 150 },
  { field: "model", headerName: "Model", width: 160 },
  {
    field: "charge_level",
    headerName: "Battery %",
    width: 120,
    type: "number",
  },
  { field: "status", headerName: "Status", width: 130 },
  {
    field: "hospital_id",
    headerName: "Hospital ID",
    width: 110,
    type: "number",
  },
];

const STATUS_OPTIONS = ["Available", "In-Use", "Maintenance", "Offline"];

function EquipmentDataGrid({ onSuccess, onEquipmentChanged }) {
  const { user } = useAuth();

  const canCreate = user?.role === "Clinical Admin";
  const isTechnician = user?.role === "Field Technician";
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    serial_number: "",
    model: "",
    charge_level: "",
    hospital_id: "",
    status: "Available",
  });
  const [onlyLowCharge, setOnlyLowCharge] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const lowChargeEquipments = equipments.filter(
    (equipment) =>
      equipment.status !== "Offline" && Number(equipment.charge_level) < 20,
  );
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [offlineDialogOpen, setOfflineDialogOpen] = useState(false);

  const deletingRef = useRef(false);
  const displayedEquipments = onlyLowCharge ? lowChargeEquipments : equipments;
  const columns = useMemo(() => {
    if (!canCreate) return BASE_COLUMNS;

    return [
      ...BASE_COLUMNS,
      {
        field: "actions",
        headerName: "Actions",
        width: 170,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setSelectedEquipment(row)}>
              Edit
            </Button>

            <Button
              size="small"
              color="error"
              onClick={() => {
                setDeleteTarget(row);
                setDeleteError("");
              }}
            >
              Delete
            </Button>
          </Stack>
        ),
      },
    ];
  }, [canCreate]);
  async function fetchEquipments() {
    setLoading(true);
    try {
      const response = await apiClient.get("/equipments");
      setEquipments(
        response.data.map((equipment) => ({
          ...equipment,
          charge_level: Number(equipment.charge_level),
        })),
      );
      setError(null);
    } catch {
      setError("Could not load fleet data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleFieldChange = (field) => (event) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreate = async () => {
    try {
      await apiClient.post("/equipments", {
        ...formValues,
        charge_level: Number(formValues.charge_level),
        hospital_id: Number(formValues.hospital_id),
      });
      setDialogOpen(false);
      setFormValues({
        serial_number: "",
        model: "",
        charge_level: "",
        hospital_id: "",
        status: "Available",
      });
      onSuccess(`Equipment ${formValues.serial_number} created.`);
      await fetchEquipments();
      onEquipmentChanged?.(); //see the table data refreshed with the new equipment
    } catch {
      //a real app would surface this inline in the dialog
    }
  };
  function handleEquipmentUpdated(updatedEquipment) {
    const normalizedEquipment = {
      ...updatedEquipment,
      charge_level: Number(updatedEquipment.charge_level),
    };

    setEquipments((previous) => {
      if (normalizedEquipment.status === "Offline") {
        return previous.filter(
          (equipment) => equipment.id !== normalizedEquipment.id,
        );
      }

      return previous.map((equipment) =>
        equipment.id === normalizedEquipment.id
          ? normalizedEquipment
          : equipment,
      );
    });

    setSelectedEquipment(null);

    onSuccess?.(`Equipment ${normalizedEquipment.serial_number} updated.`);

    onEquipmentChanged?.();
  }
  function handleEquipmentRestored(restoredEquipment) {
    const normalizedEquipment = {
      ...restoredEquipment,
      charge_level: Number(restoredEquipment.charge_level),
    };

    setEquipments((previous) =>
      [
        ...previous.filter(
          (equipment) => equipment.id !== normalizedEquipment.id,
        ),
        normalizedEquipment,
      ].sort((first, second) => first.id - second.id),
    );

    onSuccess?.(`Equipment ${normalizedEquipment.serial_number} restored.`);

    onEquipmentChanged?.();
  }
  function closeDeleteDialog() {
    if (deletingRef.current) return;

    setDeleteTarget(null);
    setDeleteError("");
  }

  async function handleDeleteEquipment() {
    if (!deleteTarget || deletingRef.current) return;

    const target = deleteTarget;

    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");

    try {
      await apiClient.delete(`/equipments/${target.id}`);

      setEquipments((previous) =>
        previous.filter((equipment) => equipment.id !== target.id),
      );

      setDeleteTarget(null);

      onSuccess?.(`Equipment ${target.serial_number} deleted.`);
      onEquipmentChanged?.();
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 409 && typeof detail === "string") {
        setDeleteError(detail);
      } else if (status === 404) {
        setDeleteError("Equipment was not found. It may already be deleted.");
      } else if (status === 401 || status === 403) {
        setDeleteError("You do not have permission to delete equipment.");
      } else {
        setDeleteError("Could not delete equipment. Please try again.");
      }
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }
  //shows a spinning progress indicator if loading data
  if (loading) return <CircularProgress />;
  //shows error alert if API call fails
  if (error) return <Alert severity="error">{error}</Alert>;

  //loads data grid component if all goes well
  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Low Charge Alert</Typography>

          <Typography
            variant="h3"
            sx={{
              color:
                lowChargeEquipments.length > 0 ? "error.main" : "success.main",
            }}
          >
            {lowChargeEquipments.length}
          </Typography>

          <Typography color="text.secondary">
            {isTechnician
              ? "Your assigned devices below 20% charge, excluding Offline."
              : "Devices below 20% charge across all hospitals, excluding Offline."}
          </Typography>
        </CardContent>
      </Card>

      <FormControlLabel
        control={
          <Switch
            checked={onlyLowCharge}
            onChange={(event) => setOnlyLowCharge(event.target.checked)}
          />
        }
        label="Show only devices below 20%"
      />
      {canCreate && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Button variant="outlined" onClick={() => setDialogOpen(true)}>
            Add Equipment
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setOfflineDialogOpen(true)}
          >
            Manage Offline
          </Button>
        </Stack>
      )}
      <Box sx={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={displayedEquipments}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </Box>

      <Dialog
        open={canCreate && dialogOpen}
        onClose={() => setDialogOpen(false)}
      >
        <DialogTitle>Add New Equipment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            <TextField
              label="Serial Number"
              value={formValues.serial_number}
              onChange={handleFieldChange("serial_number")}
            />
            <TextField
              label="Model"
              value={formValues.model}
              onChange={handleFieldChange("model")}
            />
            <TextField
              label="Charge Level"
              type="number"
              value={formValues.charge_level}
              onChange={handleFieldChange("charge_level")}
            />
            <TextField
              label="Hospital ID"
              type="number"
              value={formValues.hospital_id}
              onChange={handleFieldChange("hospital_id")}
            />
            <TextField
              select
              label="Status"
              value={formValues.status}
              onChange={handleFieldChange("status")}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
      {selectedEquipment && (
        <EditEquipmentDialog
          key={selectedEquipment.id}
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onUpdated={handleEquipmentUpdated}
        />
      )}

      <Dialog
        open={canCreate && Boolean(deleteTarget)}
        onClose={closeDeleteDialog}
      >
        <DialogTitle>Delete Equipment?</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete equipment{" "}
            <strong>{deleteTarget?.serial_number}</strong>?
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Equipment connected to existing work orders cannot be deleted. Set
            its status to Offline instead.
          </Typography>

          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleting}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteEquipment}
            disabled={deleting}
          >
            {deleting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>
      {canCreate && offlineDialogOpen && (
        <OfflineEquipmentDialog
          onClose={() => setOfflineDialogOpen(false)}
          onRestored={handleEquipmentRestored}
        />
      )}
    </Box>
  );
}

export default EquipmentDataGrid;
