import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import apiClient from "../../api/client.js";

function OfflineEquipmentDialog({ onClose, onRestored }) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const restoringRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadOfflineEquipment() {
      try {
        const response = await apiClient.get("/equipments/offline");

        if (active) {
          setEquipments(response.data);
          setLoadError("");
        }
      } catch {
        if (active) {
          setLoadError("Could not load Offline equipment.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOfflineEquipment();

    return () => {
      active = false;
    };
  }, []);

  async function handleRestore(equipment) {
    if (restoringRef.current !== null) return;

    restoringRef.current = equipment.id;
    setRestoringId(equipment.id);
    setActionError("");

    try {
      const response = await apiClient.patch(`/equipments/${equipment.id}`, {
        status: "Available",
      });

      setEquipments((previous) =>
        previous.filter((item) => item.id !== equipment.id),
      );

      onRestored?.(response.data);
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 404) {
        setActionError("Equipment was not found.");
      } else if (status === 401 || status === 403) {
        setActionError("You do not have permission to restore equipment.");
      } else if (typeof detail === "string") {
        setActionError(detail);
      } else {
        setActionError("Could not restore equipment. Please try again.");
      }
    } finally {
      restoringRef.current = null;
      setRestoringId(null);
    }
  }

  return (
    <Dialog
      open
      fullWidth
      maxWidth="md"
      onClose={restoringId === null ? onClose : undefined}
    >
      <DialogTitle>Offline Equipment</DialogTitle>

      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {loadError && <Alert severity="error">{loadError}</Alert>}

        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {actionError}
          </Alert>
        )}

        {!loading && !loadError && equipments.length === 0 && (
          <Alert severity="info">
            There is currently no Offline equipment.
          </Alert>
        )}

        <Stack spacing={1}>
          {equipments.map((equipment) => (
            <Stack
              key={equipment.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
              }}
            >
              <Box>
                <Typography fontWeight="bold">
                  {equipment.serial_number}
                </Typography>

                <Typography color="text.secondary">
                  {equipment.model} · Hospital {equipment.hospital_id}
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={() => handleRestore(equipment)}
                disabled={restoringId !== null}
              >
                {restoringId === equipment.id ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Restore"
                )}
              </Button>
            </Stack>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={restoringId !== null}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OfflineEquipmentDialog;
