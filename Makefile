.PHONY: up dev down down-dev build rebuild logs ps dbshell migrate migrate-dev baseline baseline-dev

COMPOSE_DEV=docker compose -f docker-compose.dev.yaml
COMPOSE_PROD=docker compose -f docker-compose.yml
PRISMA_BASELINE_MIGRATIONS=20260212000100_users_bootstrap 20260213000100_users_contact_and_birth_date

up:
	$(COMPOSE_PROD) up -d

dev:
	$(COMPOSE_DEV) up -d

down:
	$(COMPOSE_PROD) down

down-dev:
	$(COMPOSE_DEV) down

build:
	$(COMPOSE_PROD) build

rebuild:
	$(COMPOSE_PROD) build --no-cache

logs:
	$(COMPOSE_PROD) logs -f --tail=200

ps:
	$(COMPOSE_PROD) ps

dbshell:
	$(COMPOSE_PROD) exec db psql -U apihub -d apihub

migrate:
	$(COMPOSE_PROD) up -d db
	$(COMPOSE_PROD) run api npm run migrate:deploy

migrate-dev:
	$(COMPOSE_DEV) up -d db
	$(COMPOSE_DEV) run api npm run migrate:deploy

baseline:
	$(COMPOSE_PROD) up -d db
	@for migration in $(PRISMA_BASELINE_MIGRATIONS); do \
		$(COMPOSE_PROD) run api npx prisma migrate resolve --applied $$migration; \
	done

baseline-dev:
	$(COMPOSE_DEV) up -d db
	@for migration in $(PRISMA_BASELINE_MIGRATIONS); do \
		$(COMPOSE_DEV) run api npx prisma migrate resolve --applied $$migration; \
	done
