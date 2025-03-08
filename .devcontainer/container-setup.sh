#!/bin/bash

# Set up error logging
LOG_FILE="$HOME/container_setup.log"
ERROR_LOG="$HOME/container_setup_errors.log"
NODE_VERSION="22"

# Create log function
log() {
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

error_log() {
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] ERROR: $1" | tee -a "$ERROR_LOG" >&2
}

# Make directory for logs first
mkdir -p "$HOME/logs" 2>/dev/null

# Initialize log files
: >"$LOG_FILE"
: >"$ERROR_LOG"

log "Starting container setup"

# Function to run commands with error handling and retries
run_cmd() {
    local cmd="$1"
    local desc="$2"
    local critical="$3"     # set to "true" for commands that should stop execution on failure
    local retries="${4:-1}" # Default to 1 attempt (no retries)

    local attempt=1
    local success=false

    while [ $attempt -le "$retries" ] && [ "$success" = "false" ]; do
        log "Running: $desc (attempt $attempt of $retries)"
        eval "$cmd" >>"$LOG_FILE" 2>>"$ERROR_LOG"
        local status=$?

        if [ $status -eq 0 ]; then
            log "Success: $desc"
            success=true
            break
        else
            error_log "Failed: $desc (exit code: $status) (attempt $attempt of $retries)"
            if [ $attempt -lt "$retries" ]; then
                log "Retrying in 5 seconds..."
                sleep 5
            fi
        fi

        attempt=$((attempt + 1))
    done

    if [ "$success" = "false" ] && [ "$critical" = "true" ]; then
        error_log "Critical failure in: $desc, stopping execution"
        return 1
    elif [ "$success" = "false" ]; then
        log "Continuing despite failure in: $desc"
    fi

    return "$([ "$success" = "true" ] && echo 0 || echo 1)"
}

# Update and install packages
log "Adding nameservers to resolve.conf"
{
    echo "nameserver 1.1.1.2" | sudo tee /etc/resolv.conf >/dev/null
    echo "nameserver 1.0.0.2" | sudo tee -a /etc/resolv.conf >/dev/null
    echo "nameserver 103.247.36.36" | sudo tee -a /etc/resolv.conf >/dev/null
    echo "nameserver 103.247.37.37" | sudo tee -a /etc/resolv.conf >/dev/null
    echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf >/dev/null # Added Google DNS as backup
    echo "options attempts:5" | sudo tee -a /etc/resolv.conf >/dev/null # Increased attempts
    echo "options timeout:8" | sudo tee -a /etc/resolv.conf >/dev/null  # Increased timeout
} >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to set up DNS servers"

cat /etc/resolv.conf >>"$LOG_FILE"

cd /workspaces/PlainLicense || {
    error_log "Failed to change to project directory"
    cd "$HOME" || exit 1
}

run_cmd "sudo sh -c 'DEBIAN_FRONTEND=noninteractive'" "Setting DEBIAN_FRONTEND" "false"

# Install packages with retry logic for apt
apt_install_with_retry() {
    local max_attempts=5 # Increased from 3
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log "Apt install attempt $attempt/$max_attempts"

        # Added timeout and retry flags to apt commands
        # shellcheck disable=SC2024 # Don't need sudo for logging
        if sudo timeout 300s apt update -o Acquire::Retries=3 >>"$LOG_FILE" 2>>"$ERROR_LOG" &&
            sudo timeout 600s apt upgrade -y -o Acquire::Retries=3 >>"$LOG_FILE" 2>>"$ERROR_LOG" &&
            sudo timeout 900s apt install -y --no-install-recommends -o Acquire::Retries=3 \
                bash cmake cmake-data cmake-extras extra-cmake-modules curl \
                fontconfig fonts-powerline git git-doc gnupg2 gpg libcairo2 \
                libcairo2-dev libffi-dev libfreetype6-dev libgdm-dev libjpeg-dev \
                libpng-dev libreadline-dev librust-cmake-dev libssl-dev libz-dev \
                nano ncurses-base ncurses-bin openssl pngquant python3 python3-dev \
                readline-common shellcheck sqlite3 unzip xclip xterm xdg-utils \
                flatpak-xdg-utils zlib1g zlib1g-dev zsh zsh-autosuggestions \
                zsh-syntax-highlighting >>"$LOG_FILE" 2>>"$ERROR_LOG"; then
            log "Package installation successful"
            return 0
        else
            error_log "Package installation failed on attempt $attempt"
            sleep 10 # Increased from 5
        fi

        attempt=$((attempt + 1))
    done

    error_log "Package installation failed after $max_attempts attempts"
    return 1
}

# Run apt install with retry
apt_install_with_retry

# Source environment files safely
re_source() {
    if [ -f "$HOME/.zshrc" ]; then
        log "Found .zshrc file but will not source it from bash"
    fi
    if [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc" 2>>"$ERROR_LOG" || error_log "Failed to source .bashrc"
    fi
    if [ -f "$HOME/.cargo/env" ]; then
        source "$HOME/.cargo/env" 2>>"$ERROR_LOG" || error_log "Failed to source cargo env"
    fi
    if [ -d "$FNM_DIR" ]; then
        export PATH="$FNM_DIR:$PATH"
        eval "$(fnm env)"
    fi
}

initial_installs() {
    log "Starting initial installations"
    export DEBIAN_FRONTEND=noninteractive
    export BUN_INSTALL="$HOME/.bun"
    export UV_PYTHON_DOWNLOADS="automatic"

    # Install fnm with retry and fallback
    log "Installing fnm"
    run_cmd "curl -fsSL https://fnm.vercel.app/install | bash" "Installing fnm" "false" 3 &&

        # Install Node.js directly as fallback if fnm fails
        re_source
    local FNM_PATH="$HOME/.local/share/fnm"
    if [ -d "$FNM_PATH" ]; then
        export PATH="$FNM_PATH:$PATH"
        export FNM_DIR="$FNM_PATH"
        log "fnm is successfully installed, setting Node.js version"
        run_cmd "$FNM_PATH/fnm install $NODE_VERSION" "Installing Node.js via fnm" "false" 3 &&
        run_cmd "$FNM_PATH/fnm use $NODE_VERSION" "Setting Node.js version to $NODE_VERSION" "false" 3
    else
        error_log "fnm not found at $FNM_PATH/fnm, proceeding with Node.js installation"
        log "fnm not installed successfully, trying alternative Node.js installation"
        run_cmd "curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | sudo -E bash -" "Adding NodeSource repository" "false" 3 ||
            run_cmd "sudo apt-get install -y nodejs" "Installing Node.js via apt" "false" 3 &&
            log "Node.js installation completed via apt"
    fi

    if command -v node >/dev/null 2>&1; then
        log "Node.js installation verified"
        node --version >>"$LOG_FILE" 2>>"$ERROR_LOG"
    else
        error_log "Node.js installation failed after setting version"
    fi

    # Install bun with retry
    log "Installing bun"
    run_cmd "curl -fsSL https://bun.sh/install | bash" "Installing bun" "false" 3 &&

        # Install rustup with retry
        log "Installing rustup"
    run_cmd "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y" "Installing rustup" "false" 3 &&

        # Source cargo environment
        if [ -f "$HOME/.cargo/env" ]; then
            source "$HOME/.cargo/env" 2>>"$ERROR_LOG"
        else
            error_log "Cargo env file not found"
        fi

    # Update PATH
    export PATH="$HOME/bin:$HOME/sbin:$HOME/.local/sbin:$HOME/.bun/bin:$HOME/.cargo/bin:$PATH:/opt/bin:/opt/sbin:/opt/local/bin:opt/local/sbin"

    # Set up fonts
    mkdir -p "$HOME/.fonts" 2>>"$ERROR_LOG" || error_log "Failed to create fonts directory"
    echo 'xterm*faceName: MesloLGS NF' >"$HOME/.Xresources" 2>>"$ERROR_LOG" || error_log "Failed to create .Xresources"

    if [ -d "/workspaces/PlainLicense/.devcontainer/.fonts" ]; then
        cp -r /workspaces/PlainLicense/.devcontainer/.fonts "$HOME" 2>>"$ERROR_LOG" || error_log "Failed to copy fonts"
    else
        error_log "Fonts directory not found"
    fi

    fc-cache -vf "$HOME/.fonts" >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to refresh font cache"

    # Install oh-my-zsh themes if needed - don't try to use it yet
    if [ ! -d "$HOME/.oh-my-zsh/custom/themes/powerlevel10k" ]; then
        log "Installing powerlevel10k theme"
        mkdir -p "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes" 2>>"$ERROR_LOG" || error_log "Failed to create oh-my-zsh themes directory"
        run_cmd "git clone --depth=1 https://gitee.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k" "Installing powerlevel10k" "false" 3
    fi

    if [ -f "$HOME/.zshrc" ]; then
        log "Sourcing .zshrc"
        source "$HOME/.zshrc" 2>>"$ERROR_LOG" || error_log "Failed to source .zshrc"
    fi

    # Return to project directory
    cd /workspaces/PlainLicense || {
        error_log "Failed to change back to project directory"
        return 1
    }

    log "Initial installations completed"
}

setup_node() {
    log "Setting up Node environment"
    re_source
    local fnmloc="${FNM_PATH:-$HOME/.local/share/fnm}/fnm"


    if [ ! -f "$fnmloc" ]; then
        error_log "fnm not found at $fnmloc, checking if Node.js is available via other methods"
        if command -v node >/dev/null 2>&1; then
            log "Node.js is already available via alternative installation"
            node --version >>"$LOG_FILE" 2>>"$ERROR_LOG"
            return 0
        else
            error_log "No Node.js installation found"
            return 1
        fi
    fi

    log "Installing Node $NODE_VERSION via fnm"
    run_cmd "$fnmloc install $NODE_VERSION" "Installing Node $NODE_VERSION" "false" 3

    log "Setting Node $NODE_VERSION as default"
    run_cmd "$fnmloc use $NODE_VERSION" "Setting Node $NODE_VERSION as default" "false" 3

    log "Node setup complete"
}

set_configs() {
    log "Setting up configurations"
    export bash_completion="$HOME/.local/share/bash-completion/completions"

    # Define configuration files
    ZSHRC="/workspaces/PlainLicense/.devcontainer/.zshrc"
    BASHRC="/workspaces/PlainLicense/.devcontainer/.bashrc"
    P10K="/workspaces/PlainLicense/.devcontainer/.p10k.zsh"
    LOLCATE_CONFIG="/workspaces/PlainLicense/.devcontainer/lolcate_config.toml"
    LOLCATE_IGNORES="/workspaces/PlainLicense/.devcontainer/lolcate_ignores"

    log "Setting configurations for zsh, powerlevel10k, bash, and completions"

    # Copy configuration files (in background but log errors)
    if [ -f "$ZSHRC" ]; then
        cat "$ZSHRC" >"$HOME/.zshrc" 2>>"$ERROR_LOG" || error_log "Failed to copy .zshrc"
    else
        error_log "ZSHRC file not found: $ZSHRC"
    fi

    if [ -f "$BASHRC" ]; then
        cat "$BASHRC" >"$HOME/.bashrc" 2>>"$ERROR_LOG" || error_log "Failed to copy .bashrc"
    else
        error_log "BASHRC file not found: $BASHRC"
    fi

    if [ -f "$P10K" ]; then
        cat "$P10K" >"$HOME/.p10k.zsh" 2>>"$ERROR_LOG" || error_log "Failed to copy .p10k.zsh"
    else
        error_log "P10K file not found: $P10K"
    fi

    # Set up lolcate config
    mkdir -p "$HOME/.config/lolcate/default" 2>>"$ERROR_LOG" || error_log "Failed to create lolcate directory"

    if [ -f "$LOLCATE_CONFIG" ]; then
        cat "$LOLCATE_CONFIG" >"$HOME/.config/lolcate/default/config.toml" 2>>"$ERROR_LOG" || error_log "Failed to copy lolcate config"
    else
        error_log "LOLCATE_CONFIG file not found: $LOLCATE_CONFIG"
    fi

    if [ -f "$LOLCATE_IGNORES" ]; then
        cat "$LOLCATE_IGNORES" >"$HOME/.config/lolcate/default/ignores" 2>>"$ERROR_LOG" || error_log "Failed to copy lolcate ignores"
    else
        error_log "LOLCATE_IGNORES file not found: $LOLCATE_IGNORES"
    fi

    # Create directories
    mkdir -p "$bash_completion" 2>>"$ERROR_LOG" || error_log "Failed to create bash_completion directory"
    unalias ll 2>>"$ERROR_LOG" || true # Non-critical, continue if fails
    mkdir -p "$HOME/.zfunc" 2>>"$ERROR_LOG" || error_log "Failed to create .zfunc directory"
    mkdir -p "$HOME/logs" 2>>"$ERROR_LOG" || error_log "Failed to create logs directory"
    mkdir -p /workspaces/PlainLicense/.workbench 2>>"$ERROR_LOG" || error_log "Failed to create .workbench directory"

    # Create symlink if it doesn't exist
    if [ ! -L "/workspaces/PlainLicense/.workbench/logs" ]; then
        ln -s "$HOME/logs" "/workspaces/PlainLicense/.workbench/logs" 2>>"$ERROR_LOG" || error_log "Failed to create logs symlink"
    fi

    # Set up cron job for lolcate
    echo "lolcate --update > /dev/null 2>&1 &" | sudo tee /etc/cron.daily/lolcate >/dev/null 2>>"$ERROR_LOG" || error_log "Failed to create lolcate cron job"
    sudo chmod +x /etc/cron.daily/lolcate 2>>"$ERROR_LOG" || error_log "Failed to make lolcate cron job executable"

    # Make oh-my-zsh executable
    if [ -f "$HOME/.oh-my-zsh/oh-my-zsh.sh" ]; then
        chmod +x "$HOME/.oh-my-zsh/oh-my-zsh.sh" 2>>"$ERROR_LOG" || error_log "Failed to make oh-my-zsh.sh executable"
    else
        error_log "oh-my-zsh.sh file not found"
    fi

    touch "$HOME/.source_zshrc" 2>>"$ERROR_LOG" || error_log "Failed to create .source_zshrc"

    # Setup GPG
    mkdir -p "$HOME/.gnupg" 2>>"$ERROR_LOG" || error_log "Failed to create .gnupg directory"

    # Fixed the heredoc syntax - this was likely the cause of your EOF error
    cat >"$HOME/.gnupg/gpg-agent.conf" <<'EOF'
enable-ssh-support
default-cache-ttl 1200
max-cache-ttl 7200
pinentry-program /usr/bin/pinentry-curses
EOF

    # Handling any error with the gpg commands gracefully
    gpgconf --kill gpg-agent >>"$LOG_FILE" 2>>"$ERROR_LOG" || true
    # shellcheck disable=SC2024 # Don't need sudo for logging
    sudo killall gpg-agent >>"$LOG_FILE" 2>>"$ERROR_LOG" || true

    log "Configurations have been set"
    re_source
}

install_rust_helpers() {
    log "Setting up Rust helpers"
    re_source

    # Install ripgrep
    log "Installing ripgrep"
    cargo install --all-features ripgrep >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install ripgrep"

    # Install typos-cli (non-critical)
    log "Installing typos-cli"
    cargo install typos-cli >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install typos-cli"

    # Install lolcate
    log "Installing lolcate"
    cargo install --git https://github.com/ngirard/lolcate-rs >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install lolcate"

    # Install cargo-update
    log "Installing cargo-update"
    cargo install cargo-update >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install cargo-update"

    log "Rust helpers setup complete"
}

install_uv() {
    log "Setting up Python environment"
    export UV_PYTHON_DOWNLOADS="automatic"
    local located_uv uvloc
    located_uv="$(command -v uv)"
    uvloc=${located_uv:-/usr/local/bin/uv}
    re_source

    if [ ! -f "$uvloc" ]; then
        error_log "uv not found at $uvloc"
        return 1
    fi

    # Install Python
    log "Installing Python 3.13"
    $uvloc python install 3.13 >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install Python 3.13"

    # Create virtual environment
    log "Creating virtual environment"
    $uvloc venv --allow-existing .venv >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to create virtual environment"

    # Install tools (non-critical)
    log "Installing Python tools"
    $uvloc tool install ipython -q >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install ipython"
    $uvloc tool install ruff -q >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install ruff"
    $uvloc tool install pre-commit -q >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install pre-commit"

    # Activate virtual environment
    if [ -f "/workspaces/PlainLicense/.venv/bin/activate" ]; then
        source /workspaces/PlainLicense/.venv/bin/activate 2>>"$ERROR_LOG" || error_log "Failed to activate virtual environment"
        $uvloc sync --all-extras >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to sync dependencies"
    else
        error_log "Virtual environment activation file not found"
    fi

    log "Python environment setup complete"
}

install_bun() {
    log "Setting up TypeScript environment"
    export BUNOPTS="--no-interactive --silent"
    local bunloc
    local found_bun
    found_bun="$(command -v bun)"
    bunloc=${found_bun:-/home/vscode/.bun/bin/bun}
    re_source

    if [ ! -f "$bunloc" ]; then
        error_log "bun not found at $bunloc"
        return 1
    fi

    # Install project dependencies
    log "Installing project dependencies with bun"
    $bunloc install "${BUNOPTS}" >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install project dependencies"

    # Install global tools
    log "Installing global TypeScript tools"
    $bunloc install -g "${BUNOPTS}" @linthtml/linthtml stylelint eslint prettier semantic-release-cli markdownlint-cli2 commitizen commitlint node typescript npm ts-node >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to install global TypeScript tools"

    log "TypeScript environment setup complete"
}

set_completions() {
    log "Setting up shell completions"
    re_source

    # Rustup completions for zsh
    if [ -f "$HOME/.cargo/bin/rustup" ]; then
        "$HOME"/.cargo/bin/rustup completions zsh >"$HOME/.zfunc/_rustup" 2>>"$ERROR_LOG" || error_log "Failed to set up rustup zsh completion"
        "$HOME"/.cargo/bin/rustup completions bash >"$bash_completion/rustup" 2>>"$ERROR_LOG" || error_log "Failed to set up rustup bash completion"
    else
        error_log "rustup not found"
    fi

    # Cargo completions
    if [ -f "$HOME/.cargo/bin/rustup" ]; then
        "$HOME"/.cargo/bin/rustup completions zsh cargo >"$HOME/.zfunc/_cargo" 2>>"$ERROR_LOG" || error_log "Failed to set up cargo zsh completion"
        "$HOME"/.cargo/bin/rustup completions bash cargo >"$bash_completion/cargo" 2>>"$ERROR_LOG" || error_log "Failed to set up cargo bash completion"
    fi

    # Ripgrep completions
    if [ -f "$HOME/.cargo/bin/rg" ]; then
        "$HOME"/.cargo/bin/rg --generate=complete-zsh >"$HOME/.zfunc/_rg" 2>>"$ERROR_LOG" || error_log "Failed to set up rg zsh completion"
        "$HOME"/.cargo/bin/rg --generate=complete-bash >"$bash_completion/rg" 2>>"$ERROR_LOG" || error_log "Failed to set up rg bash completion"
    else
        error_log "ripgrep not found"
    fi

    log "Shell completions setup complete"
}

# Run the setup steps - use "|| true" to continue even if a step fails
log "==== Starting main setup process ===="

run_initial="true"
run_node="true"
run_rust="true"
run_config="true"
run_completion="true"
run_uv="true"
run_bun="true"

# Run each step independently to prevent one failure from stopping everything
if [ "$run_initial" = "true" ]; then
    initial_installs || error_log "Initial installations step failed but continuing"
fi
if [ "$run_config" = "true" ]; then
    set_configs || error_log "Configurations setup step failed but continuing"
fi
if [ "$run_node" = "true" ]; then
    setup_node || error_log "Node setup step failed but continuing"
fi
if [ "$run_rust" = "true" ]; then
    install_rust_helpers || error_log "Rust helpers setup step failed but continuing"
fi
if [ "$run_uv" = "true" ]; then
    install_uv || error_log "Python environment setup step failed but continuing"
fi
if [ "$run_bun" = "true" ]; then
    install_bun || error_log "TypeScript environment setup step failed but continuing"
fi
if [ "$run_completion" = "true" ]; then
    set_completions || error_log "Completions setup step failed but continuing"
fi

# Change shell to zsh
log "Changing default shell to zsh"
# shellcheck disable=SC2024 # Don't need sudo for logging
sudo chsh -s /bin/zsh vscode >>"$LOG_FILE" 2>>"$ERROR_LOG" || error_log "Failed to change default shell"
omzsh="$HOME/.oh-my-zsh/oh-my-zsh.sh"
echo '#!/usr/bin/env zsh' >temp_omz
cat "$omzsh" >>temp_omz
mv temp_omz "$omzsh"
chmod +x "$omzsh"
re_source
# Open a new terminal
log "Opening a new terminal"
# This command might not work in all contexts - try several methods
# Replace the problematic terminal opening code with this:
log "Opening a new terminal"
# Use VS Code's built-in command to open a terminal through the API
if command -v code >/dev/null 2>&1; then
    code --remote "wsl+default" --wait --command "workbench.action.terminal.new" >>"$LOG_FILE" 2>>"$ERROR_LOG" || \
    error_log "Automatic terminal launch via VS Code API failed. This may occur in non-GUI environments or because I didn't handle forwarding correctly. Please open a new terminal manually to apply all changes."
else
    log "==== Container setup completed ===="
    echo ""
    echo "=========================================="
    echo "    Setup complete! 🎉"
    echo "    Please open a new terminal manually for"
    echo "    all changes to take effect."
    echo "=========================================="
    echo ""
fi
