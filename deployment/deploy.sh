#!/usr/bin/env bash

# Pratejra RAG - Cloudflare Workers Deployment Script
# This script automates the deployment process for Cloudflare Workers
# Usage: ./deployment/deploy.sh [--full|--setup|--worker-only]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }
print_step() { echo -e "\n${BLUE}═══ $1 ═══${NC}\n"; }

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"

    # Check for bun
    if ! command_exists bun; then
        print_error "Bun is not installed. Please install from https://bun.sh"
        exit 1
    fi
    print_success "Bun is installed"

    # Check if wrangler is available
    if ! command_exists wrangler && [ ! -f "node_modules/.bin/wrangler" ]; then
        print_warning "Wrangler not found. Running bun install..."
        bun install
    fi
    print_success "Wrangler is available"

    # Check authentication
    if ! bun wrangler whoami >/dev/null 2>&1; then
        print_error "Not authenticated with Cloudflare"
        print_info "Run: bun wrangler login"
        exit 1
    fi
    print_success "Authenticated with Cloudflare"
}

# Create D1 database
create_database() {
    print_step "Creating D1 Database"

    # Check if database already exists
    if bun wrangler d1 list 2>/dev/null | grep -q "pratejra-db"; then
        print_warning "Database 'pratejra-db' already exists"
        print_info "Fetching existing database ID..."

        # Extract database ID from list
        DB_ID=$(bun wrangler d1 list --json 2>/dev/null | grep -A 3 "pratejra-db" | grep "uuid" | cut -d '"' -f 4)

        if [ -n "$DB_ID" ]; then
            print_info "Existing database ID: $DB_ID"
            echo "$DB_ID" > .database_id
            print_success "Using existing database"
        else
            print_error "Could not extract database ID. Please check manually."
            exit 1
        fi
    else
        print_info "Creating new D1 database..."

        # Create database and capture output
        OUTPUT=$(bun wrangler d1 create pratejra-db 2>&1)

        # Extract database ID from output
        DB_ID=$(echo "$OUTPUT" | grep "database_id" | cut -d '"' -f 2)

        if [ -z "$DB_ID" ]; then
            print_error "Failed to extract database ID"
            echo "$OUTPUT"
            exit 1
        fi

        # Save database ID to temporary file
        echo "$DB_ID" > .database_id

        print_success "Database created successfully"
        print_info "Database ID: $DB_ID"
        print_warning "Please update wrangler.toml with this database_id"
    fi
}

# Update wrangler.toml with database ID
update_wrangler_config() {
    print_step "Updating wrangler.toml"

    if [ ! -f ".database_id" ]; then
        print_error "Database ID file not found. Run setup first."
        exit 1
    fi

    DB_ID=$(cat .database_id)

    # Check if wrangler.toml exists
    if [ ! -f "wrangler.toml" ]; then
        print_error "wrangler.toml not found"
        exit 1
    fi

    # Update database_id in wrangler.toml
    if grep -q "INSERT_YOUR_D1_ID_HERE" wrangler.toml; then
        sed -i.bak "s/INSERT_YOUR_D1_ID_HERE/$DB_ID/" wrangler.toml
        print_success "Updated wrangler.toml with database ID"
        rm -f wrangler.toml.bak
    elif grep -q "$DB_ID" wrangler.toml; then
        print_success "wrangler.toml already has correct database ID"
    else
        print_warning "Could not automatically update wrangler.toml"
        print_info "Please manually set database_id to: $DB_ID"
    fi
}

# Create Vectorize index
create_vector_index() {
    print_step "Creating Vectorize Index"

    # Check if index already exists
    if bun wrangler vectorize list 2>/dev/null | grep -q "pratejra-index"; then
        print_warning "Vector index 'pratejra-index' already exists"
        print_success "Using existing index"
    else
        print_info "Creating vector index..."
        bun wrangler vectorize create pratejra-index --dimensions=768 --metric=cosine
        print_success "Vector index created successfully"
    fi
}

# Initialize database schema
init_schema() {
    print_step "Initializing Database Schema"

    if [ ! -f "db/schema.sql" ]; then
        print_error "Schema file not found at db/schema.sql"
        exit 1
    fi

    print_info "Executing schema..."
    bun wrangler d1 execute pratejra-db --file=db/schema.sql
    print_success "Schema initialized successfully"
}

# Verify database tables
verify_database() {
    print_step "Verifying Database Setup"

    print_info "Checking tables..."
    TABLES=$(bun wrangler d1 execute pratejra-db --command "SELECT name FROM sqlite_master WHERE type='table'" --json 2>/dev/null || echo "[]")

    # Check for expected tables
    for table in "users" "documents" "graph_nodes" "graph_edges"; do
        if echo "$TABLES" | grep -q "\"$table\""; then
            print_success "Table '$table' exists"
        else
            print_warning "Table '$table' not found"
        fi
    done
}

# Deploy worker
deploy_worker() {
    print_step "Deploying Worker"

    # Build frontend first (if needed)
    if [ "$1" = "--with-build" ]; then
        print_info "Building frontend..."
        bun run build
        print_success "Frontend built successfully"
    fi

    print_info "Deploying worker to Cloudflare..."
    DEPLOY_OUTPUT=$(bun wrangler deploy 2>&1)

    # Extract worker URL from output
    WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*workers.dev' | head -1)

    if [ -n "$WORKER_URL" ]; then
        print_success "Worker deployed successfully"
        print_info "Worker URL: $WORKER_URL"
        echo "$WORKER_URL" > .worker_url
    else
        print_error "Failed to extract worker URL"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
}

# Test deployment
test_deployment() {
    print_step "Testing Deployment"

    if [ ! -f ".worker_url" ]; then
        print_warning "Worker URL not found. Skipping tests."
        return
    fi

    WORKER_URL=$(cat .worker_url)

    print_info "Testing endpoint: $WORKER_URL/api/graph"

    # Test graph endpoint
    RESPONSE=$(curl -s -w "\n%{http_code}" "$WORKER_URL/api/graph" 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Worker is responding correctly"
    else
        print_warning "Worker returned HTTP $HTTP_CODE"
    fi
}

# Full setup
full_setup() {
    print_info "Starting full setup process..."
    check_prerequisites
    create_database
    update_wrangler_config
    create_vector_index
    init_schema
    verify_database
    print_success "Setup completed successfully!"
    print_info "Run './deployment/deploy.sh --worker-only' to deploy the worker"
}

# Worker only deployment
worker_only() {
    print_info "Deploying worker only..."
    check_prerequisites
    deploy_worker "--with-build"
    test_deployment
    print_success "Deployment completed successfully!"
}

# Complete deployment (setup + deploy)
full_deployment() {
    print_info "Starting full deployment process..."
    full_setup
    deploy_worker "--with-build"
    test_deployment
    print_success "Full deployment completed successfully!"
}

# Show usage
show_usage() {
    echo "Pratejra RAG - Cloudflare Workers Deployment Script"
    echo ""
    echo "Usage: ./deployment/deploy.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  --full          Run complete setup and deployment (default)"
    echo "  --setup         Run setup only (DB, vector index, schema)"
    echo "  --worker-only   Deploy worker only (assumes setup is done)"
    echo "  --verify        Verify database setup"
    echo "  --test          Test deployed worker"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deployment/deploy.sh --setup      # First-time setup"
    echo "  ./deployment/deploy.sh --worker-only # Deploy after changes"
    echo "  ./deployment/deploy.sh --full       # Complete deployment"
    echo ""
}

# Main script logic
main() {
    # Change to project root
    cd "$(dirname "$0")/.."

    case "${1:---full}" in
        --full)
            full_deployment
            ;;
        --setup)
            full_setup
            ;;
        --worker-only)
            worker_only
            ;;
        --verify)
            check_prerequisites
            verify_database
            ;;
        --test)
            test_deployment
            ;;
        --help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
