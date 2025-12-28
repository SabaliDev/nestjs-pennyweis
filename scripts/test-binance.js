const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1/trade';

async function testBinanceTrading() {
    try {
        console.log('--- Testing Pairs ---');
        const pairs = await axios.get(`${BASE_URL}/pairs`);
        console.log('Pairs:', pairs.data);

        console.log('\n--- Testing Price Fetch (BTC/USDT) ---');
        const price = await axios.get(`${BASE_URL}/price/BTC%2FUSDT`);
        console.log('Price:', price.data);

        console.log('\n--- Testing Market Buy Order ---');
        const buyOrder = await axios.post(`${BASE_URL}/market-order`, {
            pair: 'BTC/USDT',
            side: 'BUY',
            size: 0.001
        });
        console.log('Buy Order Executed:', buyOrder.data);

        console.log('\n--- Testing Positions ---');
        const positions = await axios.get(`${BASE_URL}/positions`);
        console.log('Positions:', positions.data);

        console.log('\n--- Testing Validations ---');
        try {
            await axios.get(`${BASE_URL}/price/INVALID`);
        } catch (e) {
            console.log('Invalid pair error caught:', e.response?.data || e.message);
        }

        console.log('\n--- Testing Subscription (Triggering WS) ---');
        // This just checks the endpoint exists and returns success
        const sub = await axios.post(`${BASE_URL}/subscribe/BTC%2FUSDT`);
        console.log('Subscription response:', sub.data);

        console.log('\n✅ Binance Paper Trading Test PASSED');
    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testBinanceTrading();
