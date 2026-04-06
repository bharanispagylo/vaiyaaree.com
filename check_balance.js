const fs = require('fs');

function checkBalance() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    const content = fs.readFileSync(path, 'utf8');

    let divCount = (content.match(/<div/g) || []).length;
    let divCloseCount = (content.match(/<\/div/g) || []).length;
    let fragmentCount = (content.match(/<>/g) || []).length;
    let fragmentCloseCount = (content.match(/<\/>/g) || []).length;
    let braceCount = (content.match(/\{/g) || []).length;
    let braceCloseCount = (content.match(/\}/g) || []).length;
    let parenCount = (content.match(/\(/g) || []).length;
    let parenCloseCount = (content.match(/\)/g) || []).length;

    console.log(`DIV: ${divCount} open, ${divCloseCount} close`);
    console.log(`FRAGMENT: ${fragmentCount} open, ${fragmentCloseCount} close`);
    console.log(`BRACES: ${braceCount} open, ${braceCloseCount} close`);
    console.log(`PARENS: ${parenCount} open, ${parenCloseCount} close`);
}

checkBalance();
