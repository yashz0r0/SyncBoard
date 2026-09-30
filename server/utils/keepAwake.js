const https = require('https');
const http = require('http');

/**
 * Self-pinging mechanism to keep Render free instances awake
 * Prevents sleeping caused by 15 minutes of inactivity.
 */
function startKeepAwake(customUrl, intervalMinutes = 10) {
  // Use Render's automatic external URL, custom URL, or fallback
  const targetUrl =
    customUrl ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.SERVER_URL ||
    'https://syncboard-ve0c.onrender.com';

  const pingUrl = targetUrl.endsWith('/')
    ? `${targetUrl}api/health`
    : `${targetUrl}/api/health`;

  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[Keep-Awake] Service initialized. Target: ${pingUrl} (every ${intervalMinutes}m)`);

  // Run initial ping after 2 minutes
  setTimeout(() => {
    ping(pingUrl);
  }, 2 * 60 * 1000);

  // Set recurring interval
  const timer = setInterval(() => {
    ping(pingUrl);
  }, intervalMs);

  // Allow Node process to exit cleanly if needed
  if (timer.unref) timer.unref();
}

function ping(url) {
  const client = url.startsWith('https') ? https : http;
  
  const req = client.get(url, (res) => {
    const timestamp = new Date().toLocaleTimeString();
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`[Keep-Awake] [${timestamp}] Ping success: ${url} (Status: ${res.statusCode})`);
    } else {
      console.warn(`[Keep-Awake] [${timestamp}] Ping responded with status: ${res.statusCode}`);
    }
    // Consume response data to free up memory
    res.resume();
  });

  req.on('error', (err) => {
    console.error(`[Keep-Awake] Ping error:`, err.message);
  });

  // Timeout after 10 seconds to avoid hanging sockets
  req.setTimeout(10000, () => {
    req.destroy();
  });
}

module.exports = startKeepAwake;
