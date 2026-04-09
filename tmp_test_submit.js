const { submitReturnExchangeRequest } = require('./src/services/whatsappService.js');
async function test() {
    const res = await submitReturnExchangeRequest('917558189732', 'RETURN', 'WEB-432363', 'test reason');
    console.log(res);
}
test();
