const fs = require('fs');

function findUnbalanced() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let content = fs.readFileSync(path, 'utf8');
    
    let stack = [];
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            let char = line[j];
            
            // Skip strings and comments (simplified)
            if (char === '"' || char === "'" || char === '`') {
                let quote = char;
                j++;
                while (j < line.length && (line[j] !== quote || line[j-1] === '\\')) j++;
                continue;
            }
            if (char === '/' && line[j+1] === '/') break;
            
            if (char === '{' || char === '(' || char === '[') {
                stack.push({ char, line: i + 1 });
            } else if (char === '}' || char === ')' || char === ']') {
                if (stack.length > 0) {
                    let last = stack.pop();
                    if ((char === '}' && last.char !== '{') || 
                        (char === ')' && last.char !== '(') || 
                        (char === ']' && last.char !== '[')) {
                        console.log(`Mismatch: ${last.char} L${last.line} closed by ${char} L${i+1}`);
                    }
                }
            }
        }
    }
    
    while (stack.length > 0) {
        let s = stack.pop();
        console.log(`Unclosed ${s.char} at line ${s.line}`);
    }
}

findUnbalanced();
