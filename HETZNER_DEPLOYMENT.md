# HETZNER PRODUCTION DEPLOYMENT GUIDE
# Portal + Nail Surgery Chatbot Integration

## 1. SERVER SETUP

### Update server packages
sudo apt update && sudo apt upgrade -y

### Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

### Install PM2 for process management
sudo npm install -g pm2

### Install Nginx for reverse proxy
sudo apt install nginx -y

## 2. PORTAL DEPLOYMENT

### Clone and setup portal
git clone <your-repo-url> /var/www/etea-portal
cd /var/www/etea-portal
git checkout feature/portal-webhook-consistency  # Use your feature branch
npm install
npm run build

### Create production environment file
sudo nano /var/www/etea-portal/.env.production
```
NODE_ENV=production
PORT=5002
DATABASE_URL=postgresql://user:pass@host:port/db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NAIL_WEBHOOK_SECRET=your-strong-webhook-secret-here
FOOTCARE_WEBHOOK_SECRET=your-footcare-secret
LASER_WEBHOOK_SECRET=your-laser-secret
SESSION_SECRET=your-super-secure-session-secret-min-32-chars
AUTH_MODE=simple
AUTH_TOKEN=your-auth-token
CORS_ORIGIN=https://your-domain.com
```

### Setup PM2 process
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

## 3. NGINX CONFIGURATION

### Create Nginx config
sudo nano /etc/nginx/sites-available/etea-portal
```
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (after setting up certificates)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Portal proxy
    location / {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Webhook endpoint (ensure it works)
    location /api/webhooks/ {
        proxy_pass http://127.0.0.1:5002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Larger body size for file uploads
        client_max_body_size 10M;
    }
}
```

### Enable site
sudo ln -s /etc/nginx/sites-available/etea-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

## 4. SSL SETUP

### Install Certbot
sudo apt install certbot python3-certbot-nginx -y

### Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

### Auto-renewal
sudo systemctl enable certbot.timer

## 5. FIREWALL SETUP

### Configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

## 6. CHATBOT CONFIGURATION

Update nail surgery chatbot environment:
```
PORTAL_WEBHOOK_URL=https://your-domain.com/api/webhooks/nailsurgery
WEBHOOK_SECRET=your-strong-webhook-secret-here
```

## 7. TESTING & MONITORING

### Test webhook
curl -X POST https://your-domain.com/api/webhooks/nailsurgery \
  -H "X-Webhook-Secret: your-secret" \
  -F 'data={"name":"Test","email":"test@example.com"}'

### Monitor logs
pm2 logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

### Health check
curl https://your-domain.com/api/health

## 8. PRODUCTION SAFETY

### Disable debug endpoints
Ensure NODE_ENV=production disables /api/debug/* routes

### Database backup
Setup automated Supabase backups

### Monitor resources
pm2 monit

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Server provisioned and updated
- [ ] Node.js 18+ installed
- [ ] Portal code deployed
- [ ] Production .env configured
- [ ] PM2 process running
- [ ] Nginx configured and running
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Chatbot updated with production URL
- [ ] Webhook tested successfully
- [ ] Monitoring setup
- [ ] Backup strategy implemented