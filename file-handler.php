<?php
// file-handler.php - Dell EV Charging slot data handler

// CORS headers for cross-device access
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Dell-Client');

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration - ADJUST THESE PATHS FOR YOUR DELL SERVER
$dataDir = '/var/www/dell-ev-charging/data/';  // Change to your data directory
$dataFile = $dataDir . 'ev-slots.json';
$backupFile = $dataDir . 'ev-slots-backup.json';
$logFile = $dataDir . 'ev-charging.log';

// Ensure data directory exists
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Initialize with default data if file doesn't exist
if (!file_exists($dataFile)) {
    $defaultSlots = [
        ['id' => 'A1', 'status' => 'available'],
        ['id' => 'A2', 'status' => 'available'],
        ['id' => 'A3', 'status' => 'available'],
        ['id' => 'A4', 'status' => 'available'],
        ['id' => 'A5', 'status' => 'available'],
        ['id' => 'B1', 'status' => 'available'],
        ['id' => 'B2', 'status' => 'available'],
        ['id' => 'B3', 'status' => 'available'],
        ['id' => 'B4', 'status' => 'available'],
        ['id' => 'B5', 'status' => 'available']
    ];
    
    file_put_contents($dataFile, json_encode($defaultSlots, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    logActivity("INIT", "Created default slots data file", count($defaultSlots));
}

// Logging function
function logActivity($action, $message = '', $slotCount = null) {
    global $logFile;
    
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'unknown', 0, 100);
    $client = $_SERVER['HTTP_X_DELL_CLIENT'] ?? 'unknown';
    
    $logEntry = "[$timestamp] [$ip] [$client] $action";
    if ($message) $logEntry .= " - $message";
    if ($slotCount !== null) $logEntry .= " (slots: $slotCount)";
    $logEntry .= " - UA: $userAgent
";
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Read current data
function readSlotsData() {
    global $dataFile;
    
    if (!file_exists($dataFile)) {
        return null;
    }
    
    $data = file_get_contents($dataFile);
    if ($data === false) {
        return null;
    }
    
    return json_decode($data, true);
}

// Write data with backup
function writeSlotsData($slots) {
    global $dataFile, $backupFile;
    
    // Create backup before writing
    if (file_exists($dataFile)) {
        copy($dataFile, $backupFile);
    }
    
    // Write new data with file locking
    $jsonData = json_encode($slots, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $result = file_put_contents($dataFile, $jsonData, LOCK_EX);
    
    return $result !== false;
}

// Handle different request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Read and return current slots data
        try {
            $slots = readSlotsData();
            
            if ($slots === null) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Could not read slots data'
                ]);
                logActivity("READ_ERROR", "Failed to read data file");
                break;
            }
            
            // Calculate stats
            $available = 0;
            $occupied = 0;
            foreach ($slots as $slot) {
                if ($slot['status'] === 'available') $available++;
                else $occupied++;
            }
            
            $response = [
                'success' => true,
                'data' => $slots,
                'timestamp' => date('c'),
                'lastModified' => date('c', filemtime($dataFile)),
                'stats' => [
                    'available' => $available,
                    'occupied' => $occupied,
                    'total' => count($slots),
                    'utilization' => count($slots) > 0 ? round(($occupied / count($slots)) * 100) : 0
                ]
            ];
            
            echo json_encode($response);
            logActivity("READ", "Data retrieved successfully", count($slots));
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
            logActivity("READ_EXCEPTION", $e->getMessage());
        }
        break;
        
    case 'POST':
        // Save new slots data
        try {
            $input = file_get_contents('php://input');
            $slots = json_decode($input, true);
            
            if ($slots === null) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON data'
                ]);
                logActivity("SAVE_ERROR", "Invalid JSON received");
                break;
            }
            
            // Validate data structure
            foreach ($slots as $slot) {
                if (!isset($slot['id']) || !isset($slot['status'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Invalid slot data structure'
                    ]);
                    logActivity("SAVE_ERROR", "Invalid slot data structure");
                    break 2;
                }
            }
            
            // Save data
            $success = writeSlotsData($slots);
            
            if ($success) {
                // Calculate occupied slots for logging
                $occupiedSlots = array_filter($slots, function($slot) {
                    return $slot['status'] === 'occupied';
                });
                
                $response = [
                    'success' => true,
                    'message' => 'Slots data saved successfully',
                    'timestamp' => date('c'),
                    'slotsCount' => count($slots),
                    'occupiedCount' => count($occupiedSlots)
                ];
                
                echo json_encode($response);
                
                $occupiedEmails = array_map(function($slot) {
                    return isset($slot['user']['email']) ? $slot['user']['email'] : 'unknown';
                }, $occupiedSlots);
                
                logActivity("SAVE", "Data saved successfully - Occupied: " . implode(', ', $occupiedEmails), count($slots));
                
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to save data to file'
                ]);
                logActivity("SAVE_ERROR", "Failed to write to file");
            }
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
            logActivity("SAVE_EXCEPTION", $e->getMessage());
        }
        break;
        
    case 'DELETE':
        // Reset to default data (admin function)
        try {
            $defaultSlots = [
                ['id' => 'A1', 'status' => 'available'],
                ['id' => 'A2', 'status' => 'available'],
                ['id' => 'A3', 'status' => 'available'],
                ['id' => 'A4', 'status' => 'available'],
                ['id' => 'A5', 'status' => 'available'],
                ['id' => 'B1', 'status' => 'available'],
                ['id' => 'B2', 'status' => 'available'],
                ['id' => 'B3', 'status' => 'available'],
                ['id' => 'B4', 'status' => 'available'],
                ['id' => 'B5', 'status' => 'available']
            ];
            
            $success = writeSlotsData($defaultSlots);
            
            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Slots data reset to defaults',
                    'timestamp' => date('c')
                ]);
                logActivity("RESET", "System reset to default slots", count($defaultSlots));
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Failed to reset data'
                ]);
                logActivity("RESET_ERROR", "Failed to reset data");
            }
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server error: ' . $e->getMessage()
            ]);
            logActivity("RESET_EXCEPTION", $e->getMessage());
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed'
        ]);
        logActivity("METHOD_ERROR", "Method not allowed: " . $_SERVER['REQUEST_METHOD']);
        break;
}

// Clean up old log entries (keep last 1000 lines)
if (file_exists($logFile) && filesize($logFile) > 1024 * 1024) { // If log > 1MB
    $lines = file($logFile);
    if (count($lines) > 1000) {
        $recentLines = array_slice($lines, -1000);
        file_put_contents($logFile, implode('', $recentLines));
    }
}
?>
