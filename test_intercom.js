const http = require('http');

http.get('http://localhost:5001/api/sidak-intercom/sessions', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const sessions = JSON.parse(data);
    if (!sessions || sessions.length === 0) { console.log('No sessions found'); return; }
    const sessionId = sessions[0].id;
    console.log('Session ID:', sessionId);
    
    // Test POST
    const payload = JSON.stringify({
      nama: "Test",
      nik: "123",
      nomorLambung: "DT001",
      waktuTemuan: "03:00",
      waktuIntervensi: "03:02",
      q1_slaRespons: true,
      q2_identifikasi: false,
      q3_kualitasKomunikasi: false,
      q4_instruksiK3: false,
      q5_verifikasiTindakan: false,
      waktuResponsMenit: "2",
      keterangan: "Test",
      sessionId: sessionId,
      ordinal: 1
    });

    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api/sidak-intercom/sessions/${sessionId}/records`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = http.request(options, (resPost) => {
      console.log('STATUS:', resPost.statusCode);
      let postData = '';
      resPost.on('data', (c) => postData += c);
      resPost.on('end', () => console.log('RESPONSE:', postData));
    });

    req.write(payload);
    req.end();
  });
});
