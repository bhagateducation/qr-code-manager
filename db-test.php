<?php
header('Content-Type: application/json');

$secretToken = 'TQD5UCaP4pq0KxGKA9yoqHxPS6XxFhYEJjEN0YXS55ee375b';
$providedToken = $_GET['token'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

if (strpos($providedToken, $secretToken) === false) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

echo json_encode(['status' => 'Database online']);
