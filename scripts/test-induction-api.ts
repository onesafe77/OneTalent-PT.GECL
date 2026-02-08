import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

async function testInductionAttendanceAPI() {
  console.log('🧪 Testing Induction Attendance API...\n');

  // Test 1: Submit attendance
  console.log('📝 Test 1: Submitting induction attendance...');
  try {
    const attendanceData = {
      nik: 'TEST001',
      namaKaryawan: 'John Doe Test',
      jabatan: 'Operator',
      nomorTelepon: '08123456789',
      pemateri: 'Budi Santoso',
      tanggalRefreshInduksi: '2026-02-07',
      tandaTangan: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    const submitResponse = await axios.post(
      `${API_BASE_URL}/api/induction-attendance/submit`,
      attendanceData
    );

    console.log('✅ Submit successful!');
    console.log('Response:', submitResponse.data);
    console.log('');
  } catch (error: any) {
    console.error('❌ Submit failed:', error.response?.data || error.message);
    console.log('');
  }

  // Test 2: Get all attendance records
  console.log('📋 Test 2: Fetching all attendance records...');
  try {
    const getAllResponse = await axios.get(
      `${API_BASE_URL}/api/induction-attendance/all`
    );

    console.log('✅ Fetch successful!');
    console.log(`Found ${getAllResponse.data.length} records`);
    if (getAllResponse.data.length > 0) {
      console.log('Latest record:', getAllResponse.data[0]);
    }
    console.log('');
  } catch (error: any) {
    console.error('❌ Fetch failed:', error.response?.data || error.message);
    console.log('');
  }

  // Test 3: Search with filters
  console.log('🔍 Test 3: Testing search and filters...');
  try {
    const searchResponse = await axios.get(
      `${API_BASE_URL}/api/induction-attendance/all?year=2026&search=Test`
    );

    console.log('✅ Search successful!');
    console.log(`Found ${searchResponse.data.length} matching records`);
    console.log('');
  } catch (error: any) {
    console.error('❌ Search failed:', error.response?.data || error.message);
    console.log('');
  }

  console.log('✨ Test completed!');
}

testInductionAttendanceAPI();
