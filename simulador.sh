#!/usr/bin/env sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$PROJECT_DIR"

usage() {
  echo "Uso: ./simulador.sh {configurar|iniciar|parar|reiniciar|status|logs|validar}"
}

case "${1:-}" in
  configurar)
    if [ -f .env ]; then
      echo ".env ja existe; nenhuma configuracao foi sobrescrita."
    else
      cp .env.example .env
      chmod 600 .env
      echo ".env criado. Preencha ACS_USERNAME e ACS_PASSWORD e altere SIMULATOR_ENABLED=true."
    fi
    ;;
  iniciar)
    [ -f .env ] || { echo "Execute primeiro: ./simulador.sh configurar" >&2; exit 1; }
    docker compose up -d --build
    docker compose ps
    ;;
  parar)
    docker compose down
    ;;
  reiniciar)
    docker compose restart cpe-simulator
    ;;
  status)
    docker compose ps
    ;;
  logs)
    docker compose logs -f --tail 200 cpe-simulator
    ;;
  validar)
    docker compose config --quiet
    docker compose run --rm --no-deps --entrypoint node cpe-simulator /app/src/validate-profiles.js
    ;;
  *)
    usage
    exit 1
    ;;
esac

