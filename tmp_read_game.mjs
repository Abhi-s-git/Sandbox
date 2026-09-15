import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const dotenv = req('dotenv');
dotenv.config({ path: 'E:/sandbox/.env.local' });

const { Daytona } = await import('@daytona/sdk');
const daytona = new Daytona();

const sandboxId = 'e71774e5-0445-4d9e-89a4-446688510c49';
const sandbox = await daytona.get(sandboxId);

// Check runtime/index.html for bare three imports
const r1 = await sandbox.process.executeCommand("grep -n 'three' /home/daytona/game/runtime/index.html");
console.log('runtime/index.html three refs:');
console.log(r1.result || '(none)');

// Check ALL runtime/*.js files for 'three' (any form)
const r2 = await sandbox.process.executeCommand("grep -rn \"from 'three'\\|from \\\"three\\\"\" /home/daytona/game/");
console.log('\nBare three imports:');
console.log(r2.result || '(none)');

// Check models.js for the JSDoc type import - it shows up as from 'three/...'
const r3 = await sandbox.process.executeCommand("grep -n 'three/' /home/daytona/game/runtime/models.js");
console.log('\nmodels.js three/ references:');
console.log(r3.result || '(none)');


