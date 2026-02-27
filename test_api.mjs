async function test() {
    const payload = {
        employeeId: "C-028937",
        month: "2026-02",
        rosters: [
            {
                employeeId: "C-028937",
                date: "2026-02-28",
                shift: "SHIFT 1",
                startTime: "06:00",
                endTime: "16:00",
                fitToWork: "Fit To Work",
                status: "scheduled"
            }
        ]
    };

    const res = await fetch("http://localhost:5000/api/roster/update-employee-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);

    // Then fetch the monthly roster
    const res2 = await fetch("http://localhost:5000/api/roster/monthly?year=2026&month=2");
    const data2 = await res2.json();
    const sudiro = data2.filter(r => r.employeeId === "C-028937");
    console.log("Sudiro records in monthly:", sudiro.length);
}

test();
