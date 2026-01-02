const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';

let authToken = '';

async function register() {
    try {
        const randomId = Math.random().toString(36).substring(7);
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email: `testuser${randomId}@example.com`,
            password: 'Test1234!',
            username: `testuser${randomId}`
        });
        console.log('✅ Registration successful');
        // Extract token from nested response structure
        const data = response.data.data || response.data;
        authToken = data.accessToken || data.access_token;
        console.log('Token extracted from registration');
        return data;
    } catch (error) {
        if (error.response?.status === 400 || error.response?.status === 409) {
            console.log('⚠️ User already exists, proceeding with login');
            return null;
        }
        throw error;
    }
}

async function login(email = 'testuser@example.com', password = 'Test1234!') {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email,
            password
        });
        // Extract token from nested response structure
        const data = response.data.data || response.data;
        authToken = data.accessToken || data.access_token;
        console.log('✅ Login successful, token obtained');
        return data;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        throw error;
    }
}

async function placeMarketOrder(pair, side, size) {
    try {
        const response = await axios.post(
            `${BASE_URL}/trade/market-order`,
            { pair, side, size },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        console.log(`✅ Market order placed: ${side} ${size} ${pair}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Market order failed:`, error.response?.data || error.message);
        throw error;
    }
}

async function placeLimitOrder(pair, side, size, price) {
    try {
        const response = await axios.post(
            `${BASE_URL}/trade/limit-order`,
            { pair, side, size, price },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        console.log(`✅ Limit order placed: ${side} ${size} ${pair} @ ${price}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Limit order failed:`, error.response?.data || error.message);
        throw error;
    }
}

async function testPositions() {
    console.log('\n--- Testing Positions Endpoint ---');
    try {
        const response = await axios.get(
            `${BASE_URL}/trade/positions`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log('✅ Positions endpoint successful');
        console.log('Response structure:', {
            success: response.data.success,
            dataType: typeof response.data.data,
            isArray: Array.isArray(response.data.data),
            count: response.data.data?.length
        });

        if (response.data.data && response.data.data.length > 0) {
            console.log('Sample position:', response.data.data[0]);
        }

        return response.data;
    } catch (error) {
        console.error('❌ Positions endpoint failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testAllOrders() {
    console.log('\n--- Testing All Orders Endpoint ---');
    try {
        const response = await axios.get(
            `${BASE_URL}/trade/orders?limit=10&offset=0`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log('✅ All orders endpoint successful');
        console.log('Response structure:', {
            success: response.data.success,
            hasData: !!response.data.data,
            ordersCount: response.data.data?.orders?.length,
            total: response.data.data?.total,
            limit: response.data.data?.limit,
            offset: response.data.data?.offset
        });

        if (response.data.data?.orders?.length > 0) {
            console.log('Sample order:', response.data.data.orders[0]);
        }

        return response.data;
    } catch (error) {
        console.error('❌ All orders endpoint failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testActiveOrders() {
    console.log('\n--- Testing Active Orders Endpoint ---');
    try {
        const response = await axios.get(
            `${BASE_URL}/trade/orders/active`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log('✅ Active orders endpoint successful');
        console.log('Response structure:', {
            success: response.data.success,
            dataType: typeof response.data.data,
            isArray: Array.isArray(response.data.data),
            count: response.data.data?.length
        });

        if (response.data.data && response.data.data.length > 0) {
            console.log('Sample active order:', response.data.data[0]);
        } else {
            console.log('No active orders found (this is expected if all orders are filled/cancelled)');
        }

        return response.data;
    } catch (error) {
        console.error('❌ Active orders endpoint failed:', error.response?.data || error.message);
        throw error;
    }
}

async function runTests() {
    try {
        console.log('='.repeat(60));
        console.log('Testing Positions and Orders Endpoints');
        console.log('='.repeat(60));

        // Step 1: Register or Login
        console.log('\n--- Step 1: Authentication ---');
        const registerData = await register();
        if (!registerData) {
            // Registration returned null, so we need to login
            await login('testuser@example.com', 'Test1234!');
        }
        // Token is already set by register() or login()


        // Step 2: Place some test orders
        console.log('\n--- Step 2: Placing Test Orders ---');
        try {
            // Place a market buy order (should execute immediately)
            await placeMarketOrder('BTC/USDT', 'buy', 0.001);

            // Place a limit buy order (should remain open)
            await placeLimitOrder('BTC/USDT', 'buy', 0.001, 30000);

            // Give it a moment to process
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (orderError) {
            console.log('⚠️ Some orders failed, but continuing with endpoint tests...');
        }

        // Step 3: Test Positions Endpoint
        await testPositions();

        // Step 4: Test All Orders Endpoint
        await testAllOrders();

        // Step 5: Test Active Orders Endpoint
        await testActiveOrders();

        console.log('\n' + '='.repeat(60));
        console.log('✅ ALL TESTS PASSED');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST SUITE FAILED');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

runTests();
