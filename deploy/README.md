# Enhanced 2048 Game with Timer Modes and Data Logging

This is an enhanced version of the classic 2048 game that includes three game modes with comprehensive player data logging capabilities.

## Features

### Game Modes
1. **No Timer Mode**: Classic 2048 gameplay without time constraints
2. **Count Up Timer**: Shows elapsed time and saves it to high scores
3. **Countdown Timer**: 2-minute time limit where final score is the sum of all tiles when time expires

### Data Logging
- Records every move with timestamps
- Tracks player names and game modes
- Saves detailed game statistics
- Exports data in JSON and CSV formats
- Maintains high score leaderboards for each mode

### Enhanced Features
- Player name input system
- Game mode selection interface
- Real-time timer display with visual warnings
- High score tables with filtering by mode
- Automatic data export functionality
- Responsive design for mobile devices

## File Structure

```
deploy/
├── index.html              # Main game interface
├── js/
│   ├── application.js      # Enhanced app initialization and UI control
│   ├── data_logger.js      # Comprehensive data logging system
│   ├── timer_manager.js    # Timer functionality for timed modes
│   ├── game_manager.js     # Enhanced game logic with logging
│   ├── html_actuator.js    # UI updates and rendering
│   ├── grid.js            # Game grid management
│   ├── tile.js            # Tile objects and animations
│   ├── keyboard_input_manager.js  # Input handling
│   ├── local_storage_manager.js   # Local storage management
│   └── [polyfills]         # Browser compatibility
├── style/
│   ├── main.css           # Enhanced styles with new UI elements
│   └── fonts/             # Web fonts
├── meta/                  # App icons and metadata
├── api.php               # Server-side data handling (optional)
└── web/                  # Server data storage directory
```

## Deployment Options

### Option 1: Node.js Server (Recommended)
The included Node.js server provides the best experience with real-time data collection and analytics:

**Quick Start:**
1. Ensure Node.js is installed (https://nodejs.org/)
2. Navigate to the `deploy` directory
3. Run the startup script:
   - **Windows**: Double-click `start-server.bat`
   - **Mac/Linux**: Run `chmod +x start-server.sh && ./start-server.sh`
   - **Manual**: Run `npm install` then `node server.js`

4. Open your browser to: http://127.0.0.1:3000

**Features:**
- Automatic dependency installation
- Real-time data collection and storage
- RESTful API for analytics
- Comprehensive data export
- Cross-platform compatibility

Game data will be saved in the `data/` directory as:
- `game_session_[sessionId].json` - Complete session data
- `game_moves_[sessionId].csv` - Move-by-move data
- `player_sessions.csv` - Summary of all sessions

### Option 2: Static File Hosting
Simply upload all files in the `deploy` directory to any web server that supports static file hosting:

- GitHub Pages
- Netlify
- Vercel
- Apache/Nginx web server
- Any hosting provider

The game will work fully with local storage for data persistence.

### Option 3: PHP Server (Alternative)
For server-side data logging with PHP, use a PHP-enabled web server:

1. Upload all files to your PHP-enabled web server
2. Ensure the server can create and write to the `data/` directory (755 permissions)
3. The `api.php` file will handle server-side data storage

## Usage

### For Players
1. Open `index.html` in a web browser
2. Enter your name
3. Select a game mode
4. Play using arrow keys
5. View high scores in the dedicated section

### For Data Analysis
Game data is automatically saved and can be exported:

- **Browser Console**: Type `exportGameData()` to download all data
- **Server Logs**: Check the `data/` directory for CSV and JSON files
- **High Scores**: Viewable directly in the game interface

## Data Structure

### Session Data
```json
{
  "sessionId": "20250801_114500_abc12",
  "playerName": "PlayerName",
  "gameMode": "countdown",
  "startTime": "2025-08-01T11:45:00.000Z",
  "endTime": "2025-08-01T11:47:30.000Z",
  "finalScore": 2048,
  "highestTile": 1024,
  "totalMoves": 45,
  "gameTime": 150,
  "moves": [...]
}
```

### Move Data
```json
{
  "sessionId": "20250801_114500_abc12",
  "playerName": "PlayerName",
  "gameMode": "countdown",
  "moveNumber": 1,
  "timestamp": "2025-08-01T11:45:05.000Z",
  "direction": "Up",
  "score": 4,
  "boardState": "0,0,0,0,2,0,0,0,0,0,0,0,0,0,2,0",
  "moveTime": 1500,
  "tilesAdded": 1,
  "tilesRemoved": 0
}
```

## Timer Modes Explained

### Count Up Timer
- Timer starts at 00:00 and counts up
- Shows total time played
- High scores include completion time
- Good for tracking improvement over time

### Countdown Timer
- Starts with 2:00 (120 seconds)
- Game ends when timer reaches 00:00
- Final score is sum of all tile values
- Creates time pressure and strategic decisions
- Timer turns orange at 30 seconds, red and pulses at 10 seconds

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Development

To modify or extend the game:

1. Edit JavaScript files in `js/` directory
2. Modify styles in `style/main.css`
3. Update HTML structure in `index.html`
4. Test locally before deployment

### Debug Functions
Available in browser console:
- `exportGameData()` - Export all saved data
- `clearAllData()` - Clear all saved game data (with confirmation)

## Privacy and Data

- All data is stored locally by default
- Server deployment saves anonymized game data
- No personal information beyond player names is collected
- Data is used for game analysis and improvement only

## License

Based on the original 2048 game by Gabriele Cirulli. Enhanced version includes additional features for research and analysis purposes.
