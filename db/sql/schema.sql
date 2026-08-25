CREATE TYPE equipment_status AS ENUM('Available', 'In-Use', 'Maintenance', 'Offline');
CREATE TYPE order_priority AS ENUM('Low', 'Medium', 'Critical');
CREATE TYPE order_status AS ENUM('Pending', 'In-Progress', 'Completed', 'Failed');

CREATE TABLE hospitals(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location_region VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    supervisor_id INTEGER NOT NULL
);


CREATE TABLE technicians(
    id SERIAL PRIMARY KEY, 
    name VARCHAR(100) NOT NULL,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id)
);


CREATE TABLE equipments(
    id SERIAL PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    model VARCHAR(100) ,
    status equipment_status NOT NULL DEFAULT 'Available',
    charge_level NUMERIC(5,2) NOT NULL CHECK (charge_level BETWEEN 0 AND 100),
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id)
);


CREATE TABLE work_orders(
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    priority order_priority NOT NULL,
    status order_status NOT NULL DEFAULT 'Pending',
    equipment_id INTEGER NOT NULL REFERENCES equipments(id),
    technician_id INTEGER NOT NULL REFERENCES technicians(id)
);

CREATE TABLE diagnostic_logs(
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
    file_url TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);