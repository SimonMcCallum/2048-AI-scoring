# Advanced 2048 Game with AI-Based Analytics & Expectimax Evaluation

This is a sophisticated version of the classic 2048 game that combines three timer modes with advanced AI-based move evaluation and comprehensive analytics dashboard. The system uses expectimax algorithms (ported from Rust implementation) to analyze player decision-making and provide detailed performance insights.

## Features

### Game Modes
1. **No Timer Mode**: Classic 2048 gameplay without time constraints
2. **Count Up Timer**: Shows elapsed time in top corner, saves completion time to leaderboards
3. **Countdown Timer**: 2-minute time limit where final score is the sum of all tiles when time expires

### Advanced Move Analysis
- **Expectimax Algorithm**: Each move is evaluated using the same sophisticated AI as the Rust implementation
- **Real-time Decision Analysis**: Every move is scored against all four possible directions
- **Bad Move Detection**: 10% threshold algorithm identifies suboptimal decisions
- **Heuristic Scoring**: Uses advanced metrics including monotonicity, merge potential, and empty cell optimization

### Comprehensive Analytics Dashboard
- **Score Progression**: Track improvement over multiple games
- **Learning Curve Analysis**: Visualize decision-making quality over time
- **Individual Game Analysis**: Move-by-move breakdown with expectimax scores
- **Player Performance Comparison**: Multi-player statistics and insights
- **Game Mode Performance**: Compare effectiveness across different timer modes
- **Move Time Analysis**: Speed vs accuracy correlation analysis

### Data Logging & Export
- Records every move with expectimax scores for all four directions
- Tracks player names, game modes, and timing data
- Saves detailed game statistics and board states
- Exports comprehensive data in JSON and CSV formats
- Maintains high score leaderboards for each mode with timing information

## File Structure

```
deploy/
├── index.html              # Main game interface
├── analytics.html          # Comprehensive analytics dashboard
├── server.js              # Node.js server with API endpoints
├── package.json           # Node.js dependencies
├── start-server.bat       # Windows server startup script
├── start-server.sh        # Unix/Linux server startup script
├── js/
│   ├── application.js      # Enhanced app initialization and UI control
│   ├── analytics.js        # Analytics dashboard with Chart.js visualizations
│   ├── data_logger.js      # Comprehensive data logging with expectimax scores
│   ├── timer_manager.js    # Timer functionality for timed modes
│   ├── game_manager.js     # Enhanced game logic with expectimax evaluation
│   ├── html_actuator.js    # UI updates and rendering
│   ├── grid.js            # Game grid management
│   ├── tile.js            # Tile objects and animations
│   ├── keyboard_input_manager.js  # Input handling
│   ├── local_storage_manager.js   # Local storage management
│   └── [polyfills]         # Browser compatibility
├── style/
│   ├── main.css           # Enhanced styles with timer and analytics UI
│   └── fonts/             # Web fonts
├── meta/                  # App icons and metadata
├── data/                  # Server-side game data storage (auto-created)
├── api.php               # PHP server-side data handling (alternative)
└── .htaccess             # Apache configuration for PHP hosting
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
1. **Start the Server**: Run the Node.js server using the startup scripts
2. **Access the Game**: Open http://127.0.0.1:3000 in your browser
3. **Enter Player Name**: Input your name for data tracking
4. **Select Game Mode**: Choose from No Timer, Count Up, or Countdown modes
5. **Play**: Use arrow keys to move tiles and achieve high scores
6. **View High Scores**: Check leaderboards for each game mode

### For Analytics & Data Analysis
The system provides comprehensive analytics through multiple interfaces:

#### Analytics Dashboard
1. **Access Analytics**: Click "Analytics Dashboard" link in the game or visit http://127.0.0.1:3000/analytics.html
2. **Overall Statistics**: View total games, players, average scores, and performance metrics
3. **Filter Data**: Use filters to analyze specific players, game modes, or date ranges
4. **Interactive Charts**: Explore multiple visualizations:
   - **Score Progression**: Track improvement over multiple games
   - **Learning Curve**: Rolling average of decision quality over time
   - **Game Mode Performance**: Compare effectiveness of different timer modes
   - **Move Time Analysis**: Speed vs accuracy correlation
   - **Player Comparison**: Multi-player performance statistics

#### Individual Game Analysis
1. **Select a Game**: Use the dropdown to choose any completed game session
2. **Move-by-Move Analysis**: View detailed progression with:
   - Game score progression over moves
   - Expectimax scores for all four directions (Up, Down, Left, Right)
   - Average score per move trend line
   - Good vs bad move identification
3. **Game Insights**: Detailed statistics including:
   - Good move rate and decision efficiency
   - Most used directions and strategic patterns
   - Best and worst moves with efficiency percentages
   - Average move time and score efficiency

#### Data Export Options
- **Server Data**: Check the `data/` directory for JSON and CSV files
- **Browser Console**: Type `exportGameData()` to download all local data
- **Analytics Export**: Use dashboard filters and export functionality
- **Real-time API**: Access live data through RESTful endpoints

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
