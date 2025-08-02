// Enhanced 2048 Application with Timer Modes and Data Logging
var gameManager;
var dataLogger = new DataLogger();

// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  // Initialize the application
  initializeApp();
});

function initializeApp() {
  // Load existing high scores
  dataLogger.loadAllHighScores();
  
  // Set up event listeners
  setupEventListeners();
  
  // Show player input screen
  showPlayerInput();
}

function setupEventListeners() {
  // Player name input
  var startButton = document.getElementById('startGame');
  var playerNameInput = document.getElementById('playerName');
  
  if (startButton) {
    startButton.addEventListener('click', handlePlayerNameSubmit);
  }
  
  if (playerNameInput) {
    playerNameInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handlePlayerNameSubmit();
      }
    });
  }
  
  // Game mode selection
  var modeButtons = document.querySelectorAll('.mode-button');
  modeButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      var mode = this.getAttribute('data-mode');
      startGameWithMode(mode);
    });
  });
  
  // High score tabs
  var tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      var tab = this.getAttribute('data-tab');
      showHighScoreTab(tab);
    });
  });
  
  // Restart button (will be bound when game starts)
  var restartButton = document.querySelector('.restart-button');
  if (restartButton) {
    restartButton.addEventListener('click', restartGame);
  }
  
  // Keep playing button
  var keepPlayingButton = document.querySelector('.keep-playing-button');
  if (keepPlayingButton) {
    keepPlayingButton.addEventListener('click', function() {
      if (gameManager) {
        gameManager.keepPlaying();
      }
    });
  }
  
  // Try again button
  var retryButton = document.querySelector('.retry-button');
  if (retryButton) {
    retryButton.addEventListener('click', restartGame);
  }
}

function showPlayerInput() {
  document.getElementById('playerInput').style.display = 'block';
  document.getElementById('gameModeSelection').style.display = 'none';
  document.getElementById('gameWrapper').style.display = 'none';
  
  // Focus on input field
  var playerNameInput = document.getElementById('playerName');
  if (playerNameInput) {
    playerNameInput.focus();
  }
}

function handlePlayerNameSubmit() {
  var playerNameInput = document.getElementById('playerName');
  var playerName = playerNameInput.value.trim();
  
  if (playerName === '') {
    alert('Please enter your name');
    playerNameInput.focus();
    return;
  }
  
  // Store player name and show mode selection
  window.currentPlayerName = playerName;
  showGameModeSelection();
}

function showGameModeSelection() {
  document.getElementById('playerInput').style.display = 'none';
  document.getElementById('gameModeSelection').style.display = 'block';
  document.getElementById('gameWrapper').style.display = 'none';
}

function startGameWithMode(mode) {
  var playerName = window.currentPlayerName || 'Anonymous';
  
  // Update UI displays
  document.getElementById('currentPlayer').textContent = playerName;
  document.getElementById('currentMode').textContent = getModeDisplayName(mode);
  
  // Hide setup screens and show game
  document.getElementById('playerInput').style.display = 'none';
  document.getElementById('gameModeSelection').style.display = 'none';
  document.getElementById('gameWrapper').style.display = 'block';
  
  // Initialize the game
  initializeGame(mode, playerName);
}

function getModeDisplayName(mode) {
  var names = {
    'normal': 'No Timer',
    'countup': 'Count Up Timer',
    'countdown': 'Countdown Timer (2 min)'
  };
  return names[mode] || mode;
}

function initializeGame(gameMode, playerName) {
  // Create new game manager with enhanced features
  gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager, gameMode, playerName);
  
  // Make gameManager globally accessible for timer callbacks
  window.gameManager = gameManager;
  
  console.log('Game initialized:', gameMode, 'for player:', playerName);
}

function restartGame() {
  if (!window.currentPlayerName) {
    showPlayerInput();
    return;
  }
  
  showGameModeSelection();
}

function showHighScoreTab(tabName) {
  // Update tab buttons
  var tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(function(button) {
    button.classList.remove('active');
    if (button.getAttribute('data-tab') === tabName) {
      button.classList.add('active');
    }
  });
  
  // Show/hide score lists
  var scoreLists = document.querySelectorAll('.highscore-list');
  scoreLists.forEach(function(list) {
    list.style.display = 'none';
  });
  
  var targetList = document.getElementById('highscores-' + tabName);
  if (targetList) {
    targetList.style.display = 'block';
  }
  
  // Reload scores for this tab
  dataLogger.displayHighScores(tabName);
}

// Export data functionality (can be called from console)
function exportGameData() {
  if (dataLogger) {
    dataLogger.exportAllData();
  } else {
    console.log('Data logger not available');
  }
}

// Utility function to reset all data (for testing)
function clearAllData() {
  if (confirm('Are you sure you want to clear all game data? This cannot be undone.')) {
    // Clear all localStorage keys related to the game
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key.startsWith('gameSession_') || 
          key.startsWith('highScores_') || 
          key.startsWith('currentGameMoves_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(function(key) {
      localStorage.removeItem(key);
    });
    
    // Reload high scores
    dataLogger.loadAllHighScores();
    
    console.log('All game data cleared');
    alert('All game data has been cleared');
  }
}

// Development/debug functions
window.exportGameData = exportGameData;
window.clearAllData = clearAllData;

// Handle page visibility change to pause/resume timer
document.addEventListener('visibilitychange', function() {
  if (gameManager && gameManager.timerManager) {
    if (document.hidden) {
      gameManager.timerManager.pause();
    } else {
      gameManager.timerManager.resume();
    }
  }
});

console.log('Enhanced 2048 Application loaded with timer modes and data logging');
