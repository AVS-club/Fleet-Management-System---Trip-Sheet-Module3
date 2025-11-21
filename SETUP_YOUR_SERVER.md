# Using Your Existing Whitelisted Server

Since you already have a whitelisted server, this is the PERFECT solution! Here's how to set it up:

## Step 1: Copy the Proxy Server to Your Server

Copy the `combined-proxy-server.js` file to your server. You can:
- Use SCP: `scp combined-proxy-server.js user@your-server:/path/to/directory/`
- Or copy-paste the content manually

## Step 2: Install on Your Server

SSH into your server and run:

```bash
# 1. Go to the directory where you put the file
cd /path/to/your/proxy

# 2. Initialize npm project
npm init -y

# 3. Install dependencies
npm install express cors node-fetch dotenv

# 4. Install PM2 to keep it running
npm install -g pm2

# 5. Start the proxy server
pm2 start combined-proxy-server.js --name api-proxy

# 6. Make it start on server reboot
pm2 startup
pm2 save
```

## Step 3: Update Your Production Environment

Create or update `.env.production` with YOUR server's IP/domain:

```env
# Replace YOUR_SERVER_IP with your actual server IP or domain
VITE_RC_PROXY_URL=http://YOUR_SERVER_IP:3001/api/fetch-rc-details
VITE_DL_PROXY_URL=http://YOUR_SERVER_IP:3001/api/fetch-dl-details
VITE_CHALLAN_PROXY_URL=http://YOUR_SERVER_IP:3001/api/fetch-challan-info

# Your Supabase config (keep as is)
VITE_SUPABASE_URL=https://oosrmuqfcqtojflruhww.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3JtdXFmY3F0b2pmbHJ1aHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIzMzUyNzgsImV4cCI6MjAzNzkxMTI3OH0.lxP3ufOJCsEtNFTWMp5A3aZBg8aqVOgCuDVVWZcwRow
```

## Step 4: Update Frontend Code

Since we already made the frontend detect production vs development, we need to update it to use environment variables in production:

In `src/components/vehicles/VehicleForm.tsx` and similar files, change:

```javascript
const isProduction = import.meta.env.PROD;
const proxyUrl = isProduction 
  ? '/api/fetch-rc-details'  // This was for Netlify
  : (import.meta.env.VITE_RC_PROXY_URL || 'http://localhost:3001/api/fetch-rc-details');
```

To:

```javascript
// Use environment variable which will point to your server
const proxyUrl = import.meta.env.VITE_RC_PROXY_URL || 'http://localhost:3001/api/fetch-rc-details';
```

## Step 5: Test Your Setup

1. Test the proxy directly:
   ```bash
   curl http://YOUR_SERVER_IP:3001/health
   ```

2. Test RC fetch:
   ```bash
   curl -X POST http://YOUR_SERVER_IP:3001/api/fetch-rc-details \
     -H "Content-Type: application/json" \
     -d '{"registration_number":"CG04NC4622"}'
   ```

## Step 6: Configure Firewall (if needed)

Make sure port 3001 is open on your server:

```bash
# For Ubuntu/Debian with UFW
sudo ufw allow 3001

# For CentOS/RHEL with firewalld
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## That's It! 🎉

Your app will now:
1. In development: Use localhost:3001 (your local proxy)
2. In production: Use YOUR_SERVER_IP:3001 (your whitelisted server)

Since your server's IP is already whitelisted with API Club, everything will work perfectly!

## Benefits of This Approach:
- ✅ No IP whitelisting issues (your server is already whitelisted)
- ✅ Full control over the proxy server
- ✅ No dependency on Netlify Functions
- ✅ Works in both development and production
- ✅ Can handle high traffic efficiently

## Optional: Use HTTPS

For production, you might want to use HTTPS. You can:
1. Use nginx as a reverse proxy with SSL
2. Or use Cloudflare to proxy your server (free SSL)
3. Or add SSL directly to the Express server

Let me know your server details and I can help with the specific setup!