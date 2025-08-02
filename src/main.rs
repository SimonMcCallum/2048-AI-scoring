use ai_2048::engine as GameEngine;
use ai_2048::engine::{Board, Move};
use ai_2048::expectimax::Expectimax;
use ai_2048::player_data::PlayerDataRecorder;
use std::io::{self, Write};
use std::time::Instant;

fn main() {
    println!("=== 2048 Human Player with AI Scoring ===");
    println!("Use WASD keys to move:");
    println!("  W = Up");
    println!("  A = Left"); 
    println!("  S = Down");
    println!("  D = Right");
    println!("  Q = Quit");
    println!();

    // Initialize game engine and AI
    GameEngine::new();
    let mut expectimax = Expectimax::new();
    let mut recorder = PlayerDataRecorder::new();
    
    // Initialize game board
    let mut board = GameEngine::insert_random_tile(0);
    board = GameEngine::insert_random_tile(board);
    
    let mut move_number = 1;
    
    println!("Session ID: {}", recorder.get_session_id());
    println!("Starting game...\n");

    // Main game loop
    while !GameEngine::is_game_over(board) {
        // Display current board
        display_game_state(board, move_number);
        
        // Get AI scores for all possible moves
        let move_scores = get_all_move_scores(&mut expectimax, board);
        
        // Display AI analysis
        display_ai_analysis(&move_scores);
        
        // Get player input with timing
        let start_time = Instant::now();
        match get_player_move() {
            Some(player_move) => {
                let time_taken = start_time.elapsed();
                
                // Check if the move is valid
                let new_board = GameEngine::shift(board, player_move);
                if new_board == board {
                    println!("Invalid move! Try again.");
                    continue;
                }
                
                // Record the move data
                recorder.record_move(
                    board,
                    player_move,
                    time_taken.as_millis() as u64,
                    move_scores,
                    GameEngine::get_score(board),
                    move_number,
                );
                
                // Make the move
                board = GameEngine::make_move(board, player_move);
                move_number += 1;
                
                println!("Move made in {:.2}s\n", time_taken.as_secs_f64());
            }
            None => {
                println!("Quitting game...");
                break;
            }
        }
    }

    // Game over
    let final_score = GameEngine::get_score(board);
    let highest_tile = GameEngine::get_highest_tile_val(board);
    
    println!("\n=== GAME OVER ===");
    println!("Final Score: {}", final_score);
    println!("Highest Tile: {}", highest_tile);
    println!("Total Moves: {}", move_number - 1);
    
    display_game_state(board, move_number);
    
    // Save session data
    match recorder.save_session_data(final_score, highest_tile) {
        Ok(()) => println!("Game data saved successfully!"),
        Err(e) => println!("Error saving game data: {}", e),
    }
}

fn display_game_state(board: Board, move_number: u32) {
    println!("Move #{} | Score: {}", move_number, GameEngine::get_score(board));
    println!("{}", GameEngine::to_str(board));
}

fn get_all_move_scores(expectimax: &mut Expectimax, board: Board) -> [f64; 4] {
    let mut scores = [0.0; 4];
    let moves = [Move::Up, Move::Down, Move::Left, Move::Right];
    
    for (i, &direction) in moves.iter().enumerate() {
        let new_board = GameEngine::shift(board, direction);
        if new_board != board {
            // Use a simplified expectimax for faster response
            let mut temp_expectimax = Expectimax::new();
            scores[i] = get_move_score(&mut temp_expectimax, new_board);
        } else {
            scores[i] = -1.0; // Invalid move
        }
    }
    
    scores
}

fn get_move_score(expectimax: &mut Expectimax, board: Board) -> f64 {
    // Use a shallower depth for real-time response
    // Simplified scoring - use game score + empty tiles heuristic
    let game_score = GameEngine::get_score(board) as f64;
    let empty_tiles = GameEngine::count_empty(board) as f64;
    let smoothness = calculate_smoothness(board);
    
    // Simple heuristic: prioritize score, empty tiles, and board smoothness
    game_score + (empty_tiles * 100.0) + smoothness
}

fn calculate_smoothness(board: Board) -> f64 {
    let mut smoothness = 0.0;
    let board_vec = GameEngine::to_vec(board);
    
    // Check horizontal smoothness
    for row in 0..4 {
        for col in 0..3 {
            let idx1 = row * 4 + col;
            let idx2 = row * 4 + col + 1;
            if board_vec[idx1] != 0 && board_vec[idx2] != 0 {
                smoothness -= (board_vec[idx1] as i32 - board_vec[idx2] as i32).abs() as f64;
            }
        }
    }
    
    // Check vertical smoothness
    for row in 0..3 {
        for col in 0..4 {
            let idx1 = row * 4 + col;
            let idx2 = (row + 1) * 4 + col;
            if board_vec[idx1] != 0 && board_vec[idx2] != 0 {
                smoothness -= (board_vec[idx1] as i32 - board_vec[idx2] as i32).abs() as f64;
            }
        }
    }
    
    smoothness
}

fn display_ai_analysis(move_scores: &[f64; 4]) {
    let moves = ["Up", "Down", "Left", "Right"];
    let mut valid_moves: Vec<(usize, f64)> = move_scores.iter()
        .enumerate()
        .filter(|(_, &score)| score >= 0.0)
        .map(|(i, &score)| (i, score))
        .collect();
    
    if valid_moves.is_empty() {
        println!("No valid moves available!");
        return;
    }
    
    // Sort by score (descending)
    valid_moves.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    
    // Calculate variation (difficulty)
    let scores: Vec<f64> = valid_moves.iter().map(|(_, score)| *score).collect();
    let mean_score = scores.iter().sum::<f64>() / scores.len() as f64;
    let variance = scores.iter()
        .map(|score| (score - mean_score).powi(2))
        .sum::<f64>() / scores.len() as f64;
    let std_dev = variance.sqrt();
    
    println!("AI Analysis:");
    for (rank, &(move_idx, score)) in valid_moves.iter().enumerate() {
        let marker = if rank == 0 { "★" } else { " " };
        println!("  {}{}: {:.1} ({})", marker, moves[move_idx], score, 
                 if rank == 0 { "BEST" } else { "    " });
    }
    
    let difficulty = if std_dev < 50.0 { "EASY" } 
                    else if std_dev < 200.0 { "MEDIUM" } 
                    else { "HARD" };
    
    println!("  Decision difficulty: {} (variation: {:.1})", difficulty, std_dev);
    println!();
}

fn get_player_move() -> Option<Move> {
    loop {
        print!("Your move (WASD or Q to quit): ");
        io::stdout().flush().unwrap();
        
        let mut input = String::new();
        match io::stdin().read_line(&mut input) {
            Ok(_) => {
                match input.trim().to_lowercase().as_str() {
                    "w" => return Some(Move::Up),
                    "a" => return Some(Move::Left),
                    "s" => return Some(Move::Down),
                    "d" => return Some(Move::Right),
                    "q" | "quit" | "exit" => return None,
                    _ => {
                        println!("Invalid input! Use W/A/S/D for moves or Q to quit.");
                        continue;
                    }
                }
            }
            Err(_) => {
                println!("Error reading input. Try again.");
                continue;
            }
        }
    }
}
