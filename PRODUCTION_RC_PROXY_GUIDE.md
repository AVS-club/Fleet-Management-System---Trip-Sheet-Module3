# Production RC Proxy Deployment Guide

## The Problem
- API Club requires IP whitelisting
- Supabase edge functions use dynamic IPs that change frequently
- Multiple users from different locations need access

## Solution: Deploy a Central Proxy Server

### Option 1: Deploy on a Cloud VPS (Recommended)

1. **Get a VPS with Static IP** (e.g., DigitalOcean, AWS EC2, Linode)
   - Small instance is sufficient ($5-10/month)
   - Choose a location close to your users

2. **Deploy the Proxy Server**
```bash
# On your VPS
git clone <your-repo>
cd <your-repo>
npm install express cors node-fetch
pm2 start rc-proxy-server.js --name rc-proxy
```

3. **Whitelist the VPS IP in API Club**
   - Login to API Club dashboard
   - Add your VPS's static IP address

4. **Update Frontend to Use Production URL**
```javascript
// In your .env.production
REACT_APP_RC_PROXY_URL=https://your-vps-domain.com/api/fetch-rc-details

// Or use environment-specific config
const RC_PROXY_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-vps-domain.com/api/fetch-rc-details'
  : 'http://localhost:3001/api/fetch-rc-details';
```

### Option 2: Use Vercel/Netlify Functions
Deploy the proxy as a serverless function, but you'll need to:
1. Get the function's IP range from provider
2. Whitelist entire IP range in API Club

### Option 3: Use ngrok for Testing
For testing with multiple team members:
```bash
# Run proxy server locally
node rc-proxy-server.js

# In another terminal, expose it via ngrok
ngrok http 3001

# Share the ngrok URL with team
# https://abc123.ngrok.io/api/fetch-rc-details
```

### Security Considerations

1. **Add Authentication to Proxy**
```javascript
// In rc-proxy-server.js
app.post('/api/fetch-rc-details', async (req, res) => {
  // Add auth check
  const authToken = req.headers['x-auth-token'];
  if (authToken !== process.env.PROXY_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // ... rest of the code
});
```

2. **Rate Limiting**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/fetch-rc-details', limiter);
```

3. **CORS Configuration**
```javascript
app.use(cors({
  origin: [
    'https://your-production-domain.com',
    'https://staging.your-domain.com'
  ],
  credentials: true
}));
```

### Monitoring & Maintenance

1. **Use PM2 for Process Management**
```bash
pm2 start rc-proxy-server.js --name rc-proxy
pm2 save
pm2 startup
```

2. **Add Logging**
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

3. **Health Check Endpoint**
```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

## Quick Start for Production

1. **Deploy to DigitalOcean (Example)**
```bash
# Create a $5 droplet with Ubuntu
# SSH into the droplet

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repo and setup
git clone <your-repo>
cd <your-repo>
npm install
npm install -g pm2

# Set environment variables
echo "API_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50" >> .env
echo "PROXY_AUTH_TOKEN=your-secret-token" >> .env

# Start with PM2
pm2 start rc-proxy-server.js --name rc-proxy
pm2 save
pm2 startup
```

2. **Whitelist the Droplet IP in API Club**

3. **Update your frontend to use the production URL**

4. **Test thoroughly before rolling out to users**

## Cost Estimates
- DigitalOcean/Linode: $5-10/month
- AWS EC2 t3.micro: ~$10/month
- Vercel/Netlify Functions: Free tier usually sufficient

## Support
For any issues, check:
1. PM2 logs: `pm2 logs rc-proxy`
2. API Club dashboard for API usage
3. Network tab in browser DevTools
