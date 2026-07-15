async function testSubmit() {
  try {
    const reg = "TEST" + Math.floor(Math.random() * 100000);
    const crmLeadData = {
      ownerName: 'Test Submit',
      phone: '9999999999',
      email: '',
      vehicleNumber: reg,
      make: 'Hero',
      model: 'Splendor',
      year: 2020,
      address: 'Test Address',
      photos: [],
      l1Details: {
        photos: [],
        source: 'Website'
      }
    };

    console.log("Submitting to CRM...");
    const res = await fetch('http://localhost:5000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crmLeadData)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
testSubmit();
