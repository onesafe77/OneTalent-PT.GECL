
import fs from 'fs';

const content = fs.readFileSync('c:/OneTalent-PT.GECL/server/storage.ts', 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('class DrizzleStorage')) console.log(`DrizzleStorage: ${index + 1}`);
    if (line.includes('class MemStorage')) console.log(`MemStorage: ${index + 1}`);
    if (line.includes('createSidakP3k')) console.log(`createSidakP3k: ${index + 1}`);
    if (line.includes('interface IStorage')) console.log(`IStorage: ${index + 1}`);
});
