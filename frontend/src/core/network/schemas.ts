import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schémas de validation des messages P2P (WebRTC DataChannel)
// ---------------------------------------------------------------------------

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
    id: z.string().optional(),
    sender: z.string().optional(),
    author: z.string().optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    timestamp: z.number().optional(),
    type: z.string().optional(),
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
    color: z.string(),
    owner: z.string().optional(),
    scaleX: z.number().finite().optional(),
    scaleY: z.number().finite().optional(),
    rotation: z.number().finite().optional(),
    avatarUrl: z.string().optional(),
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
    players: z.array(z.string()),
    isGameStarted: z.boolean(),
    isRoomOpen: z.boolean(),
  }),
});

const RequestStateSchema = z.object({
  type: z.literal('REQUEST_STATE'),
  payload: z.object({}),
});

const SyncStateSchema = z.object({
  type: z.literal('SYNC_STATE'),
  payload: z.object({
    mapUrl: z.string().nullable().optional(),
    tokens: z.array(z.object({
      id: z.string(),
      name: z.string(),
      x: z.number().finite(),
      y: z.number().finite(),
      color: z.string(),
      owner: z.string().nullable().optional(),
      scaleX: z.number().finite().nullable().optional(),
      scaleY: z.number().finite().nullable().optional(),
      rotation: z.number().finite().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
    })),
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
  _sourceMod: z.string(),
  modEventType: z.string(),
  payload: z.any(),
});

const SetMapSchema = z.object({
  type: z.literal('SET_MAP'),
  payload: z.object({
    url: z.string(),
  }),
});

const RequestFileSchema = z.object({
  type: z.literal('REQUEST_FILE'),
  payload: z.object({
    hash: z.string().min(1),
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
export type ChatMessageModuleMessage = z.infer<typeof ChatMessageModuleSchema>;

export { ChatMessageSchema, ChatMessageModuleSchema, MoveTokenSchema, RollDiceSchema, PlayerJoinSchema, LobbyStateSchema, RequestStateSchema, SyncStateSchema, StartGameSchema, ModEventSchema, TransformTokenSchema, SpawnTokenSchema, RemoveTokenSchema, SetMapSchema, RequestFileSchema };
