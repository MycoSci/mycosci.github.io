#!/bin/bash
# Run this after WordPress is up to install essential plugins

echo "Installing WPGraphQL and essential plugins..."

# Wait for WordPress to be ready
sleep 5

# Install WP-CLI in the container
docker exec mycosci_wordpress bash -c "curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp"

# Install plugins
docker exec mycosci_wordpress wp plugin install wp-graphql --activate --allow-root
docker exec mycosci_wordpress wp plugin install wp-graphql-jwt-authentication --activate --allow-root
docker exec mycosci_wordpress wp plugin install woocommerce --activate --allow-root
docker exec mycosci_wordpress wp plugin install wp-graphql-woocommerce --activate --allow-root

# Set permalink structure for REST API
docker exec mycosci_wordpress wp rewrite structure '/%postname%/' --allow-root

echo ""
echo "=========================================="
echo "WordPress is ready!"
echo "=========================================="
echo ""
echo "WordPress Admin: http://localhost:8888/wp-admin"
echo "GraphQL Endpoint: http://localhost:8888/graphql"
echo "phpMyAdmin: http://localhost:8081"
echo ""
echo "Default login: Complete setup at http://localhost:8080"
echo ""
