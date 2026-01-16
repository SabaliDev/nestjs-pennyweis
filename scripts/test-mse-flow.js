const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';
const MSE_URL = `${BASE_URL}/mse`;
const AUTH_URL = `${BASE_URL}/auth`;
const WALLET_URL = `${BASE_URL}/wallets`;

const TEST_USER = {
    email: 'mse_tester@example.com',
    username: 'mse_tester',
    password: 'Password123!'
};

async function testMSEFlow() {
    try {
        console.log('--- Phase 0: Authentication & Setup ---');

        // 1. Register/Login
        let token;
        try {
            const loginRes = await axios.post(`${AUTH_URL}/login`, {
                email: TEST_USER.email,
                password: TEST_USER.password
            });
            token = loginRes.data.data.accessToken;
            console.log('✅ Logged in.');
        } catch (e) {
            console.log('Registering test user...');
            await axios.post(`${AUTH_URL}/register`, TEST_USER);
            const loginRes = await axios.post(`${AUTH_URL}/login`, {
                email: TEST_USER.email,
                password: TEST_USER.password
            });
            token = loginRes.data.data.accessToken;
            console.log('✅ Registered and logged in.');
        }

        const authHeader = { Authorization: `Bearer ${token}` };

        // 2. Fund MWK Wallet
        console.log('\n--- Phase 1: Funding MWK Wallet ---');
        try {
            await axios.post(WALLET_URL, {
                currency: 'MWK',
                initialBalance: '1000000' // 1M MWK
            }, { headers: authHeader });
            console.log('✅ MWK Wallet created with 1M MWK');
        } catch (e) {
            if (e.response?.data?.message?.includes('already exists')) {
                console.log('ℹ️ MWK Wallet already exists');
            } else {
                throw e;
            }
        }

        // 3. Get MSE Stocks
        console.log('\n--- Phase 2: Market Data ---');
        const stocksRes = await axios.get(`${MSE_URL}/stocks`);
        const stocks = stocksRes.data.data;
        console.log(`✅ Retrieved ${stocks.length} MSE stocks`);
        const nbm = stocks.find(s => s.symbol === 'NBM');
        console.log(`   NBM Price: ${nbm.price} MWK`);

        // 4. Place Limit Order
        console.log('\n--- Phase 3: Placing Limit Order ---');
        const orderPrice = (parseFloat(nbm.price) + 50).toString(); // Slightly above market
        const orderRes = await axios.post(`${MSE_URL}/order`, {
            symbol: 'NBM',
            side: 'buy',
            orderType: 'limit',
            quantity: '10',
            price: orderPrice
        }, { headers: authHeader });

        const orderId = orderRes.data.data.id;
        console.log(`✅ Limit BUY order placed for NBM at ${orderPrice} MWK. ID: ${orderId}`);

        // 5. Trigger Price Update (Real market data simulation)
        console.log('\n--- Phase 4: Triggering Price Update ---');
        const updatedPrice = (parseFloat(nbm.price) + 20).toString(); // Price stays below limit
        const updateRes = await axios.post(`${MSE_URL}/admin/price-update`, {
            symbol: 'NBM',
            price: updatedPrice
        });
        console.log(`✅ NBM Price updated to ${updatedPrice} MWK`);

        // 6. Verification
        console.log('\n--- Phase 5: Verification ---');
        // Wait a bit for the engine to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        const walletsRes = await axios.get(WALLET_URL, { headers: authHeader });
        const nbmWallet = walletsRes.data.data.find(w => w.currency === 'NBM');
        const mwkWallet = walletsRes.data.data.find(w => w.currency === 'MWK');

        if (nbmWallet && parseFloat(nbmWallet.balance) >= 10) {
            console.log(`✅ Order FILLED! NBM Balance: ${nbmWallet.balance}`);
            console.log(`   MWK Balance: ${mwkWallet.balance}`);
        } else {
            console.log('❌ Order NOT filled or verification failed');
            console.log('   Wallets:', JSON.stringify(walletsRes.data.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
    }
}

testMSEFlow();
