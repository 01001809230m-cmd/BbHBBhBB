<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: OPTIONS,GET,POST,PUT,DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit();
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = explode('/', $uri);
$uri = array_values(array_filter($uri));

// Basic Router
// e.g., /api/v1/health
$apiIndex = array_search('api', $uri);
if ($apiIndex !== false && isset($uri[$apiIndex + 1]) && $uri[$apiIndex + 1] === 'v1') {
    $endpoint = $uri[$apiIndex + 2] ?? null;

    if ($endpoint === 'health') {
        echo json_encode(["status" => "ok", "message" => "✅ PHP API Skeleton is running securely!"]);
        exit();
    }
    
    // Placeholder for secure business logic
    // e.g., Supabase admin interactions, Paymob generation, heavy PDF processing
    if ($endpoint === 'secure-action') {
        // Validation logic here
        echo json_encode(["status" => "success", "data" => "This requires Backend-level security."]);
        exit();
    }

    header("HTTP/1.1 404 Not Found");
    echo json_encode(["error" => "API endpoint not found"]);
    exit();
}

header("HTTP/1.1 404 Not Found");
echo json_encode(["error" => "Invalid Route"]);
exit();
?>
