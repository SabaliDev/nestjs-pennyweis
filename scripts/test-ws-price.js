
const WebSocket = require('ws');

async function testPriceStream() {
    console.log('Connecting to PennyWeis WebSocket server...');
    const ws = new WebSocket('ws://localhost:8080');

    ws.on('open', () => {
        console.log('Connected!');

        // Subscribe to Bitcoin
        console.log('Subscribing to bitcoin...');
        ws.send(JSON.stringify({
            event: 'subscribe_price',
            data: { coinId: 'bitcoin' }
        }));
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        if (message.event === 'price_update') {
            console.log('✅ Price update received:', message.data);
            console.log('Test PASSED');
            process.exit(0);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        process.exit(1);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
        console.error('Test timeout - no price update received');
        process.exit(1);
    }, 30000);
}

testPriceStream();
