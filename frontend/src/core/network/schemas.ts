import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schémas de validation des messages P2P (WebRTC DataChannel)
// ---------------------------------------------------------------------------

/** Longueur max d'une URL ou d'un hash de fichier transporté dans un message P2P. */
const MAX_URL_LEN = 2048;
/** Nombre max de tokens dans un SYNC_STATE. */
const MAX_SYNC_TOKENS = 500;

const ChatMessageSchema = z.object({
  type: z.literal('CHAT'),
  payload: z.object({
    senderId: z.string().min(1).max(64),
    content: z.string().min(1).max(2000),
    timestamp: z.number().int().nonnegative(),
  }),
});

// Format utilisé par les modules (chat, flower, dice-roller, etc.)
const ChatMessageModuleSchema = z.object({
  type: z.literal('CHAT_MESSAGE'),
  payload: z.object({
    id: z.string().max(64).optional(),
    sender: z.string().max(64).optional(),
    author: z.string().max(64).optional(),
    text: z.string().max(2000).optional(),
    content: z.string().max(2000).optional(),
    timestamp: z.number().finite().optional(),
    type: z.string().max(32).optional(),
  }),
});

const MoveTokenSchema = z.object({
  type: z.literal('MOVE_TOKEN'),
  payload: z.object({
    tokenId: z.string().min(1).max(64),
    x: z.number().finite(),
    y: z.number().finite(),
  }),
});

const TransformTokenSchema = z.object({
  type: z.literal('TRANSFORM_TOKEN'),
  payload: z.object({
    tokenId: z.string().min(1).max(64),
    x: z.number().finite(),
    y: z.number().finite(),
    scaleX: z.number().finite(),
    scaleY: z.number().finite(),
    rotation: z.number().finite(),
  }),
});

const RollDiceSchema = z.object({
  type: z.literal('ROLL_DICE'),
  payload: z.object({
    rollerId: z.string().min(1).max(64),
    formula: z.string().min(1).max(100),
    results: z.array(z.number().int()).min(1).max(100),
    total: z.number().int(),
  }),
});

const SpawnTokenSchema = z.object({
  type: z.literal('SPAWN_TOKEN'),
  payload: z.object({
    id: z.string().min(1).max(128),
    name: z.string().max(128),
    x: z.number().finite(),
    y: z.number().finite(),
    color: z.string().max(32),
    owner: z.string().max(64).optional(),
    scaleX: z.number().finite().optional(),
    scaleY: z.number().finite().optional(),
    rotation: z.number().finite().optional(),
    avatarUrl: z.string().max(MAX_URL_LEN).optional(),
  }).passthrough(),
});

const RemoveTokenSchema = z.object({
  type: z.literal('REMOVE_TOKEN'),
  payload: z.object({
    tokenId: z.string().min(1).max(64),
  }),
});

const PlayerJoinSchema = z.object({
  type: z.literal('PLAYER_JOIN'),
  payload: z.object({
    username: z.string().min(1).max(64),
  }),
});


const LobbyStateSchema = z.object({
  type: z.literal('LOBBY_STATE'),
  payload: z.object({
    players: z.array(z.string().max(80)).max(64),
    isGameStarted: z.boolean(),
    isRoomOpen: z.boolean(),
  }),
});

const RequestStateSchema = z.object({
  type: z.literal('REQUEST_STATE'),
  payload: z.object({
    mapUrl: z.string().max(MAX_URL_LEN).optional(),
    requester: z.string().max(80).optional(),
  }),
});

const SyncStateSchema = z.object({
  type: z.literal('SYNC_STATE'),
  payload: z.object({
    targetUsername: z.string().max(80).optional(),
    mapUrl: z.string().max(MAX_URL_LEN).nullable().optional(),
    tokens: z.array(z.object({
      id: z.string().max(128),
      name: z.string().max(128),
      x: z.number().finite(),
      y: z.number().finite(),
      color: z.string().max(32),
      owner: z.string().max(64).nullable().optional(),
      scaleX: z.number().finite().nullable().optional(),
      scaleY: z.number().finite().nullable().optional(),
      rotation: z.number().finite().nullable().optional(),
      avatarUrl: z.string().max(MAX_URL_LEN).nullable().optional(),
    })).max(MAX_SYNC_TOKENS),
  }),
});

const StartGameSchema = z.object({
  type: z.literal('START_GAME'),
  payload: z.object({}),
});

/**
 * Schéma Zod validant tout message P2P entrant.
 * Discriminated Union sur le champ `type`.
 */
const PingSchema = z.object({
  type: z.literal('PING'),
});

const ModEventSchema = z.object({
  type: z.literal('MOD_EVENT'),
  _sourceMod: z.string().max(64),
  modEventType: z.string().max(64),
  payload: z.any(),
});

const SetMapSchema = z.object({
  type: z.literal('SET_MAP'),
  payload: z.object({
    url: z.string().max(MAX_URL_LEN),
  }),
});

const RequestFileSchema = z.object({
  type: z.literal('REQUEST_FILE'),
  payload: z.object({
    hash: z.string().min(1).max(128),
  }),
});

const MovePlayerMapSchema = z.object({
  type: z.literal('MOVE_PLAYER_MAP'),
  payload: z.object({
    username: z.string().max(80),
    url: z.string().max(MAX_URL_LEN),
  }),
});

export const P2PMessageSchema = z.discriminatedUnion('type', [
  ChatMessageSchema,
  ChatMessageModuleSchema,
  MoveTokenSchema,
  TransformTokenSchema,
  SpawnTokenSchema,
  RemoveTokenSchema,
  RollDiceSchema,
  PlayerJoinSchema,
  LobbyStateSchema,
  RequestStateSchema,
  SyncStateSchema,
  StartGameSchema,
  PingSchema,
  ModEventSchema,
  SetMapSchema,
  RequestFileSchema,
  MovePlayerMapSchema,
]);

// ── Types inférés ─────────────────────────────────────────────────────────

export type P2PMessage = z.infer<typeof P2PMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type MoveTokenMessage = z.infer<typeof MoveTokenSchema>;
export type RollDiceMessage = z.infer<typeof RollDiceSchema>;
export type PlayerJoinMessage = z.infer<typeof PlayerJoinSchema>;
export type LobbyStateMessage = z.infer<typeof LobbyStateSchema>;
export type RequestStateMessage = z.infer<typeof RequestStateSchema>;
export type SyncStateMessage = z.infer<typeof SyncStateSchema>;
export type StartGameMessage = z.infer<typeof StartGameSchema>;
export type ModEventMessage = z.infer<typeof ModEventSchema>;
export type TransformTokenMessage = z.infer<typeof TransformTokenSchema>;
export type SpawnTokenMessage = z.infer<typeof SpawnTokenSchema>;
export type RemoveTokenMessage = z.infer<typeof RemoveTokenSchema>;
export type SetMapMessage = z.infer<typeof SetMapSchema>;
export type RequestFileMessage = z.infer<typeof RequestFileSchema>;
export type MovePlayerMapMessage = z.infer<typeof MovePlayerMapSchema>;
export type ChatMessageModuleMessage = z.infer<typeof ChatMessageModuleSchema>;

export { ChatMessageSchema, ChatMessageModuleSchema, MoveTokenSchema, RollDiceSchema, PlayerJoinSchema, LobbyStateSchema, RequestStateSchema, SyncStateSchema, StartGameSchema, ModEventSchema, TransformTokenSchema, SpawnTokenSchema, RemoveTokenSchema, SetMapSchema, RequestFileSchema, MovePlayerMapSchema };
