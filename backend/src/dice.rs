pub mod dice {
    use rand::Rng;

    #[tauri::command]
    pub fn roll_dice(dice: Vec<String>) -> Result<Vec<u32>, String> {
        let mut results = Vec::new();
        let mut rng = rand::thread_rng();

        for die in dice {
            // die format expected: "d20", "d100", "d42"
            let die_lower = die.to_lowercase();
            let parts: Vec<&str> = die_lower.split('d').collect();
            
            if parts.len() == 2 {
                let count_str = parts[0];
                let max_str = parts[1];
                
                let count = if count_str.is_empty() { 1 } else { count_str.parse::<u32>().unwrap_or(0) };
                let max = max_str.parse::<u32>().unwrap_or(0);
                
                if count > 0 && count <= 100 && max > 0 {
                    for _ in 0..count {
                        results.push(rng.gen_range(1..=max));
                    }
                } else {
                    return Err(format!("Invalid dice format or limits (max 100 dice): {}", die));
                }
            } else {
                return Err(format!("Invalid dice format: {}", die));
            }
        }

        Ok(results)
    }
}
