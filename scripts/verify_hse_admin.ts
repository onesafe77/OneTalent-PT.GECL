
import { getRoleFromPosition, Role } from "../shared/rbac";

console.log("Starting RBAC Verification...");

const testCases = [
    { position: "Staff", department: "HSE", expected: Role.ADMIN, description: "HSE Staff should be ADMIN" },
    { position: "Staff", department: "HSE Department", expected: Role.ADMIN, description: "HSE Department Staff (Actual DB Value) should be ADMIN" },
    { position: "Staff", department: "Departemen HSE", expected: Role.ADMIN, description: "Departemen HSE (Variation) should be ADMIN" },
    { position: "Manager", department: "HSE Divisi", expected: Role.ADMIN, description: "HSE Divisi should be ADMIN" },
    { position: "hse group leader", department: "Operation", expected: Role.SUPERVISOR, description: "HSE Group Leader (Pos) should be SUPERVISOR" },
    { position: "HRGA Group Leader", department: "HR", expected: Role.ADMIN, description: "HRGA Group Leader should be ADMIN (by position)" },
    { position: "Operator", department: "Mining", expected: Role.BASIC, description: "Operator in Mining should be BASIC" },
    { position: null, department: "HSE", expected: Role.ADMIN, description: "Null position in HSE should be ADMIN" },
];

let failed = 0;

testCases.forEach((test, index) => {
    const result = getRoleFromPosition(test.position, test.department);
    const status = result === test.expected ? "PASS" : "FAIL";
    if (status === "FAIL") failed++;

    console.log(`[${status}] ${test.description}`);
    console.log(`   Input: Position='${test.position}', Dept='${test.department}'`);
    console.log(`   Result: ${result}, Expected: ${test.expected}`);
    console.log("---------------------------------------------------");
});

if (failed === 0) {
    console.log("✅ All tests passed!");
    process.exit(0);
} else {
    console.error(`❌ ${failed} tests failed.`);
    process.exit(1);
}
