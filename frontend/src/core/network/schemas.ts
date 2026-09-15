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

const MoveTokenSchema = z.object({
  type: z.literal('MOVE_TOKEN'),
  payload: z.object({
    tokenId: z.string().min(1).max(64),
    x: z.number().finite(),
    y: z.number().finite(),
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

/**
 * Schéma Zod validant tout message P2P entrant.
 * Discriminated Union sur le champ `type`.
 */
export const P2PMessageSchema = z.discriminatedUnion('type', [
  ChatMessageSchema,
  MoveTokenSchema,
  RollDiceSchema,
]);

// ── Types inférés ─────────────────────────────────────────────────────────

export type P2PMessage = z.infer<typeof P2PMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type MoveTokenMessage = z.infer<typeof MoveTokenSchema>;
export type RollDiceMessage = z.infer<typeof RollDiceSchema>;

export { ChatMessageSchema, MoveTokenSchema, RollDiceSchema };
