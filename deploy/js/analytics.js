// Analytics Dashboard JavaScript
class GameAnalytics {
    constructor() {
        this.gameData = [];
        this.moveData = [];
        this.charts = {};
        this.filteredData = [];
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadData();
            this.setupFilters();
            this.calculateOverallStats();
            this.createCharts();
            this.showContent();
        } catch (error) {
            console.error('Error initializing analytics:', error);
            this.showError();
        }
    }
    
    async loadData() {
        // Try to load from server first, then fall back to localStorage
        try {
            const serverUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
                ? 'http://127.0.0.1:3000/api/list-sessions'
                : '/api/list-sessions';
                
            const response = await fetch(serverUrl);
            if (response.ok) {
                this.gameData = await response.json();
                console.log('Loaded', this.gameData.length, 'sessions from server');
            } else {
                throw new Error('Server data not available');
            }
        } catch (error) {
            console.log('Loading from localStorage...');
            this.loadFromLocalStorage();
        }
        
        if (this.gameData.length === 0) {
            throw new Error('No game data available');
        }
        
        // Load detailed move data from localStorage
        this.loadMoveData();
        this.filteredData = [...this.gameData];
    }
    
    loadFromLocalStorage() {
        const sessions = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('gameSession_')) {
                try {
                    const sessionData = JSON.parse(localStorage.getItem(key));
                    sessions.push(sessionData);
                } catch (e) {
                    console.warn('Failed to parse session:', key);
                }
            }
        }
        this.gameData = sessions;
    }
    
    loadMoveData() {
        const moves = [];
        this.gameData.forEach(session => {
            if (session.moves && Array.isArray(session.moves)) {
                moves.push(...session.moves);
            }
        });
        this.moveData = moves;
    }
    
    setupFilters() {
        const playerFilter = document.getElementById('playerFilter');
        const players = [...new Set(this.gameData.map(g => g.playerName))];
        
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            playerFilter.appendChild(option);
        });
        
        // Set up game selector
        this.setupGameSelector();
        
        // Set up filter event listeners
        document.getElementById('modeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('playerFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('startDate').addEventListener('change', () => this.applyFilters());
        document.getElementById('endDate').addEventListener('change', () => this.applyFilters());
        
        // Set default date range
        const dates = this.gameData.map(g => new Date(g.startTime)).sort();
        if (dates.length > 0) {
            document.getElementById('startDate').value = dates[0].toISOString().split('T')[0];
            document.getElementById('endDate').value = dates[dates.length - 1].toISOString().split('T')[0];
        }
    }
    
    applyFilters() {
        const modeFilter = document.getElementById('modeFilter').value;
        const playerFilter = document.getElementById('playerFilter').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        this.filteredData = this.gameData.filter(game => {
            if (modeFilter !== 'all' && game.gameMode !== modeFilter) return false;
            if (playerFilter !== 'all' && game.playerName !== playerFilter) return false;
            
            const gameDate = new Date(game.startTime);
            if (startDate && gameDate < new Date(startDate)) return false;
            if (endDate && gameDate > new Date(endDate + 'T23:59:59')) return false;
            
            return true;
        });
        
        this.calculateOverallStats();
        this.updateCharts();
    }
    
    calculateOverallStats() {
        const data = this.filteredData;
        const moves = this.moveData.filter(move => 
            data.some(game => game.sessionId === move.sessionId)
        );
        
        document.getElementById('totalGames').textContent = data.length;
        document.getElementById('totalPlayers').textContent = 
            new Set(data.map(g => g.playerName)).size;
        
        const avgScore = data.length > 0 ? 
            Math.round(data.reduce((sum, g) => sum + g.finalScore, 0) / data.length) : 0;
        document.getElementById('avgScore').textContent = avgScore.toLocaleString();
        
        const bestScore = data.length > 0 ? 
            Math.max(...data.map(g => g.finalScore)) : 0;
        document.getElementById('bestScore').textContent = bestScore.toLocaleString();
        
        const totalMoves = data.reduce((sum, g) => sum + (g.totalMoves || 0), 0);
        document.getElementById('totalMoves').textContent = totalMoves.toLocaleString();
        
        const goodMoves = moves.filter(m => !m.isBadMove).length;
        const goodMoveRate = moves.length > 0 ? 
            Math.round((goodMoves / moves.length) * 100) : 0;
        document.getElementById('goodMoveRate').textContent = goodMoveRate + '%';
    }
    
    createCharts() {
        this.createScoreChart();
        this.createLearningChart();
        this.createModeChart();
        this.createTimeChart();
        this.createPlayerChart();
    }
    
    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.createCharts();
    }
    
    createScoreChart() {
        const ctx = document.getElementById('scoreChart').getContext('2d');
        const sortedData = this.filteredData
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        const labels = sortedData.map((game, index) => index + 1);
        const scores = sortedData.map(game => game.finalScore);
        
        this.charts.scoreChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score Progression',
                    data: scores,
                    borderColor: '#8f7a66',
                    backgroundColor: 'rgba(143, 122, 102, 0.1)',
                    tension: 0.4,
                    pointBackgroundColor: '#8f7a66',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Game Number'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Score'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const gameIndex = context.dataIndex;
                                const game = sortedData[gameIndex];
                                return `${game.playerName}: ${context.parsed.y.toLocaleString()} (${game.gameMode})`;
                            }
                        }
                    }
                }
            }
        });
        
        this.generateScoreInsights();
    }
    
    createLearningChart() {
        const ctx = document.getElementById('learningChart').getContext('2d');
        
        // Group moves by player and calculate rolling average of good moves
        const playerData = {};
        this.moveData.forEach(move => {
            if (!playerData[move.playerName]) {
                playerData[move.playerName] = [];
            }
            playerData[move.playerName].push(move);
        });
        
        const datasets = [];
        const colors = ['#8f7a66', '#f2b179', '#f67c5f', '#edcf72', '#bbada0'];
        let colorIndex = 0;
        
        Object.entries(playerData).forEach(([player, moves]) => {
            if (moves.length < 10) return; // Skip players with too few moves
            
            const sortedMoves = moves.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const rollingAverage = [];
            const windowSize = 20;
            
            for (let i = windowSize - 1; i < sortedMoves.length; i++) {
                const window = sortedMoves.slice(i - windowSize + 1, i + 1);
                const goodMoves = window.filter(m => !m.isBadMove).length;
                const percentage = (goodMoves / windowSize) * 100;
                
                rollingAverage.push({
                    x: i + 1,
                    y: percentage
                });
            }
            
            datasets.push({
                label: player,
                data: rollingAverage,
                borderColor: colors[colorIndex % colors.length],
                backgroundColor: colors[colorIndex % colors.length] + '20',
                tension: 0.4,
                pointRadius: 2
            });
            
            colorIndex++;
        });
        
        this.charts.learningChart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Move Number'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Good Move Percentage'
                        },
                        min: 0,
                        max: 100
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
        
        this.generateLearningInsights();
    }
    
    createModeChart() {
        const ctx = document.getElementById('modeChart').getContext('2d');
        
        const modeStats = {};
        this.filteredData.forEach(game => {
            if (!modeStats[game.gameMode]) {
                modeStats[game.gameMode] = {
                    count: 0,
                    totalScore: 0,
                    totalTime: 0,
                    totalMoves: 0
                };
            }
            
            modeStats[game.gameMode].count++;
            modeStats[game.gameMode].totalScore += game.finalScore;
            modeStats[game.gameMode].totalTime += game.gameTime || 0;
            modeStats[game.gameMode].totalMoves += game.totalMoves || 0;
        });
        
        const modes = Object.keys(modeStats);
        const avgScores = modes.map(mode => 
            modeStats[mode].totalScore / modeStats[mode].count
        );
        
        this.charts.modeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: modes.map(mode => {
                    const names = {
                        'normal': 'No Timer',
                        'countup': 'Count Up',
                        'countdown': 'Countdown'
                    };
                    return names[mode] || mode;
                }),
                datasets: [{
                    label: 'Average Score',
                    data: avgScores,
                    backgroundColor: ['#8f7a66', '#f2b179', '#f67c5f'],
                    borderColor: ['#7a6b5d', '#e09954', '#d85a36'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Average Score'
                        }
                    }
                }
            }
        });
        
        this.generateModeInsights(modeStats);
    }
    
    createTimeChart() {
        const ctx = document.getElementById('timeChart').getContext('2d');
        
        // Analyze move times
        const timeBuckets = {
            'Fast (0-1s)': 0,
            'Normal (1-3s)': 0,
            'Slow (3-5s)': 0,
            'Very Slow (5s+)': 0
        };
        
        const moveTimeData = [];
        this.moveData.forEach(move => {
            const timeMs = move.moveTime || 0;
            const timeSec = timeMs / 1000;
            
            if (timeSec <= 1) timeBuckets['Fast (0-1s)']++;
            else if (timeSec <= 3) timeBuckets['Normal (1-3s)']++;
            else if (timeSec <= 5) timeBuckets['Slow (3-5s)']++;
            else timeBuckets['Very Slow (5s+)']++;
            
            moveTimeData.push({
                time: timeSec,
                isBad: move.isBadMove || false
            });
        });
        
        this.charts.timeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(timeBuckets),
                datasets: [{
                    data: Object.values(timeBuckets),
                    backgroundColor: ['#8f7a66', '#f2b179', '#f67c5f', '#bbada0'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        this.generateTimeInsights(moveTimeData);
    }
    
    createPlayerChart() {
        const ctx = document.getElementById('playerChart').getContext('2d');
        
        const playerStats = {};
        this.filteredData.forEach(game => {
            if (!playerStats[game.playerName]) {
                playerStats[game.playerName] = {
                    games: 0,
                    totalScore: 0,
                    bestScore: 0,
                    totalMoves: 0
                };
            }
            
            const stats = playerStats[game.playerName];
            stats.games++;
            stats.totalScore += game.finalScore;
            stats.bestScore = Math.max(stats.bestScore, game.finalScore);
            stats.totalMoves += game.totalMoves || 0;
        });
        
        const players = Object.keys(playerStats);
        const avgScores = players.map(player => 
            playerStats[player].totalScore / playerStats[player].games
        );
        const bestScores = players.map(player => playerStats[player].bestScore);
        
        this.charts.playerChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: players,
                datasets: [{
                    label: 'Average Score',
                    data: avgScores,
                    backgroundColor: 'rgba(143, 122, 102, 0.7)',
                    borderColor: '#8f7a66',
                    borderWidth: 2
                }, {
                    label: 'Best Score',
                    data: bestScores,
                    backgroundColor: 'rgba(242, 177, 121, 0.7)',
                    borderColor: '#f2b179',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Score'
                        }
                    }
                }
            }
        });
        
        this.generatePlayerInsights(playerStats);
    }
    
    generateScoreInsights() {
        const data = this.filteredData;
        if (data.length === 0) return;
        
        const scores = data.map(g => g.finalScore).sort((a, b) => b - a);
        const improvement = this.calculateImprovement(data);
        
        const insights = [
            `Highest score achieved: ${scores[0].toLocaleString()}`,
            `Score range: ${scores[scores.length - 1].toLocaleString()} - ${scores[0].toLocaleString()}`,
            improvement > 0 ? 
                `Average improvement: ${improvement.toFixed(1)}% over time` :
                `Performance trend: ${Math.abs(improvement).toFixed(1)}% decline over time`
        ];
        
        document.getElementById('scoreInsights').innerHTML = 
            '<h4>Key Insights:</h4><ul>' + 
            insights.map(insight => `<li>${insight}</li>`).join('') + 
            '</ul>';
    }
    
    generateLearningInsights() {
        const moves = this.moveData;
        if (moves.length === 0) return;
        
        const totalMoves = moves.length;
        const goodMoves = moves.filter(m => !m.isBadMove).length;
        const goodMoveRate = (goodMoves / totalMoves) * 100;
        
        // Calculate learning trend
        const firstHalf = moves.slice(0, Math.floor(totalMoves / 2));
        const secondHalf = moves.slice(Math.floor(totalMoves / 2));
        
        const firstHalfGoodRate = (firstHalf.filter(m => !m.isBadMove).length / firstHalf.length) * 100;
        const secondHalfGoodRate = (secondHalf.filter(m => !m.isBadMove).length / secondHalf.length) * 100;
        const improvement = secondHalfGoodRate - firstHalfGoodRate;
        
        const insights = [
            `Overall good move rate: ${goodMoveRate.toFixed(1)}%`,
            `Learning improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% from first to second half`,
            improvement > 5 ? 'Strong learning curve detected!' : 
            improvement > 0 ? 'Gradual improvement observed' : 'Consider reviewing strategy'
        ];
        
        document.getElementById('learningInsights').innerHTML = 
            '<h4>Learning Analysis:</h4><ul>' + 
            insights.map(insight => `<li>${insight}</li>`).join('') + 
            '</ul>';
    }
    
    generateModeInsights(modeStats) {
        const modes = Object.keys(modeStats);
        if (modes.length === 0) return;
        
        const bestMode = modes.reduce((best, mode) => 
            (modeStats[mode].totalScore / modeStats[mode].count) > 
            (modeStats[best].totalScore / modeStats[best].count) ? mode : best
        );
        
        const insights = [
            `Best performing mode: ${this.getModeDisplayName(bestMode)}`,
            `Most played mode: ${this.getModeDisplayName(modes.reduce((most, mode) => 
                modeStats[mode].count > modeStats[most].count ? mode : most))}`,
            'Timer modes can help improve focus and decision-making speed'
        ];
        
        document.getElementById('modeInsights').innerHTML = 
            '<h4>Mode Analysis:</h4><ul>' + 
            insights.map(insight => `<li>${insight}</li>`).join('') + 
            '</ul>';
    }
    
    generateTimeInsights(moveTimeData) {
        if (moveTimeData.length === 0) return;
        
        const avgTime = moveTimeData.reduce((sum, m) => sum + m.time, 0) / moveTimeData.length;
        const fastMoves = moveTimeData.filter(m => m.time <= 1);
        const fastBadMoves = fastMoves.filter(m => m.isBad).length;
        const fastBadRate = fastMoves.length > 0 ? (fastBadMoves / fastMoves.length) * 100 : 0;
        
        const insights = [
            `Average move time: ${avgTime.toFixed(1)} seconds`,
            `Fast moves bad rate: ${fastBadRate.toFixed(1)}%`,
            fastBadRate > 50 ? 'Consider slowing down for better decisions' : 
            'Good balance between speed and accuracy'
        ];
        
        document.getElementById('timeInsights').innerHTML = 
            '<h4>Timing Analysis:</h4><ul>' + 
            insights.map(insight => `<li>${insight}</li>`).join('') + 
            '</ul>';
    }
    
    generatePlayerInsights(playerStats) {
        const players = Object.keys(playerStats);
        if (players.length === 0) return;
        
        const topPlayer = players.reduce((best, player) => 
            (playerStats[player].totalScore / playerStats[player].games) > 
            (playerStats[best].totalScore / playerStats[best].games) ? player : best
        );
        
        const mostActive = players.reduce((most, player) => 
            playerStats[player].games > playerStats[most].games ? player : most
        );
        
        const insights = [
            `Top performer: ${topPlayer}`,
            `Most active player: ${mostActive} (${playerStats[mostActive].games} games)`,
            `Total unique players: ${players.length}`
        ];
        
        document.getElementById('playerInsights').innerHTML = 
            '<h4>Player Comparison:</h4><ul>' + 
            insights.map(insight => `<li>${insight}</li>`).join('') + 
            '</ul>';
    }
    
    calculateImprovement(data) {
        if (data.length < 2) return 0;
        
        const sorted = data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const firstQuarter = sorted.slice(0, Math.floor(sorted.length / 4));
        const lastQuarter = sorted.slice(-Math.floor(sorted.length / 4));
        
        const firstAvg = firstQuarter.reduce((sum, g) => sum + g.finalScore, 0) / firstQuarter.length;
        const lastAvg = lastQuarter.reduce((sum, g) => sum + g.finalScore, 0) / lastQuarter.length;
        
        return ((lastAvg - firstAvg) / firstAvg) * 100;
    }
    
    getModeDisplayName(mode) {
        const names = {
            'normal': 'No Timer',
            'countup': 'Count Up Timer',
            'countdown': 'Countdown Timer'
        };
        return names[mode] || mode;
    }
    
    showContent() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('analytics-content').style.display = 'block';
    }
    
    setupGameSelector() {
        const gameSelect = document.getElementById('gameSelect');
        
        // Populate game selector with available games
        this.gameData.forEach((game, index) => {
            const option = document.createElement('option');
            option.value = game.sessionId;
            const date = new Date(game.startTime).toLocaleDateString();
            const time = new Date(game.startTime).toLocaleTimeString();
            option.textContent = `${game.playerName} - ${this.getModeDisplayName(game.gameMode)} - ${date} ${time} (Score: ${game.finalScore})`;
            gameSelect.appendChild(option);
        });
        
        // Set up game selection event listener
        gameSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.analyzeIndividualGame(e.target.value);
            } else {
                document.getElementById('gameAnalysisContent').style.display = 'none';
            }
        });
    }
    
    async analyzeIndividualGame(sessionId) {
        const game = this.gameData.find(g => g.sessionId === sessionId);
        if (!game) return;
        
        // Show the analysis content
        document.getElementById('gameAnalysisContent').style.display = 'block';
        
        // Get move data for this specific game
        const gameMoves = game.moves || [];
        
        if (gameMoves.length === 0) {
            document.getElementById('gameDetailInsights').innerHTML = 
                '<div class="insights"><h4>No Move Data Available</h4><p>This game does not have detailed move-by-move data.</p></div>';
            return;
        }
        
        // Create detailed game analysis chart
        this.createGameDetailChart(game, gameMoves);
        this.generateGameDetailInsights(game, gameMoves);
    }
    
    createGameDetailChart(game, moves) {
        const ctx = document.getElementById('gameDetailChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.gameDetailChart) {
            this.charts.gameDetailChart.destroy();
        }
        
        // Create labels for x-axis (move numbers)
        const labels = moves.map((move, index) => index + 1);
        
        // Prepare datasets
        const datasets = [];
        
        // Game score progression
        const scoreData = moves.map(move => move.score || 0);
        
        datasets.push({
            label: 'Game Score',
            data: scoreData,
            borderColor: '#8f7a66',
            backgroundColor: 'rgba(143, 122, 102, 0.1)',
            tension: 0.4,
            pointRadius: 3,
            yAxisID: 'y'
        });
        
        // Expectimax scores for each move option (if available)
        if (moves.some(m => m.expectimaxScores)) {
            const upScores = moves.map(move => move.expectimaxScores?.up || 0);
            const downScores = moves.map(move => move.expectimaxScores?.down || 0);
            const leftScores = moves.map(move => move.expectimaxScores?.left || 0);
            const rightScores = moves.map(move => move.expectimaxScores?.right || 0);
            
            datasets.push(
                {
                    label: 'Up Score',
                    data: upScores,
                    borderColor: '#f67c5f',
                    backgroundColor: 'rgba(246, 124, 95, 0.1)',
                    tension: 0.2,
                    pointRadius: 2,
                    yAxisID: 'y1'
                },
                {
                    label: 'Down Score',
                    data: downScores,
                    borderColor: '#f2b179',
                    backgroundColor: 'rgba(242, 177, 121, 0.1)',
                    tension: 0.2,
                    pointRadius: 2,
                    yAxisID: 'y1'
                },
                {
                    label: 'Left Score',
                    data: leftScores,
                    borderColor: '#edcf72',
                    backgroundColor: 'rgba(237, 207, 114, 0.1)',
                    tension: 0.2,
                    pointRadius: 2,
                    yAxisID: 'y1'
                },
                {
                    label: 'Right Score',
                    data: rightScores,
                    borderColor: '#bbada0',
                    backgroundColor: 'rgba(187, 173, 160, 0.1)',
                    tension: 0.2,
                    pointRadius: 2,
                    yAxisID: 'y1'
                }
            );
        }
        
        // Average score per move trend line
        const avgScorePerMove = [];
        let cumulativeScore = 0;
        moves.forEach((move, index) => {
            cumulativeScore += move.score || 0;
            avgScorePerMove.push(cumulativeScore / (index + 1));
        });
        
        datasets.push({
            label: 'Average Score per Move',
            data: avgScorePerMove,
            borderColor: '#776e65',
            backgroundColor: 'rgba(119, 110, 101, 0.1)',
            borderDash: [5, 5],
            tension: 0.4,
            pointRadius: 1,
            yAxisID: 'y'
        });
        
        this.charts.gameDetailChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: labels,
                datasets: datasets 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Move Number'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Game Score'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Expectimax Score'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const moveIndex = context.dataIndex;
                                const move = moves[moveIndex];
                                let label = `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
                                if (context.dataset.label === 'Game Score' && move) {
                                    label += ` (${move.direction}, ${move.isBadMove ? 'Bad' : 'Good'} move)`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
    
    generateGameDetailInsights(game, moves) {
        const badMoves = moves.filter(m => m.isBadMove).length;
        const goodMoveRate = ((moves.length - badMoves) / moves.length * 100).toFixed(1);
        
        const avgMoveTime = moves.reduce((sum, m) => sum + (m.moveTime || 0), 0) / moves.length / 1000;
        
        const directionCounts = {};
        moves.forEach(move => {
            directionCounts[move.direction] = (directionCounts[move.direction] || 0) + 1;
        });
        
        const mostUsedDirection = Object.entries(directionCounts)
            .sort(([,a], [,b]) => b - a)[0];
        
        // Calculate score efficiency (score per move)
        const scoreEfficiency = game.finalScore / moves.length;
        
        // Find the best and worst moves based on expectimax scores
        let bestMove = null;
        let worstMove = null;
        
        if (moves.some(m => m.expectimaxScores)) {
            moves.forEach((move, index) => {
                if (move.expectimaxScores) {
                    const scores = Object.values(move.expectimaxScores);
                    const maxScore = Math.max(...scores);
                    const chosenScore = move.expectimaxScores[move.direction.toLowerCase()];
                    const efficiency = chosenScore / maxScore;
                    
                    if (!bestMove || efficiency > bestMove.efficiency) {
                        bestMove = { move: index + 1, efficiency, direction: move.direction };
                    }
                    if (!worstMove || efficiency < worstMove.efficiency) {
                        worstMove = { move: index + 1, efficiency, direction: move.direction };
                    }
                }
            });
        }
        
        const insights = [
            `Game Duration: ${moves.length} moves`,
            `Good Move Rate: ${goodMoveRate}%`,
            `Average Move Time: ${avgMoveTime.toFixed(2)} seconds`,
            `Score Efficiency: ${scoreEfficiency.toFixed(1)} points per move`,
            `Most Used Direction: ${mostUsedDirection[0]} (${mostUsedDirection[1]} times)`,
            `Game Mode: ${this.getModeDisplayName(game.gameMode)}`,
            `Final Score: ${game.finalScore.toLocaleString()}`
        ];
        
        if (bestMove && worstMove) {
            insights.push(
                `Best Move: #${bestMove.move} (${bestMove.direction}, ${(bestMove.efficiency * 100).toFixed(1)}% efficiency)`,
                `Worst Move: #${worstMove.move} (${worstMove.direction}, ${(worstMove.efficiency * 100).toFixed(1)}% efficiency)`
            );
        }
        
        document.getElementById('gameDetailInsights').innerHTML = 
            '<h4>Game Analysis:</h4><ul>' + 
            insights.map(insight => `<li>${insight}</li>`).join('') + 
            '</ul>';
    }
    
    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', () => {
    new GameAnalytics();
});
