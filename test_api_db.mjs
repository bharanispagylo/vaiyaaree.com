async function testDb() {
    try {
        console.log('Sending query to http://localhost:3000/api/db ...');
        const res = await fetch('http://localhost:3000/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'shipping_zones',
                operation: 'select',
                columns: '*'
            })
        });
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('shipping_zones result:', data);

        const res2 = await fetch('http://localhost:3000/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'shipping_zone_states',
                operation: 'select',
                columns: '*'
            })
        });
        console.log('Status 2:', res2.status);
        const data2 = await res2.json();
        console.log('shipping_zone_states result:', data2);
    } catch (e) {
        console.error('Error:', e);
    }
}
testDb();
