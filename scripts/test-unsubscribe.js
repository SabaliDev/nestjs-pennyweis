const WebSocket = require('ws');

const PAIR = 'BTC/USDT';
const INTERVAL = '1m';

function testUnsubscribe() {
    console.log('--- Testing Unsubscribe ---');
    const ws = new WebSocket('ws://localhost:8080');
    let messageCount = 0;
    let unsubscribed = false;

    ws.on('open', () => {
        console.log('WS Connected');
        // Subscribe to Trade
        ws.send(JSON.stringify({
            event: 'subscribe_trade',
            data: { pair: PAIR }
        }));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.event === 'trade_update') {
            if (unsubscribed) {
                console.error('❌ Received trade update AFTER unsubscribe!');
                process.exit(1);
            }

            console.log('Trade update received');
            messageCount++;

            if (messageCount === 3) {
                console.log('--- Unsubscribing ---');
                ws.send(JSON.stringify({
                    event: 'unsubscribe_trade',
                    data: { pair: PAIR }
                }));
                unsubscribed = true;

                // Wait 5 seconds to ensure no more messages come
                setTimeout(() => {
                    console.log('✅ No messages received after unsubscribe.');
                    console.log('Test PASSED');
                    process.exit(0);
                }, 5000);
            }
        } else if (msg.event === 'unsubscribed_trade') {
            console.log('Unsubscribe confirmed:', msg.data);
        }
    });

    ws.on('error', (err) => {
        console.error('WS Error:', err);
        process.exit(1);
    });
}

testUnsubscribe();
