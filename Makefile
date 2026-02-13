.PHONY: up dev down down-dev build rebuild logs ps dbshell migrate migrate-dev

COMPOSE_DEV=docker compose -f docker-compose.dev.yaml
COMPOSE_PROD=docker compose -f docker-compose.yml

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
	$(COMPOSE_PROD) run --rm --build api npm run migrate:deploy

migrate-dev:
	$(COMPOSE_DEV) up -d db
	$(COMPOSE_DEV) run --rm --build api npm run migrate:deploy
