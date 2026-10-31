<?php
header('Content-Type: application/json');

$host = 'localhost';
$user = 'u599119231_qrmanager';
$pass = 'QrManagerSecurePass2026!';
$db   = 'u599119231_qrmanager';

try {
    $mysqli = new mysqli($host, $user, $pass, $db);

    if ($mysqli->connect_error) {
        echo json_encode([
            'success' => false,
            'error' => $mysqli->connect_error,
            'errno' => $mysqli->connect_errno
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Connected successfully to Hostinger MySQL on localhost!',
        'server_info' => $mysqli->server_info,
        'host_info' => $mysqli->host_info
    ]);

    $mysqli->close();
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'exception' => $e->getMessage()
    ]);
}
