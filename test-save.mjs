import fetch from 'node-fetch';

async function testSave() {
    try {
        const payload = {
            employeeId: "C-028937",
            month: "2026-02",
            rosters: [
                {
                    employeeId: "C-028937",
                    date: "2026-02-01",
                    shift: "SHIFT 1",
                    startTime: "06:00",
                    endTime: "16:00",
                    jamTidur: "",
                    fitToWork: "Fit To Work",
                    hariKerja: "27",
                    status: "scheduled"
                }
            ]
        };

        const res = await fetch('http://localhost:5000/api/roster/update-employee-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (err) {
        console.error(err);
    }
}

testSave();
