function TimerManager(gameMode) {
  this.gameMode = gameMode; // 'normal', 'countup', 'countdown'
  this.startTime = null;
  this.endTime = null;
  this.timerInterval = null;
  this.isRunning = false;
  this.countdownDuration = 120; // 2 minutes in seconds
  this.currentTime = 0;
  
  this.timerElement = document.getElementById('timer');
  this.timerContainer = document.getElementById('timerContainer');
  
  // Show/hide timer based on mode
  if (gameMode === 'normal') {
    this.timerContainer.style.display = 'none';
  } else {
    this.timerContainer.style.display = 'block';
  }
  
  // Initialize timer display
  if (gameMode === 'countdown') {
    this.currentTime = this.countdownDuration;
    this.updateDisplay();
  }
}

TimerManager.prototype.start = function() {
  if (this.isRunning) return;
  
  this.startTime = new Date();
  this.isRunning = true;
  
  if (this.gameMode === 'countup') {
    this.startCountUp();
  } else if (this.gameMode === 'countdown') {
    this.startCountDown();
  }
};

TimerManager.prototype.stop = function() {
  if (!this.isRunning) return;
  
  this.endTime = new Date();
  this.isRunning = false;
  
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
  
  return this.getElapsedTime();
};

TimerManager.prototype.pause = function() {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
  this.isRunning = false;
};

TimerManager.prototype.resume = function() {
  if (this.gameMode === 'normal' || this.isRunning) return;
  
  this.isRunning = true;
  if (this.gameMode === 'countup') {
    this.startCountUp();
  } else if (this.gameMode === 'countdown') {
    this.startCountDown();
  }
};

TimerManager.prototype.startCountUp = function() {
  var self = this;
  this.timerInterval = setInterval(function() {
    var now = new Date();
    var elapsed = Math.floor((now - self.startTime) / 1000);
    self.currentTime = elapsed;
    self.updateDisplay();
  }, 1000);
};

TimerManager.prototype.startCountDown = function() {
  var self = this;
  this.timerInterval = setInterval(function() {
    self.currentTime--;
    self.updateDisplay();
    
    if (self.currentTime <= 0) {
      self.currentTime = 0;
      self.updateDisplay();
      self.stop();
      // Trigger game over event
      if (window.gameManager) {
        window.gameManager.timeUp();
      }
    }
  }, 1000);
};

TimerManager.prototype.updateDisplay = function() {
  if (!this.timerElement) return;
  
  var minutes = Math.floor(this.currentTime / 60);
  var seconds = this.currentTime % 60;
  
  var display = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  this.timerElement.textContent = display;
  
  // Add warning classes for countdown when time is low
  if (this.gameMode === 'countdown') {
    this.timerElement.classList.remove('timer-warning', 'timer-critical');
    if (this.currentTime <= 10) {
      this.timerElement.classList.add('timer-critical');
    } else if (this.currentTime <= 30) {
      this.timerElement.classList.add('timer-warning');
    }
  }
};

TimerManager.prototype.getElapsedTime = function() {
  if (this.gameMode === 'normal') return 0;
  
  if (this.gameMode === 'countup') {
    if (this.isRunning && this.startTime) {
      return Math.floor((new Date() - this.startTime) / 1000);
    }
    return this.currentTime;
  } else if (this.gameMode === 'countdown') {
    return this.countdownDuration - this.currentTime;
  }
  
  return 0;
};

TimerManager.prototype.getTimeForScore = function() {
  if (this.gameMode === 'countup') {
    return this.getElapsedTime();
  } else if (this.gameMode === 'countdown') {
    return this.countdownDuration - this.currentTime;
  }
  return 0;
};

TimerManager.prototype.reset = function() {
  this.stop();
  this.currentTime = this.gameMode === 'countdown' ? this.countdownDuration : 0;
  this.startTime = null;
  this.endTime = null;
  this.updateDisplay();
  
  // Remove warning classes
  if (this.timerElement) {
    this.timerElement.classList.remove('timer-warning', 'timer-critical');
  }
};

// Polyfill for String.padStart
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
