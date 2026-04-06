const fs = require('fs');

function findUnbalanced() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    const content = fs.readFileSync(path, 'utf8');
    
    let stack = [];
    let lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            let char = line[j];
            if (char === '{' || char === '(' || char === '[') {
                stack.push({ char, line: i + 1, col: j + 1 });
            } else if (char === '}' || char === ')' || char === ']') {
                if (stack.length === 0) {
                    console.log(`Extra closing ${char} at line ${i + 1}, col ${j + 1}`);
                } else {
                    let last = stack.pop();
                    if ((char === '}' && last.char !== '{') || 
                        (char === ')' && last.char !== '(') || 
                        (char === ']' && last.char !== '[')) {
                        console.log(`Mismatch: ${last.char} at L${last.line} closed by ${char} at L${i + 1}`);
                    }
                }
            }
        }
    }
    
    while (stack.length > 0) {
        let last = stack.pop();
        console.log(`Unclosed ${last.char} at line ${last.line}, column ${last.col}`);
    }
}

findUnbalanced();
