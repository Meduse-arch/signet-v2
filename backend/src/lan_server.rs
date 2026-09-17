use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct RoomState {
    pub offer: Option<String>,
    pub answer: Option<String>,
    #[serde(skip)]
    pub created_at: Option<Instant>,
}

#[derive(Deserialize)]
pub struct SignalParams {
    #[serde(rename = "roomId")]
    pub room_id: String,
}

#[derive(Deserialize)]
pub struct SignalPayload {
    pub r#type: String, // "offer" or "answer"
    pub data: String,   // Encrypted Base64 string
}

type SharedState = Arc<RwLock<HashMap<String, RoomState>>>;

/// Démarre le serveur LAN sur le port 3030.
/// Ce serveur tourne en tâche de fond pour toute la durée de l'application.
pub async fn start_lan_server() {
    let state: SharedState = Arc::new(RwLock::new(HashMap::new()));

    // Lance le nettoyage périodique des rooms expirées (10 minutes)
    let state_for_cleanup = state.clone();
    tokio::spawn(async move {
        let ttl = Duration::from_secs(10 * 60);
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;
            let mut rooms = state_for_cleanup.write().await;
            rooms.retain(|_, room| {
                if let Some(created) = room.created_at {
                    created.elapsed() <= ttl
                } else {
                    false
                }
            });
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/signal", get(get_signal).post(post_signal))
        .layer(cors)
        .with_state(state);

    let addr = "0.0.0.0:3030";
    println!("⚡ Serveur de signalement LAN démarré sur http://{}", addr);

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("❌ Impossible de lier le serveur LAN sur {}: {}", addr, e);
            eprintln!("(Un autre serveur tourne peut-être déjà en arrière-plan)");
            return;
        }
    };
    axum::serve(listener, app).await.unwrap();
}

async fn get_signal(
    Query(params): Query<SignalParams>,
    State(state): State<SharedState>,
) -> Result<Json<RoomState>, StatusCode> {
    let rooms = state.read().await;
    match rooms.get(&params.room_id) {
        Some(room) => Ok(Json(room.clone())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn post_signal(
    Query(params): Query<SignalParams>,
    State(state): State<SharedState>,
    Json(payload): Json<SignalPayload>,
) -> Result<(), StatusCode> {
    if payload.r#type != "offer" && payload.r#type != "answer" {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut rooms = state.write().await;
    let room = rooms.entry(params.room_id.clone()).or_insert_with(|| RoomState {
        offer: None,
        answer: None,
        created_at: Some(Instant::now()),
    });

    if payload.r#type == "offer" {
        room.offer = Some(payload.data);
        room.answer = None; // On efface l'ancienne réponse
        println!("[Signal] Offre reçue pour room {}", params.room_id);
    } else if payload.r#type == "answer" {
        room.answer = Some(payload.data);
        println!("[Signal] Réponse reçue pour room {}", params.room_id);
    }

    Ok(())
}
