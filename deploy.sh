#!/bin/bash
set -e

echo "=== Deploy Clothing2Rent PDV ==="

echo "1. Instalando dependências..."
npm ci

echo "2. Fazendo build..."
npm run build

echo "3. Copiando arquivos..."
sudo mkdir -p /var/www/clothing2rent-pdv
sudo cp -r dist/* /var/www/clothing2rent-pdv/
sudo chown -R www-data:www-data /var/www/clothing2rent-pdv

echo "4. Configurando Nginx..."
sudo cp nginx-hostinger.conf /etc/nginx/sites-available/clothing2rent-pdv
sudo ln -sf /etc/nginx/sites-available/clothing2rent-pdv /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== Deploy concluído! ==="
