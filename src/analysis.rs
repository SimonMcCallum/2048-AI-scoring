use std::fs::File;
use std::error::Error;
use csv::Reader;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct MoveRecord {
    timestamp: String,
    board_state: String,
    move_chosen: String,
    time_taken_ms: u64,
    up_score: f64,
    down_score: f64,
    left_score: f64,
    right_score: f64,
    best_score: f64,
    chosen_score: f64,
    variation_score: f64,
    is_bad_move: bool,
    game_score: u64,
    move_number: u32,
}

#[derive(Debug, Deserialize)]
struct SessionRecord {
    session_id: String,
    start_time: String,
    end_time: String,
    final_score: u64,
    highest_tile: u64,
    total_moves: u32,
    bad_moves: u32,
    average_time_per_move_ms: f64,
}

pub fn analyze_player_data(moves_file: &str) -> Result<(), Box<dyn Error>> {
    let mut reader = Reader::from_path(moves_file)?;
    let mut moves: Vec<MoveRecord> = Vec::new();
    
    for result in reader.deserialize() {
        let record: MoveRecord = result?;
        moves.push(record);
    }
    
    if moves.is_empty() {
        println!("No move data found in {}", moves_file);
        return Ok(());
    }
    
    println!("=== Player Performance Analysis ===");
    println!("Total moves analyzed: {}", moves.len());
    
    // Time analysis
    let total_time: u64 = moves.iter().map(|m| m.time_taken_ms).sum();
    let avg_time = total_time as f64 / moves.len() as f64;
    let min_time = moves.iter().map(|m| m.time_taken_ms).min().unwrap();
    let max_time = moves.iter().map(|m| m.time_taken_ms).max().unwrap();
    
    println!("\n--- Timing Analysis ---");
    println!("Average time per move: {:.2}s", avg_time / 1000.0);
    println!("Fastest move: {:.2}s", min_time as f64 / 1000.0);
    println!("Slowest move: {:.2}s", max_time as f64 / 1000.0);
    
    // Decision quality analysis
    let bad_moves = moves.iter().filter(|m| m.is_bad_move).count();
    let bad_move_percentage = (bad_moves as f64 / moves.len() as f64) * 100.0;
    
    println!("\n--- Decision Quality ---");
    println!("Bad moves: {} ({:.1}%)", bad_moves, bad_move_percentage);
    
    let avg_score_difference: f64 = moves.iter()
        .map(|m| m.best_score - m.chosen_score)
        .sum::<f64>() / moves.len() as f64;
    
    println!("Average score loss per move: {:.1}", avg_score_difference);
    
    // Difficulty analysis
    let avg_variation: f64 = moves.iter().map(|m| m.variation_score).sum::<f64>() / moves.len() as f64;
    println!("Average decision difficulty: {:.1}", avg_variation);
    
    // Move preference analysis
    let mut move_counts = std::collections::HashMap::new();
    for mv in &moves {
        *move_counts.entry(mv.move_chosen.clone()).or_insert(0) += 1;
    }
    
    println!("\n--- Move Preferences ---");
    for (move_type, count) in move_counts {
        let percentage = (count as f64 / moves.len() as f64) * 100.0;
        println!("{}: {} ({:.1}%)", move_type, count, percentage);
    }
    
    // Performance over time (early vs late game)
    let mid_point = moves.len() / 2;
    let early_game = &moves[..mid_point];
    let late_game = &moves[mid_point..];
    
    let early_bad_moves = early_game.iter().filter(|m| m.is_bad_move).count();
    let late_bad_moves = late_game.iter().filter(|m| m.is_bad_move).count();
    
    let early_avg_time: f64 = early_game.iter().map(|m| m.time_taken_ms).sum::<f64>() / early_game.len() as f64;
    let late_avg_time: f64 = late_game.iter().map(|m| m.time_taken_ms).sum::<f64>() / late_game.len() as f64;
    
    println!("\n--- Game Progression ---");
    println!("Early game bad moves: {}/{} ({:.1}%)", 
             early_bad_moves, early_game.len(), 
             (early_bad_moves as f64 / early_game.len() as f64) * 100.0);
    println!("Late game bad moves: {}/{} ({:.1}%)", 
             late_bad_moves, late_game.len(), 
             (late_bad_moves as f64 / late_game.len() as f64) * 100.0);
    println!("Early game avg time: {:.2}s", early_avg_time / 1000.0);
    println!("Late game avg time: {:.2}s", late_avg_time / 1000.0);
    
    Ok(())
}

pub fn analyze_sessions() -> Result<(), Box<dyn Error>> {
    let sessions_file = "player_sessions.csv";
    
    if !std::path::Path::new(sessions_file).exists() {
        println!("No sessions file found: {}", sessions_file);
        return Ok(());
    }
    
    let mut reader = Reader::from_path(sessions_file)?;
    let mut sessions: Vec<SessionRecord> = Vec::new();
    
    for result in reader.deserialize() {
        let record: SessionRecord = result?;
        sessions.push(record);
    }
    
    if sessions.is_empty() {
        println!("No session data found");
        return Ok(());
    }
    
    println!("\n=== Session Summary ===");
    println!("Total sessions: {}", sessions.len());
    
    let avg_score: f64 = sessions.iter().map(|s| s.final_score).sum::<u64>() as f64 / sessions.len() as f64;
    let max_score = sessions.iter().map(|s| s.final_score).max().unwrap();
    let max_tile = sessions.iter().map(|s| s.highest_tile).max().unwrap();
    
    println!("Average final score: {:.0}", avg_score);
    println!("Best score: {}", max_score);
    println!("Highest tile achieved: {}", max_tile);
    
    let avg_moves: f64 = sessions.iter().map(|s| s.total_moves).sum::<u32>() as f64 / sessions.len() as f64;
    println!("Average moves per game: {:.1}", avg_moves);
    
    let avg_bad_move_rate: f64 = sessions.iter()
        .map(|s| s.bad_moves as f64 / s.total_moves as f64 * 100.0)
        .sum::<f64>() / sessions.len() as f64;
    println!("Average bad move rate: {:.1}%", avg_bad_move_rate);
    
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() > 1 {
        println!("Analyzing moves file: {}", &args[1]);
        analyze_player_data(&args[1])?;
    } else {
        println!("Usage: cargo run --bin analyze [moves_file.csv]");
        println!("If no file specified, will analyze session summary only.\n");
    }
    
    analyze_sessions()?;
    
    Ok(())
}
