#!/bin/bash
set -e

echo "=== Deploy via SCP + SSH ==="

SERVER="root@185.225.22.183"
REMOTE_DIR="/opt/clothing2rent-pdv"

echo "1. Fazendo build local..."
npm run build

echo "2. Enviando arquivos..."
scp -r dist/* $SERVER:$REMOTE_DIR/dist/

echo "3. Configurando no servidor..."
ssh $SERVER << 'EOF'
# Instalar nginx se não existir
apt-get install -y nginx > /dev/null 2>&1 || true

# Copiar configuração
cp /opt/clothing2rent-pdv/nginx-hostinger.conf /etc/nginx/sites-available/clothing2rent-pdv
ln -sf /etc/nginx/sites-available/clothing2rent-pdv /etc/nginx/sites-enabled/

# Recarregar nginx
nginx -t && systemctl reload nginx
EOF

echo "=== Deploy concluído! ==="
