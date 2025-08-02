# 2048 AI Scoring - Human Player Analysis

This Rust project implements a human-playable version of 2048 that uses AI to score each potential move and records detailed player data for analysis.

## Features

### Human Playable Game
- Interactive 2048 game with WASD controls
- Real-time AI analysis showing scores for all possible moves
- Decision difficulty indicators (Easy/Medium/Hard)
- Move timing recording

### Data Recording
The system records comprehensive data for each move:
- **Time between moves** - Response time for each decision
- **All 4 move scores** - AI evaluation of Up, Down, Left, Right moves
- **Variation score** - Standard deviation of move options (decision difficulty)
- **Bad move detection** - Identifies moves significantly worse than optimal
- **Board state** - Complete game state at each decision point
- **Game progression** - Move number, score, timestamp

### Data Analysis
- Player performance analysis over time
- Decision quality metrics
- Move preference patterns
- Early vs late game performance comparison
- Session summaries with statistics

## Building and Running

### Prerequisites
- Install Rust: https://rustup.rs/

### Build the project
```bash
cargo build --release
```

### Run the human-playable game
```bash
cargo run
```

### Run the analysis tool
```bash
# Analyze a specific moves file
cargo run --bin analyze player_moves_20240101_120000.csv

# Or just analyze session summaries
cargo run --bin analyze
```

## Game Controls
- **W** - Move Up
- **A** - Move Left  
- **S** - Move Down
- **D** - Move Right
- **Q** - Quit game

## Data Files Generated

### Per-Game Files
- `player_moves_YYYYMMDD_HHMMSS.csv` - Detailed move-by-move data
- `player_sessions_YYYYMM.json` - Monthly session data in JSON format

### Summary Files
- `player_sessions.csv` - All sessions summary for easy analysis

## Data Structure

### Move Data (CSV)
Each row contains:
- `timestamp` - When the move was made
- `board_state` - 16 comma-separated values representing the board
- `move_chosen` - Player's choice (Up/Down/Left/Right)
- `time_taken_ms` - Decision time in milliseconds
- `up_score`, `down_score`, `left_score`, `right_score` - AI scores for each direction
- `best_score` - Highest scoring option
- `chosen_score` - Score of player's choice
- `variation_score` - Standard deviation of the 4 scores (difficulty measure)
- `is_bad_move` - Boolean indicating if choice was significantly suboptimal
- `game_score` - Current game score
- `move_number` - Sequential move number in the game

### Session Data (CSV)
- `session_id` - Unique identifier
- `start_time` - Game start timestamp
- `end_time` - Game end timestamp  
- `final_score` - Final game score
- `highest_tile` - Highest tile achieved
- `total_moves` - Number of moves made
- `bad_moves` - Number of suboptimal moves
- `average_time_per_move_ms` - Average decision time

## Analysis Examples

The analysis tool provides insights like:
- Average decision time and how it changes during the game
- Percentage of "bad" moves (significantly suboptimal choices)
- Move preferences (do you prefer certain directions?)
- Performance progression (do you get better/worse as the game progresses?)
- Decision difficulty patterns (do you take longer on harder decisions?)

## Graphing and Visualization

The CSV files can be imported into any data analysis tool:
- **Excel/Google Sheets** - For basic charts and pivot tables
- **Python (pandas/matplotlib)** - For advanced analysis
- **R** - For statistical analysis
- **Tableau/Power BI** - For interactive dashboards

### Example Analysis Ideas
1. **Learning Curve** - Plot bad move percentage over multiple sessions
2. **Decision Time vs Difficulty** - Scatter plot of time vs variation score
3. **Move Quality Heatmap** - Show where on the board bad moves commonly occur
4. **Performance vs Fatigue** - How does play quality change with game length?

## Technical Details

The AI scoring uses a simplified version of the expectimax algorithm with heuristics for:
- Game score maximization
- Empty tile preservation  
- Board smoothness (avoiding scattered high tiles)

The "bad move" threshold is set at 10% - moves that score 10% or more below the optimal choice are flagged as suboptimal.

## Future Enhancements

Potential additions:
- Web interface for easier gameplay
- Real-time performance dashboard
- Machine learning analysis of player patterns
- Comparative analysis between multiple players
- Integration with external graphing tools
