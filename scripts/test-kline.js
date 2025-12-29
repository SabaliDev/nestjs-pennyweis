const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:8080/api/v1/trade';

async function testKline() {
    try {
        console.log('--- Testing REST Candles ---');
        const candles = await axios.get(`${BASE_URL}/candles/BTC%2FUSDT?interval=1m&limit=5`);
        console.log(`Fetched ${candles.data.length} candles.`);
        console.log('Sample candle:', candles.data[0]);

        console.log('\n--- Testing WS Kline Subscription ---');
        const ws = new WebSocket('ws://localhost:8080');

        ws.on('open', () => {
            console.log('WS Connected');
            ws.send(JSON.stringify({
                event: 'subscribe_kline',
                data: { pair: 'BTC/USDT', interval: '1m' }
            }));
        });

        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            // console.log('Msg:', msg);

            if (msg.event === 'kline_update') {
                const k = msg.data;
                if (k.symbol === 'BTCUSDT' && k.close) {
                    console.log('✅ Kline update received:', k);
                    console.log('Test PASSED');
                    process.exit(0);
                }
            }
        });

        ws.on('error', (err) => {
            console.error('WS Error:', err);
            process.exit(1);
        });

        setTimeout(() => {
            console.error('Timeout waiting for kline update');
            process.exit(1);
        }, 15000);

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testKline();
