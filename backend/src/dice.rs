pub mod dice {
    use rand::Rng;

    #[tauri::command]
    pub fn roll_dice(dice: Vec<String>) -> Result<Vec<i32>, String> {
        let mut results = Vec::new();
        let mut rng = rand::thread_rng();

        for die in dice {
            let die_clean = die.replace("+", "").replace(" ", "").to_lowercase();
            
            // Si c'est un modificateur fixe (ex: "3" ou "-2")
            if let Ok(flat_val) = die_clean.parse::<i32>() {
                results.push(flat_val);
                continue;
            }

            // Sinon, format attendu: "d20", "2d10"
            let parts: Vec<&str> = die_clean.split('d').collect();
            
            if parts.len() == 2 {
                let count_str = parts[0];
                let max_str = parts[1];
                
                let count = if count_str.is_empty() { 1 } else { count_str.parse::<u32>().unwrap_or(0) };
                let max = max_str.parse::<u32>().unwrap_or(0);
                
                if count > 0 && count <= 100 && max > 0 {
                    for _ in 0..count {
                        results.push(rng.gen_range(1..=max) as i32);
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
