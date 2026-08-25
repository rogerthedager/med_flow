INSERT INTO hospitals (
    id,
    name,
    location_region,
    capacity,
    supervisor_id
)
VALUES
    (1, 'Tampa General Hospital', 'US-Southeast', 1200, 101),
    (2, 'BayCare Medical Center', 'US-Southeast', 650, 102),
    (3, 'Orlando Regional Medical Center', 'US-Southeast', 900, 103);


-- ============================================
-- 2. Technicians
-- ============================================

INSERT INTO technicians (
    id,
    name,
    hospital_id
)
VALUES
    (201, 'Alice Johnson', 1),
    (202, 'Michael Chen', 1),
    (203, 'Sarah Williams', 2),
    (204, 'David Martinez', 2),
    (205, 'Emily Brown', 3),
    (206, 'James Wilson', 3);


-- ============================================
-- 3. Equipments
-- ============================================

INSERT INTO equipments (
    id,
    serial_number,
    model,
    status,
    charge_level,
    hospital_id
)
VALUES
    (
        301,
        'EQ-MRI-1001',
        'Siemens Magnetom Aera',
        'Available',
        95.50,
        1
    ),
    (
        302,
        'EQ-VNT-1002',
        'Philips Respironics V60',
        'In-Use',
        72.25,
        1
    ),
    (
        303,
        'EQ-XRY-1003',
        'GE Healthcare Optima XR240',
        'Maintenance',
        45.00,
        2
    ),
    (
        304,
        'EQ-MON-1004',
        'Philips IntelliVue MX450',
        'Available',
        88.75,
        2
    ),
    (
        305,
        'EQ-INF-1005',
        'BD Alaris Infusion Pump',
        'Offline',
        10.50,
        3
    ),
    (
        306,
        'EQ-DEF-1006',
        'ZOLL R Series Defibrillator',
        'In-Use',
        63.40,
        3
    ),
    (
        307,
        'EQ-ECG-1007',
        'GE MAC 2000 ECG',
        'Available',
        100.00,
        1
    ),
    (
        308,
        'EQ-PMP-1008',
        'Baxter Sigma Spectrum Pump',
        'Maintenance',
        35.20,
        2
    );


-- ============================================
-- 4. Work Orders
-- ============================================

INSERT INTO work_orders (
    id,
    title,
    priority,
    status,
    equipment_id,
    technician_id
)
VALUES
    (
        401,
        'MRI calibration inspection',
        'Medium',
        'Pending',
        301,
        201
    ),
    (
        402,
        'Ventilator pressure sensor issue',
        'Critical',
        'In-Progress',
        302,
        202
    ),
    (
        403,
        'X-Ray detector malfunction',
        'Critical',
        'In-Progress',
        303,
        203
    ),
    (
        404,
        'Patient monitor battery replacement',
        'Low',
        'Completed',
        304,
        204
    ),
    (
        405,
        'Infusion pump startup failure',
        'Critical',
        'Failed',
        305,
        205
    ),
    (
        406,
        'Defibrillator preventive maintenance',
        'Medium',
        'Pending',
        306,
        206
    ),
    (
        407,
        'ECG machine routine inspection',
        'Low',
        'Completed',
        307,
        201
    ),
    (
        408,
        'Infusion pump calibration',
        'Medium',
        'Pending',
        308,
        204
    ),

    -- Intentional discrepancy:
    -- equipment 301 belongs to hospital 1
    -- technician 203 belongs to hospital 2
    (
        409,
        'Emergency MRI inspection',
        'Critical',
        'Pending',
        301,
        203
    );


-- ============================================
-- 5. Diagnostic Logs
-- ============================================

INSERT INTO diagnostic_logs (
    id,
    work_order_id,
    file_url,
    notes,
    created_at
)
VALUES
    (
        501,
        401,
        'https://medflow.local/logs/mri-1001-calibration.txt',
        'Initial diagnostic completed. Calibration recommended.',
        '2026-08-20 09:15:00'
    ),
    (
        502,
        402,
        'https://medflow.local/logs/ventilator-1002-pressure.txt',
        'Pressure sensor readings are outside expected range.',
        '2026-08-20 11:30:00'
    ),
    (
        503,
        403,
        'https://medflow.local/logs/xray-1003-detector.txt',
        'Detector communication errors detected during startup.',
        '2026-08-21 08:45:00'
    ),
    (
        504,
        404,
        'https://medflow.local/logs/monitor-1004-battery.txt',
        'Battery replaced successfully and equipment passed validation.',
        '2026-08-21 14:20:00'
    ),
    (
        505,
        405,
        'https://medflow.local/logs/infusion-1005-startup.txt',
        'Device failed power-on self-test. Hardware inspection required.',
        '2026-08-22 10:00:00'
    ),
    (
        506,
        406,
        'https://medflow.local/logs/defib-1006-maintenance.txt',
        'Preventive maintenance inspection scheduled.',
        '2026-08-22 15:40:00'
    ),
    (
        507,
        407,
        'https://medflow.local/logs/ecg-1007-inspection.txt',
        'Routine inspection completed with no issues.',
        '2026-08-23 09:30:00'
    ),
    (
        508,
        408,
        'https://medflow.local/logs/pump-1008-calibration.txt',
        'Calibration drift detected. Adjustment required.',
        '2026-08-23 13:10:00'
    ),
    (
        509,
        409,
        'https://medflow.local/logs/mri-1001-emergency.txt',
        'Emergency inspection requested after abnormal system alert.',
        '2026-08-24 08:25:00'
    );
