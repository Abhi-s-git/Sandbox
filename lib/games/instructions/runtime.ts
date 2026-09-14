export const runtimeInstructions = `
## Runtime Environment

The game runs inside a Daytona sandbox — an isolated Linux container. Here is
what you need to know about the environment when reading and writing files.

### Game directory
- All game files live under \`/home/daytona/game/\`.
- The entry point the browser loads is \`/home/daytona/game/index.html\`.
- You may create additional files (images, scripts, JSON data) under this
  directory, but keep the structure flat unless there is a clear reason to
  nest further.

### Static file server
- A static file server (\`npx serve\`) runs on port 3000 inside the sandbox,
  serving the \`/home/daytona/game/\` directory.
- The server is started automatically before the preview is shown; you do not
  need to start or restart it.
- File changes are picked up immediately on the next browser refresh — there
  is no hot-reload.

### Writing files
- Use the available sandbox file-writing tools to persist code to disk.
- Always write the full file content, not a patch or partial update.
- File paths must be **relative to the game directory**: \`index.html\`, not \`/home/daytona/game/index.html\`.
  Pass \`"index.html"\` to write the entry point, \`"assets/player.js"\` for a subdirectory file, etc.

### Execution constraints
- The sandbox has internet access for fetching CDN assets (e.g. a JS game
  library from a CDN URL). You may link to external CDN scripts in
  \`<script src="...">\` tags.
- Do not attempt to install npm packages, run build tools, or execute Node.js
  code as part of the game — the game runs in the browser, not in Node.
- Do not write files outside \`/home/daytona/game/\`.
`.trim()
