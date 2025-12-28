const WebSocket = require('ws');

async function testTradingStream() {
    console.log('Connecting to PennyWeis WebSocket server...');
    const ws = new WebSocket('ws://localhost:8080');

    ws.on('open', () => {
        console.log('Connected!');

        console.log('Subscribing to BTC/USDT...');
        ws.send(JSON.stringify({
            event: 'subscribe_trade',
            data: { pair: 'BTC/USDT' }
        }));
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        if (message.event === 'trade_update') {
            const d = message.data;
            if (d.pair === 'BTC/USDT' && d.price) {
                console.log('✅ Trade update received:', d);
                console.log('Price:', d.price);
                console.log('Test PASSED');
                process.exit(0);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        process.exit(1);
    });

    setTimeout(() => {
        console.error('Test timeout - no trade update received');
        process.exit(1);
    }, 15000);
}

testTradingStream();
