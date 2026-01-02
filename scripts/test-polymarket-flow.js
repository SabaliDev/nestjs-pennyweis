const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';
let authToken = '';

async function registerAndLogin() {
    const randomId = Math.random().toString(36).substring(7);
    const email = `polytest${randomId}@example.com`;
    const password = 'Test1234!';
    const username = `polytest${randomId}`;

    console.log(`Registering new user: ${email}`);
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email,
            password,
            username
        });
        const data = response.data.data || response.data;
        authToken = data.accessToken || data.access_token;
        console.log('✅ Registration & Login successful');
        return authToken;
    } catch (error) {
        console.error('❌ Registration failed:');
        console.error('Message:', error.message);
        console.error('Response:', error.response?.data);
        process.exit(1);
    }
}

async function testFetchEvents() {
    console.log('\n--- 1. Testing Event Fetching ---');
    try {
        const response = await axios.get(`${BASE_URL}/polymarket/events?limit=5`);
        const events = response.data;

        console.log(`✅ Fetched ${events.length} events`);
        if (events.length > 0) {
            const evt = events[0];
            console.log(`Sample Event: "${evt.title}" (ID: ${evt.id})`);
            console.log(`Markets count: ${evt.markets?.length}`);
            return evt;
        }
    } catch (error) {
        console.error('❌ Fetch events failed:', error.response?.data || error.message);
    }
    return null;
}

async function testPlaceOrder(event) {
    console.log('\n--- 2. Testing Order Placement ---');
    if (!event || !event.markets || event.markets.length === 0) {
        console.log('❌ No market available to trade');
        return null;
    }

    const market = event.markets[0];
    const outcomeIndex = 0; // Bet on first outcome (usually "Yes")

    let clobTokenIds = market.clobTokenIds;
    if (typeof clobTokenIds === 'string') {
        try {
            clobTokenIds = JSON.parse(clobTokenIds);
        } catch (e) {
            console.error('Failed to parse clobTokenIds:', clobTokenIds);
            return null;
        }
    }

    let outcomes = market.outcomes;
    if (typeof outcomes === 'string') {
        try {
            outcomes = JSON.parse(outcomes);
        } catch (e) {
            console.error('Failed to parse outcomes:', outcomes);
            return null;
        }
    }

    const outcome = outcomes[outcomeIndex];
    const tokenId = clobTokenIds[outcomeIndex];

    console.log(`Trading on: "${market.question}"`);
    console.log(`Outcome: ${outcome}, TokenID: ${tokenId}`);

    try {
        const payload = {
            eventSlug: event.slug,
            tokenId: tokenId,
            outcome: outcome,
            shares: 10 // Buy 10 shares
        };

        const response = await axios.post(
            `${BASE_URL}/polymarket/trade/order`,
            payload,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log('✅ Order successful:', response.data);
        return response.data.data;
    } catch (error) {
        console.error('❌ Place order failed:', error.response?.data || error.message);
        return null;
    }
}

async function testPositions() {
    console.log('\n--- 3. Testing Positions ---');
    try {
        const response = await axios.get(
            `${BASE_URL}/polymarket/trade/positions`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        console.log('✅ Positions fetched:', response.data);
        if (response.data.data && response.data.data.length > 0) {
            console.log('Positions found:', response.data.data.length);
            console.log('First position details:', response.data.data[0]);
        } else {
            console.log('No positions found (unexpected if order passed)');
        }
    } catch (error) {
        console.error('❌ Fetch positions failed:', error.message);
    }
}

async function run() {
    console.log('Starting Polymarket Integration Test...');
    await registerAndLogin();

    // Ensure we have USDT balance (optional, but good practice if clean slate)
    // We assume user has funds from previous tests or logic

    const event = await testFetchEvents();
    if (event) {
        const order = await testPlaceOrder(event);
        if (order) {
            await testPositions();
        }
    }

    console.log('\nTest Complete');
}

run();
