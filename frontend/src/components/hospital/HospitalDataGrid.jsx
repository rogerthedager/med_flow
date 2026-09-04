import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import CreateHospitalDialog from "./CreateHospitalDialog.jsx";
import EditHospitalDialog from "./EditHospitalDialog.jsx";
import DeleteHospitalDialog from "./DeleteHospitalDialog.jsx";
const COLUMNS = [
  {
    field: "id",
    headerName: "ID",
    width: 80,
  },
  {
    field: "name",
    headerName: "Hospital",
    flex: 1,
    minWidth: 180,
  },
  {
    field: "location_region",
    headerName: "Region",
    width: 160,
  },
  {
    field: "capacity",
    headerName: "Capacity",
    type: "number",
    width: 130,
  },
  {
    field: "supervisor_id",
    headerName: "Supervisor ID",
    type: "number",
    width: 150,
  },
];

function HospitalDataGrid({ onSuccess }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const canManage = user?.role === "Clinical Admin";
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const columns = canManage
    ? [
        ...COLUMNS,
        {
          field: "actions",
          headerName: "Actions",
          width: 170,
          sortable: false,
          filterable: false,
          disableColumnMenu: true,
          renderCell: ({ row }) => (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Button size="small" onClick={() => setSelectedHospital(row)}>
                Edit
              </Button>

              <Button
                size="small"
                color="error"
                onClick={() => setDeleteTarget(row)}
              >
                Delete
              </Button>
            </Box>
          ),
        },
      ]
    : COLUMNS;
  useEffect(() => {
    let active = true;

    async function loadHospitals() {
      try {
        const response = await apiClient.get("/hospitals");

        if (active) {
          setHospitals(response.data);
          setError("");
        }
      } catch {
        if (active) {
          setError("Could not load hospitals.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHospitals();

    return () => {
      active = false;
    };
  }, []);

  const searchValue = search.trim().toLowerCase();

  const displayedHospitals = hospitals.filter((hospital) => {
    if (!searchValue) return true;

    return (
      hospital.name.toLowerCase().includes(searchValue) ||
      hospital.location_region.toLowerCase().includes(searchValue) ||
      String(hospital.id).includes(searchValue) ||
      String(hospital.supervisor_id).includes(searchValue)
    );
  });
  function handleHospitalCreated(createdHospital) {
    const normalizedHospital = {
      ...createdHospital,
      capacity: Number(createdHospital.capacity),
      supervisor_id: Number(createdHospital.supervisor_id),
    };

    setHospitals((previous) =>
      [
        ...previous.filter((hospital) => hospital.id !== normalizedHospital.id),
        normalizedHospital,
      ].sort((first, second) => first.id - second.id),
    );

    onSuccess?.(`Hospital ${normalizedHospital.name} created.`);
  }
  function handleHospitalUpdated(updatedHospital) {
    const normalizedHospital = {
      ...updatedHospital,
      capacity: Number(updatedHospital.capacity),
      supervisor_id: Number(updatedHospital.supervisor_id),
    };

    setHospitals((previous) =>
      previous.map((hospital) =>
        hospital.id === normalizedHospital.id ? normalizedHospital : hospital,
      ),
    );

    setSelectedHospital(null);

    onSuccess?.(`Hospital ${normalizedHospital.name} updated.`);
  }
  function handleHospitalDeleted(deletedHospital) {
    setHospitals((previous) =>
      previous.filter((hospital) => hospital.id !== deletedHospital.id),
    );

    setDeleteTarget(null);

    onSuccess?.(`Hospital ${deletedHospital.name} deleted.`);
  }
  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {canManage && (
        <Button
          variant="outlined"
          onClick={() => setCreateOpen(true)}
          sx={{ mb: 2 }}
        >
          Add Hospital
        </Button>
      )}
      <TextField
        fullWidth
        size="small"
        label="Search hospitals"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ height: 420, width: "100%" }}>
        <DataGrid
          rows={displayedHospitals}
          columns={columns}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
          }}
        />
      </Box>
      {canManage && createOpen && (
        <CreateHospitalDialog
          onClose={() => setCreateOpen(false)}
          onCreated={handleHospitalCreated}
        />
      )}
      {canManage && selectedHospital && (
        <EditHospitalDialog
          key={selectedHospital.id}
          hospital={selectedHospital}
          onClose={() => setSelectedHospital(null)}
          onUpdated={handleHospitalUpdated}
        />
      )}
      {canManage && deleteTarget && (
        <DeleteHospitalDialog
          key={deleteTarget.id}
          hospital={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleHospitalDeleted}
        />
      )}
    </Box>
  );
}

export default HospitalDataGrid;
