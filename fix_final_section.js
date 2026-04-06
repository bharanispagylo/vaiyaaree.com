const fs = require('fs');

const path = 'd:/aiswarya/src/app/admin/products/page.js';
let content = fs.readFileSync(path, 'utf8');

const lastSection = `                        <button onClick={() => setSelectedProductIds([])} style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: 'white',
                            padding: '0.5rem 1.25rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    </>
);
}
`;

const startIndex = content.lastIndexOf('<button onClick={() => setSelectedProductIds([])}');

if (startIndex !== -1) {
    content = content.substring(0, startIndex) + lastSection;
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully wrote final section');
} else {
    console.log('Could not find start index of final section');
}
