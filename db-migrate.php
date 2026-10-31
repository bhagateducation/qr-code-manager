<?php
header('Content-Type: application/json');

$host = 'localhost';
$user = 'u599119231_qrmanager';
$pass = 'QrManagerSecurePass2026!';
$db   = 'u599119231_qrmanager';

$mysqli = new mysqli($host, $user, $pass, $db);

if ($mysqli->connect_error) {
    echo json_encode([
        'success' => false,
        'step' => 'connection',
        'error' => $mysqli->connect_error
    ]);
    exit;
}

$queries = [
    // 1. Workspaces
    "CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(191) NOT NULL,
        slug VARCHAR(191) NOT NULL UNIQUE,
        plan VARCHAR(50) DEFAULT 'pro',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 2. Users
    "CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        workspaceId VARCHAR(64) NOT NULL,
        name VARCHAR(191) NOT NULL,
        email VARCHAR(191) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_workspaceId (workspaceId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 3. Systems
    "CREATE TABLE IF NOT EXISTS systems (
        id VARCHAR(64) PRIMARY KEY,
        workspaceId VARCHAR(64) NOT NULL,
        name VARCHAR(191) NOT NULL,
        icon VARCHAR(50) DEFAULT 'layers',
        description TEXT,
        statuses JSON,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sys_workspace (workspaceId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 4. Custom Fields
    "CREATE TABLE IF NOT EXISTS custom_fields (
        id VARCHAR(64) PRIMARY KEY,
        systemId VARCHAR(64) NOT NULL,
        `key` VARCHAR(100) NOT NULL,
        label VARCHAR(191) NOT NULL,
        type VARCHAR(50) NOT NULL,
        isRequired TINYINT(1) DEFAULT 0,
        isUnique TINYINT(1) DEFAULT 0,
        options JSON,
        `order` INT DEFAULT 0,
        INDEX idx_field_system (systemId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 5. Records
    "CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(64) PRIMARY KEY,
        systemId VARCHAR(64) NOT NULL,
        title VARCHAR(191) NOT NULL,
        data JSON,
        status VARCHAR(50) DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rec_system (systemId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 6. QR Codes
    "CREATE TABLE IF NOT EXISTS qr_codes (
        id VARCHAR(64) PRIMARY KEY,
        workspaceId VARCHAR(64) NOT NULL,
        recordId VARCHAR(64),
        shortCode VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(191) NOT NULL,
        type VARCHAR(50) DEFAULT 'dynamic_url',
        targetUrl TEXT NOT NULL,
        routingRules JSON,
        styling JSON,
        scanCount INT DEFAULT 0,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_qr_workspace (workspaceId),
        INDEX idx_qr_shortCode (shortCode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 7. Scan Logs
    "CREATE TABLE IF NOT EXISTS scan_logs (
        id VARCHAR(64) PRIMARY KEY,
        qrCodeId VARCHAR(64) NOT NULL,
        ipHash VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Unknown',
        city VARCHAR(100) DEFAULT 'Unknown',
        device VARCHAR(50) DEFAULT 'Mobile',
        os VARCHAR(50) DEFAULT 'Unknown',
        browser VARCHAR(50) DEFAULT 'Unknown',
        scannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_scan_qr (qrCodeId),
        INDEX idx_scan_time (scannedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 8. Webhooks
    "CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR(64) PRIMARY KEY,
        workspaceId VARCHAR(64) NOT NULL,
        url TEXT NOT NULL,
        secret VARCHAR(100) NOT NULL,
        events JSON,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_webhook_workspace (workspaceId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
];

$results = [];
foreach ($queries as $i => $q) {
    if ($mysqli->query($q)) {
        $results[] = ["query" => $i + 1, "status" => "ok"];
    } else {
        $results[] = ["query" => $i + 1, "status" => "error", "error" => $mysqli->error];
    }
}

// Seed Demo Workspace & Users if empty
$mysqli->query("INSERT IGNORE INTO workspaces (id, name, slug, plan) VALUES ('ws_acme', 'Acme Corp', 'acme-corp', 'pro');");
$mysqli->query("INSERT IGNORE INTO users (id, workspaceId, name, email, passwordHash, role) VALUES 
('usr_owner', 'ws_acme', 'Rahul Kumar', 'owner@qrmanager.io', '$2a$12\$e8z90e.oW7gP0q8.ZtNnCeKqKx8x7sZ7gJ9sP8q7sZ7gJ9sP8q7sZ', 'owner'),
('usr_admin', 'ws_acme', 'Bhagat Education', 'admin@acme.com', '$2a$12\$e8z90e.oW7gP0q8.ZtNnCeKqKx8x7sZ7gJ9sP8q7sZ7gJ9sP8q7sZ', 'admin');");

echo json_encode([
    'success' => true,
    'message' => 'Hostinger MySQL database schema successfully migrated and seeded!',
    'tables_created' => count($results),
    'details' => $results
]);

$mysqli->close();
