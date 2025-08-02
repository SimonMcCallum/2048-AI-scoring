const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;
const HOST = '127.0.0.1';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
fs.ensureDirSync(dataDir);

console.log('📁 Data directory:', dataDir);

// API Routes

// Save game data
app.post('/api/save-game-data', async (req, res) => {
    try {
        const gameData = req.body;
        
        if (!gameData || !gameData.sessionId) {
            return res.status(400).json({ error: 'Invalid game data' });
        }

        const sessionId = gameData.sessionId;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Save complete session data as JSON
        const jsonFile = path.join(dataDir, `game_session_${sessionId}.json`);
        await fs.writeJson(jsonFile, gameData, { spaces: 2 });

        // Save moves as CSV
        const csvFile = path.join(dataDir, `game_moves_${sessionId}.csv`);
        const csvContent = generateMovesCSV(gameData);
        await fs.writeFile(csvFile, csvContent);

        // Append to summary CSV
        const summaryFile = path.join(dataDir, 'player_sessions.csv');
        await appendToSummaryCSV(summaryFile, gameData);

        console.log(`💾 Saved game data for session: ${sessionId}`);
        console.log(`   Player: ${gameData.playerName}, Mode: ${gameData.gameMode}, Score: ${gameData.finalScore}`);

        res.json({ 
            success: true, 
            message: 'Game data saved successfully',
            sessionId: sessionId,
            files: {
                json: `game_session_${sessionId}.json`,
                csv: `game_moves_${sessionId}.csv`,
                summary: 'player_sessions.csv'
            }
        });

    } catch (error) {
        console.error('❌ Error saving game data:', error);
        res.status(500).json({ error: 'Failed to save game data', details: error.message });
    }
});

// Get all game sessions
app.get('/api/list-sessions', async (req, res) => {
    try {
        const files = await fs.readdir(dataDir);
        const sessionFiles = files.filter(file => file.startsWith('game_session_') && file.endsWith('.json'));
        
        const sessions = [];
        
        for (const file of sessionFiles) {
            try {
                const filePath = path.join(dataDir, file);
                const data = await fs.readJson(filePath);
                sessions.push({
                    sessionId: data.sessionId,
                    playerName: data.playerName,
                    gameMode: data.gameMode,
                    finalScore: data.finalScore,
                    highestTile: data.highestTile,
                    totalMoves: data.totalMoves,
                    gameTime: data.gameTime,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    moves: data.moves || []
                });
            } catch (err) {
                console.warn(`⚠️  Failed to read session file ${file}:`, err.message);
            }
        }

        // Sort by start time (newest first)
        sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        console.log(`📊 Retrieved ${sessions.length} game sessions`);
        res.json(sessions);

    } catch (error) {
        console.error('❌ Error listing sessions:', error);
        res.status(500).json({ error: 'Failed to list sessions', details: error.message });
    }
});

// Get detailed session data
app.get('/api/session/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const filePath = path.join(dataDir, `game_session_${sessionId}.json`);
        
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const sessionData = await fs.readJson(filePath);
        res.json(sessionData);

    } catch (error) {
        console.error('❌ Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session data', details: error.message });
    }
});

// Get analytics data
app.get('/api/analytics', async (req, res) => {
    try {
        const { player, mode, startDate, endDate } = req.query;
        
        // Get all sessions
        const sessionsResponse = await new Promise((resolve) => {
            app.request = { query: {} };
            app.get('/api/list-sessions', (req, res) => {
                resolve(res);
            });
        });

        // This is a simplified version - in practice, you'd filter the data here
        res.json({ message: 'Analytics endpoint - use /api/list-sessions for now' });

    } catch (error) {
        console.error('❌ Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics data', details: error.message });
    }
});

// Export all data
app.get('/api/export', async (req, res) => {
    try {
        const files = await fs.readdir(dataDir);
        const sessionFiles = files.filter(file => file.startsWith('game_session_') && file.endsWith('.json'));
        
        const allData = {
            exportDate: new Date().toISOString(),
            totalSessions: sessionFiles.length,
            sessions: []
        };

        for (const file of sessionFiles) {
            try {
                const filePath = path.join(dataDir, file);
                const data = await fs.readJson(filePath);
                allData.sessions.push(data);
            } catch (err) {
                console.warn(`⚠️  Failed to read session file ${file}:`, err.message);
            }
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="2048_game_data_export_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(allData);

    } catch (error) {
        console.error('❌ Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data', details: error.message });
    }
});

// Helper Functions

function generateMovesCSV(gameData) {
    const headers = [
        'Session ID', 'Player Name', 'Game Mode', 'Move Number', 
        'Timestamp', 'Direction', 'Score', 'Board State', 
        'Move Time', 'Tiles Added', 'Tiles Removed', 'Is Bad Move'
    ];

    let csv = headers.join(',') + '\n';

    if (gameData.moves && Array.isArray(gameData.moves)) {
        gameData.moves.forEach(move => {
            const row = [
                move.sessionId || gameData.sessionId,
                `"${move.playerName || gameData.playerName}"`,
                move.gameMode || gameData.gameMode,
                move.moveNumber || 0,
                move.timestamp || '',
                move.direction || '',
                move.score || 0,
                `"${move.boardState || ''}"`,
                move.moveTime || 0,
                move.tilesAdded || 0,
                move.tilesRemoved || 0,
                move.isBadMove || false
            ];
            csv += row.join(',') + '\n';
        });
    }

    return csv;
}

async function appendToSummaryCSV(summaryFile, gameData) {
    const headers = [
        'Session ID', 'Player Name', 'Game Mode', 'Start Time', 'End Time',
        'Final Score', 'Highest Tile', 'Total Moves', 'Game Time'
    ];

    let fileExists = await fs.pathExists(summaryFile);
    
    if (!fileExists) {
        await fs.writeFile(summaryFile, headers.join(',') + '\n');
    }

    const row = [
        gameData.sessionId || '',
        `"${gameData.playerName || ''}"`,
        gameData.gameMode || '',
        gameData.startTime || '',
        gameData.endTime || '',
        gameData.finalScore || 0,
        gameData.highestTile || 0,
        gameData.totalMoves || 0,
        gameData.gameTime || 0
    ];

    await fs.appendFile(summaryFile, row.join(',') + '\n');
}

// Default route - serve the game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, HOST, () => {
    console.log('🎮 2048 Analytics Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server running at: http://${HOST}:${PORT}`);
    console.log(`📊 Analytics dashboard: http://${HOST}:${PORT}/analytics.html`);
    console.log(`💾 Data storage: ${dataDir}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 API Endpoints:');
    console.log(`   POST /api/save-game-data - Save game session`);
    console.log(`   GET  /api/list-sessions  - List all sessions`);
    console.log(`   GET  /api/session/:id    - Get specific session`);
    console.log(`   GET  /api/export         - Export all data`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Ready to collect game data!');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
