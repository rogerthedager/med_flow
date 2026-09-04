import { useEffect, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import apiClient from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import CreateOrderDialog from "./CreateOrderDialog.jsx";
import EditOrderDialog from "./EditOrderDialog.jsx";
import DeleteOrderDialog from "./DeleteOrderDialog.jsx";
import ServiceReportDialog from "./ServiceReportDialog.jsx";
const STATUS_OPTIONS = ["Pending", "In-Progress", "Completed", "Failed"];

const BASE_COLUMNS = [
  { field: "id", headerName: "ID", width: 80 },
  { field: "title", headerName: "Title", width: 240 },
  { field: "priority", headerName: "Priority", width: 110 },
  { field: "status", headerName: "Status", width: 140 },
  {
    field: "equipment_id",
    headerName: "Equipment ID",
    type: "number",
    width: 130,
  },
  {
    field: "technician_id",
    headerName: "Technician ID",
    type: "number",
    width: 140,
  },
];

function getErrorMessage(error, fallback) {
  const status = error.response?.status;

  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404)
    return "This order no longer exists or is not assigned to you.";

  const detail = error.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

function OrderDataGrid({ onSuccess, onStatusChanged }) {
  const { user } = useAuth();

  // 保持与你现有后端的角色拼写一致。
  const canChangeStatus =
    user?.role === "Clinical Admin" || user?.role === "Field Technician";
  const canManage = user?.role === "Clinical Admin";
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [reportOrder, setReportOrder] = useState(null);
  useEffect(() => {
    let active = true;

    async function fetchOrders() {
      try {
        const response = await apiClient.get("/orders");

        if (active) {
          setOrders(response.data);
          setError(null);
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, "Could not load work orders."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      active = false;
    };
  }, []);

  const columns = useMemo(() => {
    return [
      ...BASE_COLUMNS,
      {
        field: "actions",
        headerName: "Actions",
        width: canManage ? 430 : canChangeStatus ? 260 : 110,
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
            <Button size="small" onClick={() => setReportOrder(row)}>
              Reports
            </Button>
            {canManage && (
              <Button size="small" onClick={() => setEditingOrder(row)}>
                Edit
              </Button>
            )}

            {canChangeStatus && (
              <Button
                size="small"
                onClick={() => {
                  setSelectedOrder(row);
                  setSelectedStatus(row.status);
                  setSaveError(null);
                }}
              >
                Change Status
              </Button>
            )}
            {canManage && (
              <Button
                size="small"
                color="error"
                onClick={() => setDeleteTarget(row)}
              >
                Delete
              </Button>
            )}
          </Box>
        ),
      },
    ];
  }, [canChangeStatus, canManage]);

  const displayedOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) =>
      BASE_COLUMNS.some(({ field }) =>
        String(order[field] ?? "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [orders, search]);

  function closeDialog() {
    if (saving) return;
    setSelectedOrder(null);
    setSaveError(null);
  }

  async function handleSave() {
    if (
      !canChangeStatus ||
      !selectedOrder ||
      saving ||
      !STATUS_OPTIONS.includes(selectedStatus) ||
      selectedStatus === selectedOrder.status
    ) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    let updatedOrder;

    try {
      const response = await apiClient.patch(
        `/orders/${selectedOrder.id}/status`,
        { status: selectedStatus },
      );

      updatedOrder = response.data;
    } catch (error) {
      setSaveError(
        getErrorMessage(error, "Could not update the order status."),
      );
      return;
    } finally {
      setSaving(false);
    }

    // 使用后端返回的数据更新这一行。
    setOrders((previous) =>
      previous.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order,
      ),
    );

    setSelectedOrder(null);
    onSuccess?.(`Order ${updatedOrder.id} updated.`);
    onStatusChanged?.();
  }
  function handleOrderCreated(createdOrder) {
    setOrders((previous) =>
      [
        ...previous.filter((order) => order.id !== createdOrder.id),
        createdOrder,
      ].sort((a, b) => a.id - b.id),
    );

    setSearch("");
    setError(null);

    onSuccess?.(`Order ${createdOrder.id} created.`);
    onStatusChanged?.();
  }
  function handleOrderUpdated(updatedOrder) {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order,
      ),
    );

    setEditingOrder(null);
    setError(null);

    onSuccess?.(`Order ${updatedOrder.id} updated.`);
    onStatusChanged?.();
  }
  function handleOrderDeleted(deletedOrder) {
    setOrders((previous) =>
      previous.filter((order) => order.id !== deletedOrder.id),
    );

    setDeleteTarget(null);

    setEditingOrder((current) =>
      current?.id === deletedOrder.id ? null : current,
    );

    setSelectedOrder((current) =>
      current?.id === deletedOrder.id ? null : current,
    );

    onSuccess?.(`Order ${deletedOrder.id} deleted.`);
    onStatusChanged?.();
  }
  return (
    <Box>
      <CreateOrderDialog
        onCreated={handleOrderCreated}
        disabled={loading || Boolean(error) || saving}
      />
      <TextField
        label="Search work orders"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 420, width: "100%" }}>
        <DataGrid
          rows={displayedOrders}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
        />
      </Box>

      <Dialog
        open={canChangeStatus && Boolean(selectedOrder)}
        onClose={closeDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Change Status — Order #{selectedOrder?.id}</DialogTitle>

        <DialogContent>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}

          <TextField
            select
            label="Status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            disabled={saving}
            fullWidth
            sx={{ mt: 1 }}
          >
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              saving ||
              !selectedStatus ||
              selectedStatus === selectedOrder?.status
            }
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
      {canManage && editingOrder && (
        <EditOrderDialog
          key={editingOrder.id}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onUpdated={handleOrderUpdated}
        />
      )}
      {canManage && deleteTarget && (
        <DeleteOrderDialog
          key={deleteTarget.id}
          order={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleOrderDeleted}
        />
      )}
      {reportOrder && (
        <ServiceReportDialog
          key={reportOrder.id}
          order={reportOrder}
          onClose={() => setReportOrder(null)}
          onSuccess={onSuccess}
        />
      )}
    </Box>
  );
}

export default OrderDataGrid;
