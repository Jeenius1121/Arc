// Prints the bullet points of the newest section of CHANGELOG.md, for the
// update prompt (stored in version.json by the APK workflow).
import { readFileSync } from 'node:fs';

const text = readFileSync('CHANGELOG.md', 'utf8');
const section = text.split(/^## /m)[1] ?? '';
const notes = section
  .split('\n')
  .slice(1)
  .filter((l) => l.startsWith('- '))
  .map((l) => l.slice(2).trim());
console.log(JSON.stringify(notes));
