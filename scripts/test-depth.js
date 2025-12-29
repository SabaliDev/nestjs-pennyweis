const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1/trade';

async function testDepth() {
    try {
        console.log('--- Testing Depth Endpoint ---');
        const depth = await axios.get(`${BASE_URL}/depth/BTC%2FUSDT?limit=5`);
        console.log('Depth Response (Bids):', depth.data.bids[0]);
        console.log('Depth Response (Asks):', depth.data.asks[0]);
        console.log('Last Update ID:', depth.data.lastUpdateId);

        if (depth.data.bids.length > 0 && depth.data.asks.length > 0) {
            console.log('✅ Depth endpoint returned valid data.');
            console.log('Test PASSED');
        } else {
            console.error('❌ Depth data missing bids or asks.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testDepth();
