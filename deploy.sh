#!/bin/sh
set -e

cd /var/www/reservation_system

git reset --hard

git pull

# --- PHP Upgrade & Extension Section ---
if ! php -v | grep -q "PHP 8.4"; then
  echo "🚀 Upgrading PHP to 8.4..."

  apk add php84 \
    php84-cli php84-common php84-fpm php84-opcache php84-pcntl \
    php84-mbstring php84-intl php84-xml php84-curl \
    php84-gd php84-zip php84-pdo php84-pdo_mysql \
    php84-mysqli php84-phar php84-session php84-tokenizer \
    php84-calendar php84-fileinfo php84-dom php84-iconv php84-mysqlnd \
    php84-xmlreader php84-xmlwriter php84-simplexml

  ln -sf /usr/bin/php84 /usr/bin/php
  [ -f /usr/bin/composer ] && sed -i 's/php83/php84/g' /usr/bin/composer

  # --- SOCKET CONFIGURATION ---
  echo "🔧 Configuring PHP-FPM 8.4 Socket..."
  WWW_CONF="/etc/php84/php-fpm.d/www.conf"
  sed -i 's|^listen =.*|listen = /run/php-fpm84/php-fpm.sock|' $WWW_CONF
  sed -i 's|^;listen.owner =.*|listen.owner = nginx|' $WWW_CONF
  sed -i 's|^;listen.group =.*|listen.group = nginx|' $WWW_CONF
  sed -i 's|^;listen.mode =.*|listen.mode = 0660|' $WWW_CONF

  rc-service php-fpm83 stop || true
  rc-update del php-fpm83 || true
  rc-service php-fpm84 restart
  rc-update add php-fpm84

  NGINX_CONF="/etc/nginx/http.d/localturbo.system.conf"
  if [ -f "$NGINX_CONF" ]; then
    sed -i 's|fastcgi_pass .*|fastcgi_pass unix:/run/php-fpm84/php-fpm.sock;|' $NGINX_CONF
    nginx -t && rc-service nginx reload || true
  fi

  NGINX_CONF="/etc/nginx/http.d/phpmyadmin.conf"
  if [ -f "$NGINX_CONF" ]; then
    sed -i 's|fastcgi_pass .*|fastcgi_pass unix:/run/php-fpm84/php-fpm.sock;|' $NGINX_CONF
    nginx -t && rc-service nginx reload || true
  fi
fi

# --- Deployment Logic ---
cd /var/www/turbo_restaurant/larament

echo "📦 Installing Dependencies..."
composer install
npm install && npm run build

# --- PERMISSIONS SECTION ---
echo "🔐 Setting Laravel Permissions for Filament..."

# 1. Ensure the directories exist
mkdir -p storage/framework/cache/data
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p bootstrap/cache

# 2. Set Ownership (nobody is the typical Alpine web user)
# We give ownership to nobody so it can write uploads and cache files
chown -R nobody:nobody storage bootstrap/cache public

# 3. Set Permissions
# 775 allows the owner and group (nginx) to write, while others can read
chmod -R 775 storage bootstrap/cache public

# 4. Create the symbolic link for storage if it doesn't exist
php artisan storage:link --force

# --- Optimization ---
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan cache:clear
php artisan optimize:clear
php artisan optimize

echo "🔧 Configuring PHP 8.4 and Nginx Limits (Upload/Post: 300MB, Memory: 1536MB)..."

PHP_INI="/etc/php84/php.ini"
if [ -f "$PHP_INI" ]; then
  sed -i 's|^upload_max_filesize =.*|upload_max_filesize = 300M|' "$PHP_INI"
  sed -i 's|^post_max_size =.*|post_max_size = 300M|' "$PHP_INI"
  sed -i 's|^memory_limit =.*|memory_limit = 1536M|' "$PHP_INI"
  sed -i 's|^max_execution_time =.*|max_execution_time = 300|' "$PHP_INI"
  sed -i 's|^max_input_time =.*|max_input_time = 300|' "$PHP_INI"
  rc-service php-fpm84 restart
fi

echo "✅ PHP 8.4 and Nginx Limits Configured Successfully."
# --- NGINX HTTP & VHOST CONFIGURATION ---
if [ -f /etc/nginx/nginx.conf ]; then
  if grep -q "client_max_body_size" /etc/nginx/nginx.conf; then
    sed -i 's|client_max_body_size .*|client_max_body_size 300M;|' /etc/nginx/nginx.conf
  else
    sed -i '/http {/a \        client_max_body_size 300M;' /etc/nginx/nginx.conf
  fi
  rc-service nginx reload
fi
