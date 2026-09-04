import { Grid } from "@mui/material";
import DiscrepancyCard from "./DiscrepancyCard.jsx";

function DiscrepancyList({ discrepancy }) {
  return (
    <Grid container spacing={2}>
      {/**
       * The map function is used to iterate over the 'robots' array and render
       * a RobotCard component for each robot
       */}
      {discrepancy.map((discrepancy) => (
        <Grid item key={discrepancy.order_id}>
          <DiscrepancyCard discrepancy={discrepancy} />
        </Grid>
      ))}
    </Grid>
  );
}

export default DiscrepancyList;
