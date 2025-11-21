# Production Solution for IP Whitelisting Issue

## The Problem
The API Club APIs require IP whitelisting, but:
- Netlify Functions use dynamic IPs that change
- These IPs cannot be whitelisted effectively
- This is why you're getting "API key issue or IP not whitelisted" errors

## Solutions

### Option 1: Deploy Proxy Server on a Fixed IP Service (RECOMMENDED)

Deploy the `combined-proxy-server.js` to a service with a static IP:

1. **DigitalOcean Droplet** ($4/month)
   - Create a small droplet
   - Deploy the proxy server
   - Whitelist the droplet's IP
   - Update your app to use: `https://your-droplet-ip/api/fetch-rc-details`

2. **AWS EC2** (Free tier available)
   - Launch t2.micro instance
   - Deploy the proxy server  
   - Use Elastic IP (static)
   - Whitelist the Elastic IP

3. **Render.com** (Free tier)
   - Deploy as a web service
   - Get the static IP from Render support
   - Whitelist that IP

### Option 2: Use Your Own Server

If you have a server or computer with a static IP:
1. Run the proxy server there
2. Expose it to the internet (using ngrok, cloudflare tunnel, etc.)
3. Whitelist that IP

### Option 3: Contact API Provider

Ask API Club if they have:
- An option to disable IP whitelisting for your API key
- A list of Netlify IP ranges to whitelist
- An alternative authentication method

## Quick Setup for DigitalOcean

```bash
# 1. Create droplet and SSH in
ssh root@your-droplet-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Create project directory
mkdir api-proxy
cd api-proxy

# 4. Copy your combined-proxy-server.js
nano combined-proxy-server.js
# Paste the content

# 5. Install dependencies
npm init -y
npm install express cors node-fetch dotenv

# 6. Install PM2 to keep it running
npm install -g pm2

# 7. Start the server
pm2 start combined-proxy-server.js
pm2 startup
pm2 save

# 8. Configure firewall
ufw allow 3001
```

Then update your environment variables:
```env
VITE_RC_PROXY_URL=http://your-droplet-ip:3001/api/fetch-rc-details
VITE_DL_PROXY_URL=http://your-droplet-ip:3001/api/fetch-dl-details
VITE_CHALLAN_PROXY_URL=http://your-droplet-ip:3001/api/fetch-challan-info
```

## Temporary Workaround

For now, you can:
1. Keep using the local proxy for development
2. Have users run the proxy locally
3. Or manually enter data until a production proxy is set up

The core issue is that **Netlify Functions cannot work with IP whitelisting** due to their dynamic nature.
