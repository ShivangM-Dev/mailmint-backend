/**
 * Test script to simulate RapidAPI webhook events.
 * 
 * Usage:
 *   node src/scripts/testRapidApiWebhook.js [event] [userId] [email] [plan]
 * 
 * Examples:
 *   node src/scripts/testRapidApiWebhook.js created user123 test@example.com pro
 *   node src/scripts/testRapidApiWebhook.js cancelled user123
 */

const http = require('http');

const [, , eventArg, userIdArg, emailArg, planArg] = process.argv;
const event = eventArg || 'created';
const rapidapiUserId = userIdArg || `test_user_${Date.now()}`;
const email = emailArg || `test_${Date.now()}@example.com`;
const plan = planArg || 'pro';

const port = process.env.PORT || 8000;
const host = process.env.HOST || 'localhost';

// Construct webhook payload based on event type
let webhookPayload;

if (event === 'created' || event === 'activated') {
  webhookPayload = {
    event: 'subscription.created',
    user: {
      id: rapidapiUserId,
      email: email
    },
    subscription: {
      plan: plan,
      status: 'active'
    }
  };
} else if (event === 'cancelled' || event === 'deactivated') {
  webhookPayload = {
    event: 'subscription.cancelled',
    user: {
      id: rapidapiUserId,
      email: email
    },
    subscription: {
      plan: plan,
      status: 'cancelled'
    }
  };
} else if (event === 'updated') {
  webhookPayload = {
    event: 'subscription.updated',
    user: {
      id: rapidapiUserId,
      email: email
    },
    subscription: {
      plan: plan,
      status: 'active'
    }
  };
} else {
  console.error(`Unknown event type: ${event}`);
  console.error('Valid events: created, activated, cancelled, deactivated, updated');
  process.exit(1);
}

const postData = JSON.stringify(webhookPayload);

const options = {
  hostname: host,
  port: port,
  path: '/webhooks/rapidapi',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`\n🧪 Testing RapidAPI Webhook`);
console.log(`Event: ${webhookPayload.event}`);
console.log(`User ID: ${rapidapiUserId}`);
console.log(`Email: ${email}`);
console.log(`Plan: ${plan}`);
console.log(`\nSending to: http://${host}:${port}/webhooks/rapidapi\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`);
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (res.statusCode === 200 && parsed.success) {
        console.log('\n✅ Webhook processed successfully!');
        if (parsed.data?.apiKey) {
          console.log(`\nGenerated API Key: ${parsed.data.apiKey}`);
        }
      } else {
        console.log('\n❌ Webhook processing failed');
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
});

req.write(postData);
req.end();

