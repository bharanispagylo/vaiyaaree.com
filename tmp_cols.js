
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    fs.writeFileSync('cols.json', JSON.stringify(data[0], null, 2));
}
checkCols();
