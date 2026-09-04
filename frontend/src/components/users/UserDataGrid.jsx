import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, TextField } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import apiClient from "../../api/client.js";
import CreateUserDialog from "./CreateUserDialog.jsx";
const COLUMNS = [
  {
    field: "id",
    headerName: "ID",
    width: 80,
  },
  {
    field: "username",
    headerName: "Username",
    flex: 1,
    minWidth: 160,
  },
  {
    field: "role",
    headerName: "Role",
    width: 170,
  },
  {
    field: "technician_id",
    headerName: "Technician ID",
    type: "number",
    width: 150,
  },
  {
    field: "is_active",
    headerName: "Active",
    type: "boolean",
    width: 110,
  },
];

function UserDataGrid({ onSuccess }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const response = await apiClient.get("/users");

        if (active) {
          setUsers(response.data);
          setError("");
        }
      } catch (requestError) {
        if (!active) return;

        const status = requestError.response?.status;

        if (status === 401 || status === 403) {
          setError("You do not have permission to view users.");
        } else {
          setError("Could not load users.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const displayedUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) =>
      [
        user.id,
        user.username,
        user.role,
        user.technician_id,
        user.is_active ? "active" : "inactive",
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [users, search]);
  function handleUserCreated(createdUser) {
    setUsers((previous) =>
      [
        ...previous.filter((user) => user.id !== createdUser.id),
        createdUser,
      ].sort((first, second) => first.id - second.id),
    );

    setSearch("");
    setError("");

    onSuccess?.(`User ${createdUser.username} created.`);
  }
  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={() => setCreateOpen(true)}
        sx={{ mb: 2 }}
      >
        Add User
      </Button>
      <TextField
        fullWidth
        size="small"
        label="Search users"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 2 }}
      />

      <Box sx={{ height: 420, width: "100%" }}>
        <DataGrid
          rows={displayedUsers}
          columns={COLUMNS}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: {
              paginationModel: {
                page: 0,
                pageSize: 10,
              },
            },
          }}
        />
      </Box>
      {createOpen && (
        <CreateUserDialog
          onClose={() => setCreateOpen(false)}
          onCreated={handleUserCreated}
        />
      )}
    </Box>
  );
}

export default UserDataGrid;
