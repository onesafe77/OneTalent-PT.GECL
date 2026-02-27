import fs from 'fs';

const p = 'c:/OneTalent-PT.GECL/client/src/pages/roster.tsx';
let content = fs.readFileSync(p, 'utf-8');

const t1 = `            </Select>

            {/* Shift Filter for Calendar */}`;

const r1 = `            </Select>

            {/* Search by NIK */}
            <Input
              type="text"
              placeholder="Cari NIK..."
              value={searchNIK}
              onChange={(e) => setSearchNIK(e.target.value)}
              className="w-full sm:w-32"
              data-testid="matrix-search-nik-input"
            />

            {/* Search by Name */}
            <Input
              type="text"
              placeholder="Cari Nama/Mitra..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full sm:w-40"
              data-testid="matrix-search-name-input"
            />

            {/* Shift Filter for Calendar */}`;

if (content.includes(t1)) {
    content = content.replace(t1, r1);
} else if (content.includes(t1.replace(/\r\n/g, '\n'))) {
    content = content.replace(t1.replace(/\r\n/g, '\n'), r1);
} else {
    // Manual string insertion if whitespace doesn't match perfectly
    const searchString = '{/* Shift Filter for Calendar */}';
    const idx = content.indexOf(searchString);
    if (idx !== -1) {
        const injection = `
            {/* Search by NIK */}
            <Input
              type="text"
              placeholder="Cari NIK..."
              value={searchNIK}
              onChange={(e) => setSearchNIK(e.target.value)}
              className="w-full sm:w-32"
              data-testid="matrix-search-nik-input"
            />

            {/* Search by Name */}
            <Input
              type="text"
              placeholder="Cari Nama/Mitra..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full sm:w-40"
              data-testid="matrix-search-name-input"
            />

            `;
        content = content.slice(0, idx) + injection + content.slice(idx);
    } else {
        console.log("Could not find the insertion point");
    }
}

fs.writeFileSync(p, content, 'utf-8');
console.log("Done");
