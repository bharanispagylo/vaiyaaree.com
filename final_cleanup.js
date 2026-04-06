const fs = require('fs');

function finalCleanup() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let lines = fs.readFileSync(path, 'utf8').split('\n');

    // 1. Remove duplicate onClose at or around line 1662
    for (let i = 1650; i < 1680; i++) {
        if (lines[i] && lines[i].includes('onClose') && lines[i+1] && lines[i+1].includes('onClose')) {
            console.log('Removing duplicate onClose at line', i+2);
            lines.splice(i+1, 1);
            break;
        }
    }

    // 2. Remove stray </div> at or around line 1681 (which is now index 1680)
    for (let i = 1670; i < 1695; i++) {
        if (lines[i] && lines[i].trim() === '</div>' && lines[i-1] && lines[i-1].trim() === ')}' && lines[i+2] && lines[i+2].includes('PRODUCT IMAGE ASSIGNER')) {
             console.log('Removing stray </div> at line', i+1);
             lines.splice(i, 1);
             break;
        }
    }

    fs.writeFileSync(path, lines.join('\n'), 'utf8');
}

finalCleanup();
