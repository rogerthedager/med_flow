-- Seed-only answers, unaffected by the original demo rows in the same database.
-- Remove the fixture ID restrictions to query the complete production dataset.
-- BQ1: Active means not Offline (including Maintenance), matching the current API.
SELECT id, serial_number, model, status, charge_level, hospital_id
FROM equipments
WHERE id BETWEEN 9301 AND 9308 AND status <> 'Offline' AND charge_level < 20
ORDER BY id;

-- BQ2: A device may have multiple discrepant orders. The business question counts DISTINCT devices.
SELECT COUNT(*) AS discrepant_orders, COUNT(DISTINCT e.id) AS discrepant_devices
FROM work_orders w
JOIN equipments e ON e.id = w.equipment_id
JOIN technicians t ON t.id = w.technician_id
WHERE w.id BETWEEN 9401 AND 9406 AND e.hospital_id <> t.hospital_id;

-- BQ2P: Priority filter used by the current discrepancy grid.
SELECT w.priority, COUNT(*) AS discrepant_orders, COUNT(DISTINCT e.id) AS discrepant_devices
FROM work_orders w
JOIN equipments e ON e.id = w.equipment_id
JOIN technicians t ON t.id = w.technician_id
WHERE w.id BETWEEN 9401 AND 9406 AND e.hospital_id <> t.hospital_id
GROUP BY w.priority ORDER BY w.priority::text;

-- BQ3: Ratio = completed / failed; completion rate uses only resolved (Completed + Failed) orders.
-- No ServiceReport join: multiple reports must not multiply the number of work orders.
SELECT e.model,
       COUNT(w.id) AS total_orders,
       COUNT(w.id) FILTER (WHERE w.status = 'Completed') AS completed,
       COUNT(w.id) FILTER (WHERE w.status = 'Failed') AS failed,
       ROUND((COUNT(w.id) FILTER (WHERE w.status = 'Completed'))::numeric /
             NULLIF(COUNT(w.id) FILTER (WHERE w.status = 'Failed'), 0), 2) AS completion_failure_ratio,
       ROUND(100.0 * COUNT(w.id) FILTER (WHERE w.status = 'Completed') /
             NULLIF(COUNT(w.id) FILTER (WHERE w.status IN ('Completed', 'Failed')), 0), 2) AS completion_rate_pct
FROM equipments e
LEFT JOIN work_orders w ON w.equipment_id = e.id AND w.id BETWEEN 9401 AND 9406
WHERE e.id BETWEEN 9301 AND 9308
GROUP BY e.model ORDER BY e.model;

-- BQ4: Denominator includes ALL equipment, including Offline. Exactly 30% must not be flagged.
SELECT h.id AS hospital_id, h.name, COUNT(e.id) AS equipment_count,
       COUNT(e.id) FILTER (WHERE e.status = 'Maintenance') AS maintenance_count,
       ROUND(100.0 * COUNT(e.id) FILTER (WHERE e.status = 'Maintenance') /
             NULLIF(COUNT(e.id), 0), 2) AS maintenance_pct,
       100 * COUNT(e.id) FILTER (WHERE e.status = 'Maintenance') > 30 * COUNT(e.id) AS flagged
FROM hospitals h
LEFT JOIN equipments e ON e.hospital_id = h.id AND e.id BETWEEN 9301 AND 9308
WHERE h.id BETWEEN 9101 AND 9103
GROUP BY h.id, h.name ORDER BY h.id;

-- BQ5: Follow the TECHNICIAN's hospital/supervisor, even on cross-site work orders.
-- Active work = Pending or In-Progress. Count each technician once, regardless of order count.
SELECT h.supervisor_id, COUNT(DISTINCT t.id) AS total_technicians,
       COUNT(DISTINCT t.id) FILTER (WHERE w.id IS NOT NULL) AS technicians_with_active_orders,
       COUNT(w.id) AS active_orders
FROM hospitals h
LEFT JOIN technicians t ON t.hospital_id = h.id AND t.id BETWEEN 9201 AND 9203
LEFT JOIN work_orders w ON w.technician_id = t.id AND w.id BETWEEN 9401 AND 9406
                         AND w.status IN ('Pending', 'In-Progress')
WHERE h.id BETWEEN 9101 AND 9103
GROUP BY h.supervisor_id ORDER BY h.supervisor_id;
