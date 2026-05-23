# Deploy AI Coder v2 - Cloudflare Worker

## Hướng dẫn deploy lên Cloudflare Workers

### Bước 1: Đăng ký Cloudflare
1. Truy cập: https://dash.cloudflare.com/sign-up
2. Tạo tài khoản miễn phí

### Bước 2: Cài đặt Wrangler CLI
```bash
npm install -g wrangler
```

### Bước 3: Đăng nhập Cloudflare
```bash
wrangler login
```

### Bước 4: Deploy Worker
```bash
cd cloudflare-worker
wrangler deploy
```

### Bước 5: Cấu hình biến môi trường (Tùy chọn)
Nếu bạn có HF_TOKEN cho private Space:
```bash
wrangler secret put HF_TOKEN
```

## Cách sử dụng

Endpoint của Worker sẽ có dạng:
`https://ai-coder-v2.YOUR-SUBDOMAIN.workers.dev`

Gửi POST request:
```javascript
fetch('https://ai-coder-v2.YOUR-SUBDOMAIN.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Viết code Python để sort array' })
});
```

## Cấu trúc file
- `worker.js` - Code chính của Cloudflare Worker
- `wrangler.toml` - File cấu hình (tạo tự động khi deploy)
