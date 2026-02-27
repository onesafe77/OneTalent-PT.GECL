import fs from 'fs';

const p = 'c:/OneTalent-PT.GECL/client/src/pages/roster.tsx';
let lines = fs.readFileSync(p, 'utf-8').split('\n');

// Arrays are 0-indexed. Lines 1238 through 1255 means index 1237 through 1254.
// Let's verify by checking if lines[1236] is `        })()}`.
if (lines[1236].includes('})()}')) {
    // Remove 18 lines starting from index 1237
    lines.splice(1237, 18);
    fs.writeFileSync(p, lines.join('\n'), 'utf-8');
    console.log("Lines deleted successfully.");
} else {
    console.log("Line 1237 does not match expectation:", lines[1236]);
}
