const fs = require('fs');

function fixClosingTags() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let content = fs.readFileSync(path, 'utf8');

    // Add closing </div> before the final </>
    const target = '</>';
    const lastIndex = content.lastIndexOf(target);

    if (lastIndex === -1) {
        console.error('Could not find final closing fragment');
        return;
    }

    // Insert </div> before the final </>
    content = content.substring(0, lastIndex) + '            </div>\n        ' + content.substring(lastIndex);

    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully added missing closing div');
}

fixClosingTags();
