function DataLogger() {
  this.sessionId = this.generateSessionId();
  this.playerName = '';
  this.gameMode = '';
  this.startTime = null;
  this.endTime = null;
  this.moves = [];
  this.moveNumber = 0;
}

DataLogger.prototype.generateSessionId = function() {
  var now = new Date();
  var year = now.getFullYear();
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var day = String(now.getDate()).padStart(2, '0');
  var hours = String(now.getHours()).padStart(2, '0');
  var minutes = String(now.getMinutes()).padStart(2, '0');
  var seconds = String(now.getSeconds()).padStart(2, '0');
  
  return year + month + day + '_' + hours + minutes + seconds + '_' + Math.random().toString(36).substr(2, 5);
};

DataLogger.prototype.startSession = function(playerName, gameMode) {
  this.playerName = playerName;
  this.gameMode = gameMode;
  this.startTime = new Date();
  this.moves = [];
  this.moveNumber = 0;
  
  console.log('Started session:', this.sessionId, 'for player:', playerName, 'mode:', gameMode);
};

DataLogger.prototype.logMove = function(moveData) {
  this.moveNumber++;
  
  var logEntry = {
    sessionId: this.sessionId,
    playerName: this.playerName,
    gameMode: this.gameMode,
    moveNumber: this.moveNumber,
    timestamp: new Date().toISOString(),
    direction: moveData.direction,
    score: moveData.score,
    boardState: moveData.boardState,
    moveTime: moveData.moveTime || 0,
    tilesAdded: moveData.tilesAdded || 0,
    tilesRemoved: moveData.tilesRemoved || 0,
    isBadMove: moveData.isBadMove || false,
    expectimaxScores: moveData.expectimaxScores || null
  };
  
  this.moves.push(logEntry);
  
  // Store moves in localStorage as backup
  this.saveToLocalStorage();
};

DataLogger.prototype.endSession = function(finalScore, highestTile, gameTime) {
  this.endTime = new Date();
  
  var sessionData = {
    sessionId: this.sessionId,
    playerName: this.playerName,
    gameMode: this.gameMode,
    startTime: this.startTime.toISOString(),
    endTime: this.endTime.toISOString(),
    finalScore: finalScore,
    highestTile: highestTile,
    totalMoves: this.moveNumber,
    gameTime: gameTime || 0,
    moves: this.moves
  };
  
  // Send data to server (if available) or save locally
  this.saveSessionData(sessionData);
  
  return sessionData;
};

DataLogger.prototype.saveSessionData = function(sessionData) {
  // Try to send to server first
  if (this.canSendToServer()) {
    this.sendToServer(sessionData);
  }
  
  // Always save locally as backup
  this.saveToFile(sessionData);
  this.updateHighScores(sessionData);
};

DataLogger.prototype.canSendToServer = function() {
  // Check if we're running on a server (not file://)
  return window.location.protocol !== 'file:' && 
         typeof fetch !== 'undefined';
};

DataLogger.prototype.sendToServer = function(sessionData) {
  const serverUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
    ? `http://127.0.0.1:3000/api/save-game-data`
    : '/api/save-game-data';
    
  fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sessionData)
  })
  .then(response => {
    if (response.ok) {
      console.log('Game data saved to server successfully');
      return response.json();
    } else {
      console.warn('Failed to save to server, data saved locally');
      throw new Error('Server response not ok');
    }
  })
  .then(data => {
    console.log('Server response:', data);
  })
  .catch(error => {
    console.warn('Server unavailable, data saved locally:', error);
  });
};

DataLogger.prototype.saveToFile = function(sessionData) {
  // For local development, save to localStorage and provide download
  var key = 'gameSession_' + sessionData.sessionId;
  localStorage.setItem(key, JSON.stringify(sessionData));
  
  // Create downloadable file
  this.createDownloadableFile(sessionData);
};

DataLogger.prototype.createDownloadableFile = function(sessionData) {
  // Create JSON file for download
  var jsonData = JSON.stringify(sessionData, null, 2);
  var blob = new Blob([jsonData], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  
  // Create download link (hidden)
  var a = document.createElement('a');
  a.href = url;
  a.download = 'game_session_' + sessionData.sessionId + '.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  
  // Also create CSV file for easy analysis
  this.createCSVFile(sessionData);
  
  console.log('Game data prepared for download:', a.download);
};

DataLogger.prototype.createCSVFile = function(sessionData) {
  var csvContent = 'Session ID,Player Name,Game Mode,Move Number,Timestamp,Direction,Score,Board State,Move Time,Tiles Added,Tiles Removed\n';
  
  sessionData.moves.forEach(function(move) {
    csvContent += [
      move.sessionId,
      move.playerName,
      move.gameMode,
      move.moveNumber,
      move.timestamp,
      move.direction,
      move.score,
      '"' + move.boardState + '"',
      move.moveTime,
      move.tilesAdded,
      move.tilesRemoved
    ].join(',') + '\n';
  });
  
  var blob = new Blob([csvContent], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  
  var a = document.createElement('a');
  a.href = url;
  a.download = 'game_moves_' + sessionData.sessionId + '.csv';
  a.style.display = 'none';
  document.body.appendChild(a);
};

DataLogger.prototype.saveToLocalStorage = function() {
  var key = 'currentGameMoves_' + this.sessionId;
  localStorage.setItem(key, JSON.stringify(this.moves));
};

DataLogger.prototype.updateHighScores = function(sessionData) {
  var highScoresKey = 'highScores_' + sessionData.gameMode;
  var highScores = JSON.parse(localStorage.getItem(highScoresKey) || '[]');
  
  var newScore = {
    playerName: sessionData.playerName,
    score: sessionData.finalScore,
    highestTile: sessionData.highestTile,
    gameTime: sessionData.gameTime,
    date: sessionData.endTime,
    moves: sessionData.totalMoves
  };
  
  highScores.push(newScore);
  
  // Sort by score (descending) and keep top 10
  highScores.sort(function(a, b) {
    if (sessionData.gameMode === 'countdown') {
      // For countdown mode, prioritize higher scores, then by time if scores are equal
      if (b.score !== a.score) return b.score - a.score;
      return a.gameTime - b.gameTime; // Less time is better for same score
    } else {
      // For other modes, just sort by score
      return b.score - a.score;
    }
  });
  
  highScores = highScores.slice(0, 10);
  
  localStorage.setItem(highScoresKey, JSON.stringify(highScores));
  
  // Update display
  this.displayHighScores(sessionData.gameMode);
};

DataLogger.prototype.displayHighScores = function(gameMode) {
  var highScoresKey = 'highScores_' + gameMode;
  var highScores = JSON.parse(localStorage.getItem(highScoresKey) || '[]');
  var container = document.getElementById('highscores-' + gameMode);
  
  if (!container) return;
  
  if (highScores.length === 0) {
    container.innerHTML = '<p>No scores yet</p>';
    return;
  }
  
  var html = '<ol class="highscore-list">';
  highScores.forEach(function(score, index) {
    var timeDisplay = '';
    if (gameMode === 'countup') {
      var minutes = Math.floor(score.gameTime / 60);
      var seconds = score.gameTime % 60;
      timeDisplay = ' - Time: ' + minutes + ':' + String(seconds).padStart(2, '0');
    } else if (gameMode === 'countdown') {
      var totalTime = 120; // 2 minutes
      var timeUsed = Math.min(score.gameTime, totalTime);
      var minutes = Math.floor(timeUsed / 60);
      var seconds = timeUsed % 60;
      timeDisplay = ' - Time: ' + minutes + ':' + String(seconds).padStart(2, '0');
    }
    
    html += '<li><strong>' + score.playerName + '</strong> - ' + 
            score.score + ' points (Highest: ' + score.highestTile + ')' + 
            timeDisplay + '</li>';
  });
  html += '</ol>';
  
  container.innerHTML = html;
};

DataLogger.prototype.loadAllHighScores = function() {
  this.displayHighScores('normal');
  this.displayHighScores('countup');
  this.displayHighScores('countdown');
};

DataLogger.prototype.exportAllData = function() {
  var allSessions = [];
  
  // Get all stored sessions
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.startsWith('gameSession_')) {
      var sessionData = JSON.parse(localStorage.getItem(key));
      allSessions.push(sessionData);
    }
  }
  
  if (allSessions.length === 0) {
    alert('No game data to export');
    return;
  }
  
  // Create comprehensive export
  var exportData = {
    exportDate: new Date().toISOString(),
    totalSessions: allSessions.length,
    sessions: allSessions
  };
  
  var jsonData = JSON.stringify(exportData, null, 2);
  var blob = new Blob([jsonData], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  
  var a = document.createElement('a');
  a.href = url;
  a.download = 'all_game_data_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('Exported', allSessions.length, 'game sessions');
};

// Polyfill for String.padStart if not available
if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = targetLength >> 0;
    padString = String(typeof padString !== 'undefined' ? padString : ' ');
    if (this.length > targetLength) {
      return String(this);
    } else {
      targetLength = targetLength - this.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length);
      }
      return padString.slice(0, targetLength) + String(this);
    }
  };
}
