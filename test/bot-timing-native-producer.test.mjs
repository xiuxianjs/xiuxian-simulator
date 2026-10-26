import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('installed timing producers write actual Alemon logs with full normalization/analyzer parity',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bot-timing-native-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const env={...process.env,LOG_PATH:path.join(dir,'logs'),LOG_FILE:'true',LOG_LEVEL:'info',LOGGER_TIME:'true',LOGGER_LEVEL:'true',BOT_TIMING_TEST_OUTPUT:dir};delete env.NODE_TEST_CONTEXT;delete env.BROWSER_ENV;
 execFileSync(process.execPath,['--import','tsx','--test','--test-force-exit',fileURLToPath(new URL('./fixtures/bot-timing-native-producer-harness.ts',import.meta.url))],{cwd:fileURLToPath(new URL('..',import.meta.url)),env,stdio:'pipe'});
});
