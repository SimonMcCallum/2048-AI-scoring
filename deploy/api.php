<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Ensure data directory exists
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/api/save-game-data') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }
    
    $sessionId = $input['sessionId'] ?? 'unknown';
    $timestamp = date('Y-m-d_H-i-s');
    
    // Save session data as JSON
    $jsonFile = $dataDir . '/game_session_' . $sessionId . '.json';
    file_put_contents($jsonFile, json_encode($input, JSON_PRETTY_PRINT));
    
    // Save moves as CSV
    $csvFile = $dataDir . '/game_moves_' . $sessionId . '.csv';
    $csvHandle = fopen($csvFile, 'w');
    
    if ($csvHandle) {
        // Write CSV header
        fputcsv($csvHandle, [
            'Session ID', 'Player Name', 'Game Mode', 'Move Number', 
            'Timestamp', 'Direction', 'Score', 'Board State', 
            'Move Time', 'Tiles Added', 'Tiles Removed'
        ]);
        
        // Write move data
        foreach ($input['moves'] as $move) {
            fputcsv($csvHandle, [
                $move['sessionId'] ?? '',
                $move['playerName'] ?? '',
                $move['gameMode'] ?? '',
                $move['moveNumber'] ?? '',
                $move['timestamp'] ?? '',
                $move['direction'] ?? '',
                $move['score'] ?? '',
                $move['boardState'] ?? '',
                $move['moveTime'] ?? '',
                $move['tilesAdded'] ?? '',
                $move['tilesRemoved'] ?? ''
            ]);
        }
        fclose($csvHandle);
    }
    
    // Append to summary CSV
    $summaryFile = $dataDir . '/player_sessions.csv';
    $fileExists = file_exists($summaryFile);
    $summaryHandle = fopen($summaryFile, 'a');
    
    if ($summaryHandle) {
        if (!$fileExists) {
            fputcsv($summaryHandle, [
                'Session ID', 'Player Name', 'Game Mode', 'Start Time', 'End Time',
                'Final Score', 'Highest Tile', 'Total Moves', 'Game Time'
            ]);
        }
        
        fputcsv($summaryHandle, [
            $input['sessionId'] ?? '',
            $input['playerName'] ?? '',
            $input['gameMode'] ?? '',
            $input['startTime'] ?? '',
            $input['endTime'] ?? '',
            $input['finalScore'] ?? '',
            $input['highestTile'] ?? '',
            $input['totalMoves'] ?? '',
            $input['gameTime'] ?? ''
        ]);
        fclose($summaryHandle);
    }
    
    echo json_encode(['success' => true, 'message' => 'Game data saved successfully']);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $_SERVER['REQUEST_URI'] === '/api/list-sessions') {
    // List all saved sessions
    $sessions = [];
    $files = glob($dataDir . '/game_session_*.json');
    
    foreach ($files as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data) {
            $sessions[] = [
                'sessionId' => $data['sessionId'],
                'playerName' => $data['playerName'],
                'gameMode' => $data['gameMode'],
                'finalScore' => $data['finalScore'],
                'endTime' => $data['endTime']
            ];
        }
    }
    
    echo json_encode($sessions);
    
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}
?>
