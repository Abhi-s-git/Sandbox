import { defineConfig } from "@trigger.dev/sdk";
import { additionalFiles } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_atyhqumbfljgipzhrsvw",
  runtime: "node-24",
  logLevel: "log",
  // Per-run active-CPU cap in seconds. Suspended time (the chat agent waiting
  // for the next user message) does NOT count against this — only actual
  // compute time does. chat.agent runs are expected to suspend between turns,
  // so this cap only bounds the time spent inside a single turn's streamText
  // call, not the entire conversation lifetime.
  maxDuration: 3600,
  // Set to false so process.cwd() points to the build/project root at
  // runtime, which is required for additionalFiles paths to resolve correctly.
  legacyDevProcessCwdBehaviour: false,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      additionalFiles({ files: ["./lib/games/runtime/**"] }),
    ],
  },
});
