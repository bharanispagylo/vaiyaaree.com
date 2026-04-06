const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

try {
  const canvas = createCanvas(200, 50);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 200, 50);
  ctx.fillStyle = 'white';
  ctx.font = '24px sans-serif';
  ctx.fillText('CAT-123', 10, 35);
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync('tmp/test_canvas.png', buf);
  console.log('Success: tmp/test_canvas.png created');
} catch (e) {
  console.error('Error:', e);
}
