.PHONY: build publish install start stop restart status logs setup

# Build web + server together
build:
	cd server && npm run build:all

# Publish to npm (requires npm login + OTP)
publish:
	cd server && npm version patch --no-git-tag-version && npm publish

# Install globally from local build
install: build
	cd server && npm install -g .

# systemd service management
start:
	systemctl --user start orc-server

stop:
	systemctl --user stop orc-server

restart:
	systemctl --user restart orc-server

status:
	systemctl --user status orc-server

logs:
	journalctl --user -u orc-server -f

# Install systemd service + enable on boot
setup:
	mkdir -p ~/.config/systemd/user
	cp server/orc-server.service ~/.config/systemd/user/
	systemctl --user daemon-reload
	systemctl --user enable orc-server

# Build, install globally, restart service
deploy: install
	systemctl --user restart orc-server
