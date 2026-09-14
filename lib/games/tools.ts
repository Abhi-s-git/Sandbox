import { tool } from "ai"
import path from "path"
import { z } from "zod"
import { logger } from "@trigger.dev/sdk"

import { getGameSandbox } from "@/lib/daytona/utils"

/** Absolute path to the game directory inside the Daytona sandbox. */
const GAME_DIR = "/home/daytona/game"

/**
 * Resolves and validates a caller-supplied path against GAME_DIR.
 *
 * Accepts both relative paths ("index.html", "assets/player.js") and
 * absolute paths that already start with GAME_DIR ("/home/daytona/game/index.html").
 * Throws on path traversal attempts or mis-formed absolute paths.
 */
function resolveGamePath(filePath: string): string {
  let resolved: string

  if (filePath.startsWith(GAME_DIR + "/") || filePath === GAME_DIR) {
    // Caller passed a fully-qualified path that is already inside GAME_DIR —
    // normalize it in place without re-joining (avoids double-nesting bug).
    resolved = path.posix.normalize(filePath)
  } else {
    // Treat as relative to GAME_DIR, stripping any spurious leading slash.
    const relative = filePath.replace(/^\/+/, "")
    resolved = path.posix.normalize(path.posix.join(GAME_DIR, relative))
  }

  if (!resolved.startsWith(GAME_DIR + "/") && resolved !== GAME_DIR) {
    throw new Error(
      `Path "${filePath}" resolves outside the game directory (${GAME_DIR})`,
    )
  }

  return resolved
}

/**
 * Escapes a string for safe embedding inside a POSIX single-quoted shell
 * argument: single quotes are ended, escaped, and re-opened.
 */
function shellEscape(value: string): string {
  return value.replace(/'/g, "'\\''")
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

/**
 * Write (or overwrite) a file in the sandbox game directory.
 * The parent directory is created automatically if it does not exist.
 */
export const write_file = (chatId: string) =>
  tool({
    description:
      "Write content to a file inside the game directory, creating or overwriting it. " +
      "The path must be relative to the game directory (e.g. 'index.html' or 'assets/player.js'). " +
      "Parent directories are created automatically.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("File path relative to the game directory, e.g. 'index.html'"),
      content: z.string().describe("Full content to write to the file"),
    }),
    execute: async ({ path: filePath, content }) => {
      let absPath: string
      try {
        absPath = resolveGamePath(filePath)
      } catch (err) {
        logger.error("write_file: path resolution failed", {
          chatId,
          filePath,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }

      const dir = path.posix.dirname(absPath)
      const escaped = shellEscape(content)

      logger.log("write_file: executing", { chatId, filePath, absPath })

      const { sandbox } = await getGameSandbox(chatId)
      const result = await sandbox.process.executeCommand(
        `mkdir -p '${dir}' && printf '%s' '${escaped}' > '${absPath}'`,
      )

      if (result.exitCode !== 0) {
        logger.error("write_file: command failed", {
          chatId,
          absPath,
          exitCode: result.exitCode,
          output: result.result,
        })
        throw new Error(`write_file failed (exit ${result.exitCode}): ${result.result}`)
      }

      logger.log("write_file: success", { chatId, absPath })
      return { success: true, path: absPath }
    },
  })

/**
 * Replace an exact substring inside an existing file.
 * Fails if the old string is not found (avoids silent no-ops).
 */
export const replace_text = (chatId: string) =>
  tool({
    description:
      "Replace an exact string inside an existing file in the game directory. " +
      "The file must already exist. The operation fails if `old` is not found, " +
      "so always verify you are using the exact current text.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("File path relative to the game directory"),
      old: z.string().describe("Exact text to find and replace"),
      new: z.string().describe("Replacement text"),
    }),
    execute: async ({ path: filePath, old: oldText, new: newText }) => {
      let absPath: string
      try {
        absPath = resolveGamePath(filePath)
      } catch (err) {
        logger.error("replace_text: path resolution failed", {
          chatId,
          filePath,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }

      logger.log("replace_text: executing", { chatId, filePath, absPath })

      const { sandbox } = await getGameSandbox(chatId)

      // Read the current content
      const readResult = await sandbox.process.executeCommand(
        `cat '${absPath}'`,
      )
      if (readResult.exitCode !== 0) {
        logger.error("replace_text: read failed", {
          chatId,
          absPath,
          exitCode: readResult.exitCode,
          output: readResult.result,
        })
        throw new Error(
          `replace_text: could not read file (exit ${readResult.exitCode}): ${readResult.result}`,
        )
      }

      const current = readResult.result
      if (!current.includes(oldText)) {
        logger.error("replace_text: old string not found", {
          chatId,
          absPath,
          oldTextSnippet: oldText.slice(0, 120),
        })
        throw new Error(
          `replace_text: old string not found in "${filePath}". ` +
            `Make sure you are using the exact current text including whitespace.`,
        )
      }

      const updated = current.replace(oldText, newText)
      const escaped = shellEscape(updated)

      const writeResult = await sandbox.process.executeCommand(
        `printf '%s' '${escaped}' > '${absPath}'`,
      )
      if (writeResult.exitCode !== 0) {
        logger.error("replace_text: write failed", {
          chatId,
          absPath,
          exitCode: writeResult.exitCode,
          output: writeResult.result,
        })
        throw new Error(
          `replace_text: write failed (exit ${writeResult.exitCode}): ${writeResult.result}`,
        )
      }

      logger.log("replace_text: success", { chatId, absPath })
      return { success: true, path: absPath }
    },
  })

/**
 * Read the full content of a file from the sandbox game directory.
 */
export const read_file = (chatId: string) =>
  tool({
    description:
      "Read the full content of a file from the game directory. " +
      "Use this to inspect the current state of a file before editing it.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("File path relative to the game directory, e.g. 'index.html'"),
    }),
    execute: async ({ path: filePath }) => {
      let absPath: string
      try {
        absPath = resolveGamePath(filePath)
      } catch (err) {
        logger.error("read_file: path resolution failed", {
          chatId,
          filePath,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }

      logger.log("read_file: executing", { chatId, filePath, absPath })

      const { sandbox } = await getGameSandbox(chatId)
      const result = await sandbox.process.executeCommand(`cat '${absPath}'`)

      if (result.exitCode !== 0) {
        logger.error("read_file: command failed", {
          chatId,
          absPath,
          exitCode: result.exitCode,
          output: result.result,
        })
        throw new Error(`read_file failed (exit ${result.exitCode}): ${result.result}`)
      }

      logger.log("read_file: success", { chatId, absPath })
      return { content: result.result, path: absPath }
    },
  })

/**
 * List files and directories inside the sandbox game directory.
 * Defaults to the root of the game directory.
 */
export const list_files = (chatId: string) =>
  tool({
    description:
      "List files and directories inside the game directory. " +
      "Pass a subdirectory path to list its contents, or omit to list the root.",
    inputSchema: z.object({
      path: z
        .string()
        .optional()
        .describe(
          "Subdirectory path relative to the game directory. Omit to list the root.",
        ),
    }),
    execute: async ({ path: filePath }) => {
      let absPath: string
      if (filePath) {
        try {
          absPath = resolveGamePath(filePath)
        } catch (err) {
          logger.error("list_files: path resolution failed", {
            chatId,
            filePath,
            error: err instanceof Error ? err.message : String(err),
          })
          throw err
        }
      } else {
        absPath = GAME_DIR
      }

      logger.log("list_files: executing", { chatId, absPath })

      const { sandbox } = await getGameSandbox(chatId)
      const result = await sandbox.process.executeCommand(
        `ls -1A '${absPath}' 2>&1`,
      )

      if (result.exitCode !== 0) {
        logger.error("list_files: command failed", {
          chatId,
          absPath,
          exitCode: result.exitCode,
          output: result.result,
        })
        throw new Error(`list_files failed (exit ${result.exitCode}): ${result.result}`)
      }

      const entries = result.result
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean)

      logger.log("list_files: success", { chatId, absPath, count: entries.length })
      return { entries, path: absPath }
    },
  })

/**
 * Delete a file from the sandbox game directory.
 * Directories are not removed; only regular files.
 */
export const delete_file = (chatId: string) =>
  tool({
    description:
      "Delete a file from the game directory. " +
      "Only files can be deleted, not directories. " +
      "Use with caution — this operation cannot be undone.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("File path relative to the game directory"),
    }),
    execute: async ({ path: filePath }) => {
      let absPath: string
      try {
        absPath = resolveGamePath(filePath)
      } catch (err) {
        logger.error("delete_file: path resolution failed", {
          chatId,
          filePath,
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }

      logger.log("delete_file: executing", { chatId, filePath, absPath })

      const { sandbox } = await getGameSandbox(chatId)
      const result = await sandbox.process.executeCommand(`rm -f '${absPath}'`)

      if (result.exitCode !== 0) {
        logger.error("delete_file: command failed", {
          chatId,
          absPath,
          exitCode: result.exitCode,
          output: result.result,
        })
        throw new Error(`delete_file failed (exit ${result.exitCode}): ${result.result}`)
      }

      logger.log("delete_file: success", { chatId, absPath })
      return { success: true, path: absPath }
    },
  })

/**
 * Builds the full game tool set for a given chat session.
 * Each tool captures `chatId` in its closure to resolve the correct sandbox.
 */
export function buildGameTools(chatId: string) {
  return {
    write_file: write_file(chatId),
    replace_text: replace_text(chatId),
    read_file: read_file(chatId),
    list_files: list_files(chatId),
    delete_file: delete_file(chatId),
  }
}

export type GameTools = ReturnType<typeof buildGameTools>
