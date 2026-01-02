const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';

async function registerUser(prefix) {
    const randomId = Math.random().toString(36).substring(7);
    const email = `${prefix}${randomId}@example.com`;
    const password = 'Test1234!';
    const username = `${prefix}${randomId}`;

    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            email,
            password,
            username
        });
        const data = response.data.data || response.data;
        const userData = {
            token: data.accessToken || data.access_token,
            user: data.user,
            initialBalance: 1000
        };

        // Initialize portfolio
        try {
            await axios.get(`${BASE_URL}/portfolio/summary`, {
                headers: { Authorization: `Bearer ${userData.token}` }
            });
            console.log(`✅ Portfolio initialized for ${prefix}`);
        } catch (e) {
            console.warn(`Portfolio init warning: ${e.message}`);
        }

        return userData;
    } catch (error) {
        console.error(`❌ Registration failed for ${prefix}:`, error.message);
        return null;
    }
}

async function placeWinningTrade(token, symbol = 'BTC/USDT') {
    // Simulate a trade that creates value (in a real scenario, we'd need market movement)
    // For this test, we accept that PnL might be 0 initially, but we check if the user appears on leaderboard.
    // To properly simulate PnL, we would need to mock prices or have a "winning" trade background.

    // However, PortfolioService.updatePortfolioValues calculates based on wallet balances.
    // If we just hold USDT, value is 1000. PnL is 0.

    // Let's try to verify the leaderboard returns our users with 0 PnL first.
    // Then ideally we'd need to manipulate the portfolio value.
}

async function getLeaderboard() {
    try {
        const response = await axios.get(`${BASE_URL}/leaderboard`);
        return response.data;
    } catch (error) {
        console.error('❌ Leaderboard fetch failed:', error.message);
        return null;
    }
}

async function run() {
    console.log('--- Leaderboard Test ---');

    const userA = await registerUser('winner');
    const userB = await registerUser('loser');

    if (!userA || !userB) process.exit(1);

    console.log('✅ Registered 2 users');

    // Fetch Leaderboard
    const leaderboard = await getLeaderboard();

    if (leaderboard && leaderboard.data) {
        console.log('✅ Leaderboard fetched');
        console.log(`Total entries: ${leaderboard.total}`);

        const foundA = leaderboard.data.find(r => r.username === userA.user.username);
        const foundB = leaderboard.data.find(r => r.username === userB.user.username);

        if (foundA) {
            console.log(`User A found: Rank ${foundA.rank}, PnL: ${foundA.pnl}`);
        } else {
            console.error('❌ User A not found in leaderboard');
        }

    } else {
        console.error('❌ Invalid leaderboard response');
    }
}

run();
