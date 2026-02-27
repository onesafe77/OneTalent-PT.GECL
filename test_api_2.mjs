async function test() {
    const res = await fetch("http://localhost:5000/api/roster?date=2026-02-28");
    const data = await res.json();
    const sudiro = data.filter(r => r.employeeId === "C-028937");
    console.log("Sudiro records in /api/roster?date=2026-02-28:", sudiro.length);
}
test();
