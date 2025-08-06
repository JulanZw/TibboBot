import path from 'path';
import fs from 'fs';;
import { commands } from "../src/commands";
import { logWithTime } from "../src/utils";

function writeCommandsTxtFile() {
  const lines = [
    'Available Commands:',
    ...commands.map(cmd => `/${cmd.name}: ${cmd.description}`)
  ];
  const txt = lines.join('\n');
  const filePath = path.join(__dirname, 'output' ,'commands.txt');
  fs.writeFileSync(filePath, txt, 'utf8');
  logWithTime(`commands.txt file written to ${filePath}`,'info');
}

writeCommandsTxtFile();