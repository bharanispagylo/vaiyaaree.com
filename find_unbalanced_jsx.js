const fs = require('fs');

function findUnbalancedJSX() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    const content = fs.readFileSync(path, 'utf8');
    
    let tagStack = [];
    let braceStack = [];
    let parenStack = [];
    
    let inComment = false;
    let inString = false;
    let inTag = false;
    
    // Very simple regex-based walk for tags
    // Matches: <div </div <> </> { } ( )
    const regex = /<(\w+)|<\/(\w+)|<(\s*>)|<\/(\s*>)|(\{\s*\/\*)|(\*\/\s*\})|\{|\}|\(|\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        let [full, openTag, closeTag, openFrag, closeFrag, openJsxCom, closeJsxCom] = match;
        
        if (openJsxCom) { inComment = true; continue; }
        if (closeJsxCom) { inComment = false; continue; }
        if (inComment) continue;
        
        if (full === '{') braceStack.push({ line: getLine(content, match.index) });
        else if (full === '}') braceStack.pop();
        else if (full === '(') parenStack.push({ line: getLine(content, match.index) });
        else if (full === ')') parenStack.pop();
        else if (openTag) tagStack.push({ tag: openTag, line: getLine(content, match.index) });
        else if (closeTag) {
            let last = tagStack.pop();
            if (last && last.tag !== closeTag) {
                console.log(`Mismatch: ${last.tag} L${last.line} vs ${closeTag} L${getLine(content, match.index)}`);
            }
        }
        else if (openFrag) tagStack.push({ tag: 'fragment', line: getLine(content, match.index) });
        else if (closeFrag) tagStack.pop();
    }
    
    while (tagStack.length) {
        let t = tagStack.pop();
        console.log(`Unclosed ${t.tag} at line ${t.line}`);
    }
    while (braceStack.length) {
        let b = braceStack.pop();
        console.log(`Unclosed brace at line ${b.line}`);
    }
    while (parenStack.length) {
        let p = parenStack.pop();
        console.log(`Unclosed paren at line ${p.line}`);
    }
}

function getLine(text, index) {
    return text.substring(0, index).split('\n').length;
}

findUnbalancedJSX();
