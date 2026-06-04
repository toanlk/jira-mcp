#!/usr/bin/env bash

set -euo pipefail

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_NAME="${SERVER_NAME:-jira}"
DEFAULT_CLIENTS="codex,claude,antigravity,kiro,opencode"
CLIENTS="${DEFAULT_CLIENTS}"
SKIP_DEPS=0
SKIP_BUILD=0
SKIP_ENV=0
FORCE_ENV=0

usage() {
  cat <<EOF
Usage:
  $0 [options]
  $0 serve

Options:
  --name NAME          MCP server name in client configs (default: jira)
  --clients LIST       Comma-separated clients: codex,claude,antigravity,kiro,opencode
  --skip-deps          Skip npm install
  --skip-build         Skip npm run build
  --skip-env           Do not create or update .env
  --force-env          Overwrite existing .env with prompted/env values
  -h, --help           Show this help

Environment variables used for .env generation:
  JIRA_BASE_URL        Required unless --skip-env is used
  JIRA_TOKEN           Required unless --skip-env is used
EOF
}

log() {
  printf '[setup] %s\n' "$*"
}

fail() {
  printf '[setup] Error: %s\n' "$*" >&2
  exit 1
}

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

prompt_if_empty() {
  local var_name="$1"
  local prompt_text="$2"
  local secret="${3:-0}"
  local current_value="${!var_name:-}"

  if [[ -n "$current_value" ]]; then
    return
  fi

  if [[ ! -t 0 ]]; then
    fail "$var_name is required in non-interactive mode."
  fi

  if [[ "$secret" -eq 1 ]]; then
    read -r -s -p "$prompt_text: " current_value
    printf '\n'
  else
    read -r -p "$prompt_text: " current_value
  fi

  [[ -n "$current_value" ]] || fail "$var_name cannot be empty."
  printf -v "$var_name" '%s' "$current_value"
}

write_env_file() {
  local env_path="${REPO_ROOT}/.env"

  if [[ -f "$env_path" && "$FORCE_ENV" -ne 1 ]]; then
    log "Keeping existing .env"
    return
  fi

  prompt_if_empty JIRA_BASE_URL "Jira base URL"
  prompt_if_empty JIRA_TOKEN "Jira token" 1

  cat >"$env_path" <<EOF
JIRA_BASE_URL=${JIRA_BASE_URL}
JIRA_TOKEN=${JIRA_TOKEN}
EOF

  chmod 600 "$env_path"
  log "Wrote ${env_path}"
}

run_install_steps() {
  ensure_command node
  ensure_command npm

  if [[ "$SKIP_DEPS" -ne 1 ]]; then
    log "Running npm install"
    (cd "$REPO_ROOT" && npm install)
  fi

  if [[ "$SKIP_BUILD" -ne 1 ]]; then
    log "Running npm run build"
    (cd "$REPO_ROOT" && npm run build)
  fi
}

ensure_built_server() {
  ensure_command node

  if [[ ! -f "${REPO_ROOT}/dist/index.js" ]]; then
    fail "dist/index.js not found. Run '$0' first or build the project."
  fi
}

write_json_config() {
  local target_file="$1"
  local config_type="$2"
  local server_name="$3"
  local script_path="$4"

  mkdir -p "$(dirname "$target_file")"

  TARGET_FILE="$target_file" \
  CONFIG_TYPE="$config_type" \
  SERVER_NAME="$server_name" \
  SCRIPT_PATH="$script_path" \
  node <<'EOF'
const fs = require("fs");
const path = require("path");

const targetFile = process.env.TARGET_FILE;
const configType = process.env.CONFIG_TYPE;
const serverName = process.env.SERVER_NAME;
const scriptPath = process.env.SCRIPT_PATH;

function stripJsonComments(input) {
  let output = "";
  let inString = false;
  let stringChar = "";
  let inLineComment = false;
  let inBlockComment = false;
  let escape = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      stringChar = char;
      output += char;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(input) {
  let output = "";
  let inString = false;
  let stringChar = "";
  let escape = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      output += char;
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      stringChar = char;
      output += char;
      continue;
    }

    if (char === ",") {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) {
        j += 1;
      }
      if (input[j] === "}" || input[j] === "]") {
        continue;
      }
    }

    output += char;
  }

  return output;
}

function readConfig(file) {
  if (!fs.existsSync(file)) {
    return {};
  }

  const raw = fs.readFileSync(file, "utf8").trim();
  if (!raw) {
    return {};
  }

  const normalized = stripTrailingCommas(stripJsonComments(raw));
  return JSON.parse(normalized);
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const config = ensureObject(readConfig(targetFile));

if (configType === "opencode") {
  config.$schema = config.$schema || "https://opencode.ai/config.json";
  config.mcp = ensureObject(config.mcp);
  config.mcp[serverName] = {
    type: "local",
    command: [scriptPath, "serve"],
    enabled: true,
  };
} else {
  config.mcpServers = ensureObject(config.mcpServers);
  config.mcpServers[serverName] = {
    command: scriptPath,
    args: ["serve"],
  };
}

fs.mkdirSync(path.dirname(targetFile), { recursive: true });
fs.writeFileSync(targetFile, `${JSON.stringify(config, null, 2)}\n`);
EOF
}

write_codex_config() {
  local target_file="${HOME}/.codex/config.toml"
  local temp_file
  temp_file="$(mktemp)"

  mkdir -p "$(dirname "$target_file")"
  touch "$target_file"

  awk -v section="[mcp_servers.${SERVER_NAME}]" '
    BEGIN {
      skip = 0
    }
    $0 == section {
      skip = 1
      next
    }
    skip && /^\[/ {
      skip = 0
    }
    !skip {
      print
    }
  ' "$target_file" >"$temp_file"

  {
    cat "$temp_file"
    if [[ -s "$temp_file" ]]; then
      printf '\n'
    fi
    printf '[mcp_servers.%s]\n' "$SERVER_NAME"
    printf 'command = %s\n' "\"${SCRIPT_PATH}\""
    printf 'args = ["serve"]\n'
    printf 'enabled = true\n'
  } >"$target_file"

  rm -f "$temp_file"
  log "Updated ${target_file}"
}

install_codex() {
  write_codex_config
}

install_claude() {
  local target_file="${HOME}/.claude.json"
  write_json_config "$target_file" "claude" "$SERVER_NAME" "$SCRIPT_PATH"
  log "Updated ${target_file}"
}

install_antigravity() {
  local target_file="${HOME}/.gemini/antigravity/mcp_config.json"
  write_json_config "$target_file" "antigravity" "$SERVER_NAME" "$SCRIPT_PATH"
  log "Updated ${target_file}"
}

install_kiro() {
  local target_file="${HOME}/.kiro/settings/mcp.json"
  write_json_config "$target_file" "kiro" "$SERVER_NAME" "$SCRIPT_PATH"
  log "Updated ${target_file}"
}

install_opencode() {
  local target_file="${HOME}/.config/opencode/opencode.json"
  write_json_config "$target_file" "opencode" "$SERVER_NAME" "$SCRIPT_PATH"
  log "Updated ${target_file}"
}

install_clients() {
  local client
  local normalized="${CLIENTS//,/ }"

  for client in $normalized; do
    case "$client" in
      codex) install_codex ;;
      claude) install_claude ;;
      antigravity) install_antigravity ;;
      kiro) install_kiro ;;
      opencode) install_opencode ;;
      "") ;;
      *) fail "Unsupported client: ${client}" ;;
    esac
  done
}

serve_mode() {
  ensure_built_server
  cd "$REPO_ROOT"
  exec node dist/index.js
}

main() {
  local mode="install"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      serve)
        mode="serve"
        shift
        ;;
      --name)
        [[ $# -ge 2 ]] || fail "--name requires a value"
        SERVER_NAME="$2"
        shift 2
        ;;
      --clients)
        [[ $# -ge 2 ]] || fail "--clients requires a value"
        CLIENTS="$2"
        shift 2
        ;;
      --skip-deps)
        SKIP_DEPS=1
        shift
        ;;
      --skip-build)
        SKIP_BUILD=1
        shift
        ;;
      --skip-env)
        SKIP_ENV=1
        shift
        ;;
      --force-env)
        FORCE_ENV=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        fail "Unknown argument: $1"
        ;;
    esac
  done

  if [[ "$mode" == "serve" ]]; then
    serve_mode
    return
  fi

  if [[ "$SKIP_ENV" -ne 1 ]]; then
    write_env_file
  fi

  run_install_steps
  install_clients

  log "Installed '${SERVER_NAME}' into: ${CLIENTS}"
  log "Each client will launch: ${SCRIPT_PATH} serve"
}

main "$@"
