const WebSocket = require('ws');

async function testOHLCVStream() {
    console.log('Connecting to PennyWeis WebSocket server...');
    const ws = new WebSocket('ws://localhost:8080');

    ws.on('open', () => {
        console.log('Connected!');

        // Subscribe to ETH-USDT (Example from docs)
        // eth:0xc7bbec68d12a0d1830360f8ec58fa599ba1b0e9b
        const network = 'eth';
        const poolAddress = '0xc7bbec68d12a0d1830360f8ec58fa599ba1b0e9b';

        console.log(`Subscribing to OHLCV for ${network}:${poolAddress}...`);
        ws.send(JSON.stringify({
            event: 'subscribe_ohlcv',
            data: {
                network,
                poolAddress,
                interval: '1m',
                token: 'base'
            }
        }));
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('Received message:', JSON.stringify(message, null, 2));

        if (message.event === 'ohlcv_update') {
            const d = message.data;
            if (d.networkId && d.poolAddress && d.close) {
                console.log('✅ OHLCV update received:', d);
                console.log('Test PASSED');
                process.exit(0);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        process.exit(1);
    });

    // Timeout after 60 seconds (OHLCV might be slower than price)
    setTimeout(() => {
        console.error('Test timeout - no OHLCV update received');
        process.exit(1);
    }, 60000);
}

testOHLCVStream();
