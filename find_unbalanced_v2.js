const fs = require('fs');

function findUnbalanced() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let content = fs.readFileSync(path, 'utf8');
    
    // Simple state-based parser to skip strings and comments
    let stack = [];
    let inString = null;
    let inComment = null;
    let inJsxComment = false;
    
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            let char = line[j];
            let next = line[j+1];
            
            if (inComment === 'single') break;
            if (inComment === 'multi') {
                if (char === '*' && next === '/') {
                    inComment = null;
                    j++;
                }
                continue;
            }
            if (inJsxComment) {
                if (char === '*' && next === '/' && line[j+2] === '}') {
                    inJsxComment = false;
                    j += 2;
                }
                continue;
            }
            if (inString) {
                if (char === inString && line[j-1] !== '\\') inString = null;
                continue;
            }
            
            if (char === '/' && next === '/') {
                inComment = 'single';
                j++; continue;
            }
            if (char === '/' && next === '*') {
                inComment = 'multi';
                j++; continue;
            }
            if (char === '{' && next === '/' && line[j+2] === '*') {
                inJsxComment = true;
                j += 2; continue;
            }
            if (char === '"' || char === "'" || char === '`') {
                inString = char;
                continue;
            }
            
            // Check braces/parens
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
        if (inComment === 'single') inComment = null;
    }
    
    while (stack.length > 0) {
        let last = stack.pop();
        console.log(`Unclosed ${last.char} at line ${last.line}, column ${last.col}`);
    }
}

findUnbalanced();
