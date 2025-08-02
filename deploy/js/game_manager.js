function GameManager(size, InputManager, Actuator, StorageManager, gameMode, playerName) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.gameMode       = gameMode || 'normal';
  this.playerName     = playerName || 'Anonymous';

  // Initialize timer and data logger
  this.timerManager = new TimerManager(this.gameMode);
  this.dataLogger = new DataLogger();
  this.dataLogger.startSession(this.playerName, this.gameMode);

  this.lastMoveTime = null;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  // Don't reload previous state for timed games or new sessions
  this.grid        = new Grid(this.size);
  this.score       = 0;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;

  // Add the initial tiles
  this.addStartTiles();

  // Start timer if applicable
  if (this.gameMode !== 'normal') {
    this.timerManager.start();
  }

  this.lastMoveTime = Date.now();

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Handle game end
  if (this.over || this.won) {
    this.handleGameEnd();
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated(),
    gameMode:   this.gameMode,
    playerName: this.playerName
  });
};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var moveStartTime = Date.now();
  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var tilesAdded = 0;
  var tilesRemoved = 0;

  // Capture board state before move
  var beforeBoardState = this.getBoardStateString();

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);
          tilesRemoved++; // One tile was merged and removed

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();
    tilesAdded = 1;

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    // Log the move
    var moveTime = this.lastMoveTime ? moveStartTime - this.lastMoveTime : 0;
    this.lastMoveTime = moveStartTime;

    // Evaluate all moves and detect bad move
    var moveScores = this.evaluateAllMoves(beforeBoardState);
    var isBadMove = this.detectBadMove(direction, beforeBoardState);

    var directionNames = ['Up', 'Right', 'Down', 'Left'];
    this.dataLogger.logMove({
      direction: directionNames[direction],
      score: this.score,
      boardState: beforeBoardState,
      moveTime: moveTime,
      tilesAdded: tilesAdded,
      tilesRemoved: tilesRemoved,
      isBadMove: isBadMove,
      expectimaxScores: moveScores
    });

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

// Get board state as string for logging
GameManager.prototype.getBoardStateString = function() {
  var boardArray = [];
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      var tile = this.grid.cellContent({ x: x, y: y });
      boardArray.push(tile ? tile.value : 0);
    }
  }
  return boardArray.join(',');
};

// Get highest tile value
GameManager.prototype.getHighestTile = function() {
  var highest = 0;
  this.grid.eachCell(function (x, y, tile) {
    if (tile && tile.value > highest) {
      highest = tile.value;
    }
  });
  return highest;
};

// Handle game end (win or lose)
GameManager.prototype.handleGameEnd = function() {
  if (!this.gameEnded) {
    this.gameEnded = true;
    
    // Stop timer
    var gameTime = 0;
    if (this.timerManager) {
      gameTime = this.timerManager.stop();
    }
    
    // Log end of session
    var finalScore = this.score;
    var highestTile = this.getHighestTile();
    
    if (this.dataLogger) {
      this.dataLogger.endSession(finalScore, highestTile, gameTime);
    }
  }
};

// Handle countdown timer expiry
GameManager.prototype.timeUp = function() {
  if (this.gameMode === 'countdown' && !this.over && !this.won) {
    // Calculate final score as sum of all tiles for countdown mode
    var totalTileValue = 0;
    this.grid.eachCell(function (x, y, tile) {
      if (tile) {
        totalTileValue += tile.value;
      }
    });
    
    this.score = totalTileValue;
    this.over = true;
    this.actuate();
  }
};

// Expectimax-based move evaluation (simplified version of Rust implementation)
GameManager.prototype.detectBadMove = function(direction, beforeBoardState) {
  // Evaluate all four possible moves using simplified expectimax
  var moveScores = this.evaluateAllMoves(beforeBoardState);
  
  // Find the best possible score
  var bestScore = Math.max(moveScores.up, moveScores.down, moveScores.left, moveScores.right);
  
  // Get the chosen move's score
  var chosenScore;
  switch(direction) {
    case 0: chosenScore = moveScores.up; break;    // Up
    case 1: chosenScore = moveScores.right; break; // Right  
    case 2: chosenScore = moveScores.down; break;  // Down
    case 3: chosenScore = moveScores.left; break;  // Left
  }
  
  // Detect bad move: chosen score is significantly worse than best (10% threshold)
  var scoreThreshold = 0.1;
  if (bestScore > 0) {
    return (bestScore - chosenScore) / bestScore > scoreThreshold;
  }
  
  return false;
};

// Simplified expectimax evaluation for all moves
GameManager.prototype.evaluateAllMoves = function(boardStateString) {
  var board = this.parseBoardState(boardStateString);
  var scores = {
    up: this.evaluateMove(board, 0),
    right: this.evaluateMove(board, 1), 
    down: this.evaluateMove(board, 2),
    left: this.evaluateMove(board, 3)
  };
  
  return scores;
};

// Parse board state string back to grid
GameManager.prototype.parseBoardState = function(boardStateString) {
  var values = boardStateString.split(',').map(function(v) { return parseInt(v); });
  var grid = [];
  for (var x = 0; x < 4; x++) {
    grid[x] = [];
    for (var y = 0; y < 4; y++) {
      var value = values[x * 4 + y];
      grid[x][y] = value > 0 ? { value: value } : null;
    }
  }
  return grid;
};

// Evaluate a single move using simplified expectimax (depth 2)
GameManager.prototype.evaluateMove = function(board, direction) {
  // Simulate the move
  var newBoard = this.simulateMove(board, direction);
  
  // If move doesn't change board, return 0
  if (this.boardsEqual(board, newBoard)) {
    return 0;
  }
  
  // Calculate heuristic score for the resulting position
  return this.calculateHeuristicScore(newBoard);
};

// Simulate a move without changing the actual game state
GameManager.prototype.simulateMove = function(board, direction) {
  var newBoard = this.copyBoard(board);
  var vector = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  
  // Simulate tile movements and merges
  var self = this;
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      var cell = { x: x, y: y };
      var tile = newBoard[x][y];

      if (tile) {
        var positions = self.findFarthestPositionSim(newBoard, cell, vector);
        var next = newBoard[positions.next.x] ? newBoard[positions.next.x][positions.next.y] : null;

        // Check for merge
        if (next && next.value === tile.value) {
          // Merge tiles
          newBoard[positions.next.x][positions.next.y] = { value: tile.value * 2 };
          newBoard[x][y] = null;
        } else {
          // Move tile
          if (positions.farthest.x !== x || positions.farthest.y !== y) {
            newBoard[positions.farthest.x][positions.farthest.y] = tile;
            newBoard[x][y] = null;
          }
        }
      }
    });
  });
  
  return newBoard;
};

// Copy board for simulation
GameManager.prototype.copyBoard = function(board) {
  var newBoard = [];
  for (var x = 0; x < 4; x++) {
    newBoard[x] = [];
    for (var y = 0; y < 4; y++) {
      newBoard[x][y] = board[x][y] ? { value: board[x][y].value } : null;
    }
  }
  return newBoard;
};

// Check if two boards are equal
GameManager.prototype.boardsEqual = function(board1, board2) {
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      var tile1 = board1[x][y];
      var tile2 = board2[x][y];
      if ((tile1 === null) !== (tile2 === null)) return false;
      if (tile1 && tile2 && tile1.value !== tile2.value) return false;
    }
  }
  return true;
};

// Find farthest position for simulation
GameManager.prototype.findFarthestPositionSim = function(board, cell, vector) {
  var previous;
  do {
    previous = cell;
    cell = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.withinBounds(cell) && this.cellAvailableSim(board, cell));

  return {
    farthest: previous,
    next: cell
  };
};

// Check if cell is available in simulation
GameManager.prototype.cellAvailableSim = function(board, cell) {
  return !board[cell.x][cell.y];
};

// Check if cell is within bounds
GameManager.prototype.withinBounds = function(cell) {
  return cell.x >= 0 && cell.x < 4 && cell.y >= 0 && cell.y < 4;
};

// Calculate heuristic score (simplified version of Rust heuristics)
GameManager.prototype.calculateHeuristicScore = function(board) {
  var score = 0;
  
  // Empty cells bonus
  var emptyCells = 0;
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      if (!board[x][y]) emptyCells++;
    }
  }
  score += emptyCells * 270; // Empty weight from Rust code
  
  // Monotonicity and merges (simplified)
  score += this.calculateMonotonicity(board);
  score += this.calculateMerges(board);
  
  // Penalty for sum (higher tiles cost more)
  score -= this.calculateSumPenalty(board);
  
  return score;
};

// Calculate monotonicity score
GameManager.prototype.calculateMonotonicity = function(board) {
  var score = 0;
  
  // Check rows
  for (var x = 0; x < 4; x++) {
    var leftMono = 0, rightMono = 0;
    for (var y = 1; y < 4; y++) {
      var tile1 = board[x][y-1] ? board[x][y-1].value : 0;
      var tile2 = board[x][y] ? board[x][y].value : 0;
      if (tile1 > tile2) {
        leftMono += Math.pow(tile1, 4) - Math.pow(tile2, 4);
      } else {
        rightMono += Math.pow(tile2, 4) - Math.pow(tile1, 4);
      }
    }
    score += Math.min(leftMono, rightMono) * 47; // Monotonicity weight from Rust
  }
  
  // Check columns  
  for (var y = 0; y < 4; y++) {
    var upMono = 0, downMono = 0;
    for (var x = 1; x < 4; x++) {
      var tile1 = board[x-1][y] ? board[x-1][y].value : 0;
      var tile2 = board[x][y] ? board[x][y].value : 0;
      if (tile1 > tile2) {
        upMono += Math.pow(tile1, 4) - Math.pow(tile2, 4);
      } else {
        downMono += Math.pow(tile2, 4) - Math.pow(tile1, 4);
      }
    }
    score += Math.min(upMono, downMono) * 47;
  }
  
  return score;
};

// Calculate merge potential
GameManager.prototype.calculateMerges = function(board) {
  var merges = 0;
  
  // Check horizontal merges
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 3; y++) {
      var tile1 = board[x][y];
      var tile2 = board[x][y+1];
      if (tile1 && tile2 && tile1.value === tile2.value) {
        merges += 1;
      }
    }
  }
  
  // Check vertical merges
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 3; x++) {
      var tile1 = board[x][y];
      var tile2 = board[x+1][y];
      if (tile1 && tile2 && tile1.value === tile2.value) {
        merges += 1;
      }
    }
  }
  
  return merges * 700; // Merges weight from Rust code
};

// Calculate sum penalty
GameManager.prototype.calculateSumPenalty = function(board) {
  var sum = 0;
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      if (board[x][y]) {
        sum += Math.pow(board[x][y].value, 3.5); // Sum power from Rust code
      }
    }
  }
  return sum * 11; // Sum weight from Rust code
};

// Helper function to count available spaces from board state string
GameManager.prototype.countAvailableSpaces = function(boardStateString) {
  var values = boardStateString.split(',');
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (parseInt(values[i]) === 0) {
      count++;
    }
  }
  return count;
};

// Check if any corner is occupied by a high-value tile
GameManager.prototype.isHighestTileInCorner = function() {
  var highest = this.getHighestTile();
  var corners = [
    this.grid.cellContent({ x: 0, y: 0 }),
    this.grid.cellContent({ x: 0, y: 3 }),
    this.grid.cellContent({ x: 3, y: 0 }),
    this.grid.cellContent({ x: 3, y: 3 })
  ];
  
  for (var i = 0; i < corners.length; i++) {
    if (corners[i] && corners[i].value === highest) {
      return true;
    }
  }
  return false;
};

// Check if corners are occupied
GameManager.prototype.isCornerOccupied = function() {
  var corners = [
    this.grid.cellContent({ x: 0, y: 0 }),
    this.grid.cellContent({ x: 0, y: 3 }),
    this.grid.cellContent({ x: 3, y: 0 }),
    this.grid.cellContent({ x: 3, y: 3 })
  ];
  
  var occupied = 0;
  for (var i = 0; i < corners.length; i++) {
    if (corners[i]) occupied++;
  }
  return occupied > 2;
};

// Check if edges are blocked
GameManager.prototype.isEdgeBlocked = function() {
  var edges = 0;
  var total = 0;
  
  // Check top and bottom edges
  for (var x = 0; x < this.size; x++) {
    total += 2;
    if (this.grid.cellContent({ x: x, y: 0 })) edges++;
    if (this.grid.cellContent({ x: x, y: 3 })) edges++;
  }
  
  // Check left and right edges
  for (var y = 0; y < this.size; y++) {
    total += 2;
    if (this.grid.cellContent({ x: 0, y: y })) edges++;
    if (this.grid.cellContent({ x: 3, y: y })) edges++;
  }
  
  return (edges / total) > 0.7; // More than 70% of edges occupied
};
