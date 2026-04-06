const fs = require('fs');

function patchProductsPage() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let lines = fs.readFileSync(path, 'utf8').split('\n');

    // Remove lines 1661 to 1669 (mangled catch/finally)
    // Adjust indices since array is 0-indexed and my view is 1-indexed.
    // Line 1661 is index 1660.
    
    // Check if line 1661 contains the expected error
    if (lines[1660].includes('}}} catch (err) {')) {
        console.log('Found error at line 1661. Patching...');
        lines.splice(1660, 10); // Remove 1661 to 1670
        // Insert clean closure
        lines.splice(1660, 0, '                        }}', '                        onClose={() => setShowMediaPicker(false)}');
    } else {
        console.log('Line 1661 does not match expected pattern:', lines[1660]);
    }

    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Patched ProductsPage.js');
}

patchProductsPage();
