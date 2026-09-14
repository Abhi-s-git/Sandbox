import { workflowInstructions } from "./workflow"
import { runtimeInstructions } from "./runtime"

/**
 * Combined system prompt instructions for the game-chat agent.
 * Each entry is a separate instruction block; they are joined in order.
 */
export const gameInstructions: string[] = [
  workflowInstructions,
  runtimeInstructions,
]
