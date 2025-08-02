use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::Write;
use crate::engine::{Board, Move};

#[derive(Debug, Serialize, Deserialize)]
pub struct MoveData {
    pub timestamp: DateTime<Utc>,
    pub board_state: String,
    pub move_chosen: String,
    pub time_taken_ms: u64,
    pub up_score: f64,
    pub down_score: f64,
    pub left_score: f64,
    pub right_score: f64,
    pub best_score: f64,
    pub chosen_score: f64,
    pub variation_score: f64,
    pub is_bad_move: bool,
    pub game_score: u64,
    pub move_number: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameSession {
    pub session_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub final_score: u64,
    pub highest_tile: u64,
    pub total_moves: u32,
    pub bad_moves: u32,
    pub average_time_per_move_ms: f64,
}

pub struct PlayerDataRecorder {
    session_id: String,
    moves_data: Vec<MoveData>,
    session_start: DateTime<Utc>,
}

impl PlayerDataRecorder {
    pub fn new() -> Self {
        let session_id = Utc::now().format("%Y%m%d_%H%M%S").to_string();
        Self {
            session_id,
            moves_data: Vec::new(),
            session_start: Utc::now(),
        }
    }

    pub fn record_move(
        &mut self,
        board: Board,
        move_chosen: Move,
        time_taken_ms: u64,
        move_scores: [f64; 4], // [Up, Down, Left, Right]
        game_score: u64,
        move_number: u32,
    ) {
        let [up_score, down_score, left_score, right_score] = move_scores;
        
        // Find best score
        let best_score = move_scores.iter().fold(0.0/0.0, |m, v| v.max(m));
        
        // Get chosen score
        let chosen_score = match move_chosen {
            Move::Up => up_score,
            Move::Down => down_score,
            Move::Left => left_score,
            Move::Right => right_score,
        };

        // Calculate variation score (standard deviation)
        let mean_score = move_scores.iter().sum::<f64>() / 4.0;
        let variance = move_scores.iter()
            .map(|score| (score - mean_score).powi(2))
            .sum::<f64>() / 4.0;
        let variation_score = variance.sqrt();

        // Detect bad move (chosen score is significantly worse than best)
        let score_threshold = 0.1; // 10% threshold for bad move detection
        let is_bad_move = if best_score > 0.0 {
            (best_score - chosen_score) / best_score > score_threshold
        } else {
            false
        };

        let move_data = MoveData {
            timestamp: Utc::now(),
            board_state: board_to_string(board),
            move_chosen: move_to_string(move_chosen),
            time_taken_ms,
            up_score,
            down_score,
            left_score,
            right_score,
            best_score,
            chosen_score,
            variation_score,
            is_bad_move,
            game_score,
            move_number,
        };

        self.moves_data.push(move_data);
    }

    pub fn save_session_data(&self, final_score: u64, highest_tile: u64) -> Result<(), Box<dyn std::error::Error>> {
        // Save moves data to CSV
        let moves_filename = format!("player_moves_{}.csv", self.session_id);
        let mut moves_writer = csv::Writer::from_path(&moves_filename)?;

        for move_data in &self.moves_data {
            moves_writer.serialize(move_data)?;
        }
        moves_writer.flush()?;

        // Calculate session statistics
        let total_moves = self.moves_data.len() as u32;
        let bad_moves = self.moves_data.iter().filter(|m| m.is_bad_move).count() as u32;
        let total_time_ms: u64 = self.moves_data.iter().map(|m| m.time_taken_ms).sum();
        let average_time_per_move_ms = if total_moves > 0 {
            total_time_ms as f64 / total_moves as f64
        } else {
            0.0
        };

        let session = GameSession {
            session_id: self.session_id.clone(),
            start_time: self.session_start,
            end_time: Some(Utc::now()),
            final_score,
            highest_tile,
            total_moves,
            bad_moves,
            average_time_per_move_ms,
        };

        // Save session data
        let session_filename = format!("player_sessions_{}.json", 
            self.session_start.format("%Y%m"));
        
        let mut sessions = load_existing_sessions(&session_filename)?;
        sessions.push(session);
        
        let json_data = serde_json::to_string_pretty(&sessions)?;
        std::fs::write(&session_filename, json_data)?;

        // Also append to overall CSV for easy analysis
        let csv_filename = "player_sessions.csv";
        let file_exists = std::path::Path::new(csv_filename).exists();
        
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(csv_filename)?;

        if !file_exists {
            writeln!(file, "session_id,start_time,end_time,final_score,highest_tile,total_moves,bad_moves,average_time_per_move_ms")?;
        }

        let session = &sessions[sessions.len() - 1];
        writeln!(file, "{},{},{:?},{},{},{},{},{:.2}",
            session.session_id,
            session.start_time.format("%Y-%m-%d %H:%M:%S"),
            session.end_time.map(|t| t.format("%Y-%m-%d %H:%M:%S").to_string()).unwrap_or_default(),
            session.final_score,
            session.highest_tile,
            session.total_moves,
            session.bad_moves,
            session.average_time_per_move_ms
        )?;

        println!("Data saved to {} and {}", moves_filename, csv_filename);
        Ok(())
    }

    pub fn get_session_id(&self) -> &str {
        &self.session_id
    }
}

fn load_existing_sessions(filename: &str) -> Result<Vec<GameSession>, Box<dyn std::error::Error>> {
    if std::path::Path::new(filename).exists() {
        let content = std::fs::read_to_string(filename)?;
        let sessions: Vec<GameSession> = serde_json::from_str(&content)?;
        Ok(sessions)
    } else {
        Ok(Vec::new())
    }
}

fn board_to_string(board: Board) -> String {
    let board_vec = crate::engine::to_vec(board);
    board_vec.iter().map(|&x| x.to_string()).collect::<Vec<_>>().join(",")
}

fn move_to_string(move_dir: Move) -> String {
    match move_dir {
        Move::Up => "Up".to_string(),
        Move::Down => "Down".to_string(),
        Move::Left => "Left".to_string(),
        Move::Right => "Right".to_string(),
    }
}
