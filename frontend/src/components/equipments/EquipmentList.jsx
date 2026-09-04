import { Grid } from "@mui/material";
import EquipmentCard from "./EquipmentCard.jsx";

function EquipmentList({ equipments }) {
  return (
    <Grid container spacing={2}>
      {equipments.map((equipment) => (
        <Grid item key={equipment.id}>
          <EquipmentCard equipment={equipment} />
        </Grid>
      ))}
    </Grid>
  );
}

export default EquipmentList;
