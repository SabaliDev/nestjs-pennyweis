const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';
const TRADE_URL = `${BASE_URL}/trade`;
const AUTH_URL = `${BASE_URL}/auth`;

const TEST_USER = {
    email: 'testuser3@example.com',
    username: 'testuser3',
    password: 'Password123!'
};

async function testTradingEngine() {
    try {
        console.log('--- Phase 0: Authentication ---');

        // 1. Try to register (might already exist)
        console.log('Registering/Checking test user...');
        try {
            await axios.post(`${AUTH_URL}/register`, TEST_USER);
            console.log('✅ User registered');
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('ℹ️ User already exists');
            } else {
                throw e;
            }
        }

        // 2. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${AUTH_URL}/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        const token = loginRes.data.data.accessToken;
        console.log('✅ Logged in. Token obtained.');

        const authHeader = { Authorization: `Bearer ${token}` };

        console.log('\n--- Phase 1: Funding Account ---');
        await axios.post(`${TRADE_URL}/faucet`, {}, { headers: authHeader });
        console.log('✅ Account funded via faucet');

        console.log('\n--- Phase 2: Testing Market Order (BUY) ---');
        const marketBuy = await axios.post(`${TRADE_URL}/market-order`, {
            pair: 'BTC/USDT',
            side: 'buy',
            size: 0.01
        }, { headers: authHeader });
        console.log('✅ Market BUY order executed:', marketBuy.data.message);
        console.log('   Executed Price (with slippage):', marketBuy.data.executedPrice);

        console.log('\n--- Phase 3: Testing Limit Order (SELL) ---');
        const currentPrice = marketBuy.data.executedPrice;
        const limitPrice = (currentPrice * 1.05).toFixed(2);

        const limitOrder = await axios.post(`${TRADE_URL}/limit-order`, {
            pair: 'BTC/USDT',
            side: 'sell',
            size: 0.005,
            price: parseFloat(limitPrice)
        }, { headers: authHeader });
        console.log('✅ Limit SELL order placed:', limitOrder.data.message);
        console.log('   Order Status:', limitOrder.data.status);
        console.log('   Limit Price:', limitPrice);

        console.log('\n--- Phase 4: Verification Complete ---');
        console.log('Verify in DB that Limit order is OPEN and Market order is FILLED.');

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
    }
}

testTradingEngine();
