function cleanDescription(desc) {
    if (!desc || typeof desc !== 'string') return '';
    return desc
        // Replace literal string "\n", "\\n", "\r\n", "\\r\\n" with actual newlines
        .replace(/\\r\\n|\\n|\\r/g, '\n')
        // Clean double-encoded or repetitive newlines
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .replace(/&amp;/g, '&')
        .trim();
}

const sampleDesc = "6.25 meter with running blouse plus 1 meter contrast blouse.\n\\n\n\\nSaree length 6.25 metres with running blouse and 1 metre contrast blouse.\n\\n\n\\nHeight 47 inches\n\\n\n\\nEasy to wash and maintain.Starch not required.\n\\nPrint won’t fade. You can machine wash as well after two times by hand.\n\\n\n\\nDelivery time : We take 2-3 business days to ship any product. After the shipment, it takes 5- 7 working days to deliver the product.";

console.log('Cleaned Description Output:');
console.log(cleanDescription(sampleDesc));
