# Life Logger CLI (lg)

A simple command-line tool for logging daily life events with cloud synchronization, interactive dashboard, and offline support.

## Features

- 📝 **Simple Logging**: Quickly log your daily activities with a simple command
- 🔄 **Cloud Sync**: Synchronize your logs across devices using GitHub Gists
- 📊 **Interactive Dashboard**: Visualize and manage your logs with a rich terminal UI
- 🔌 **Offline Support**: Work seamlessly without internet connection
- 🔍 **Powerful Search**: Find entries by date, content, or tags
- 🛠️ **Extensible**: Easy to add new features and commands

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/lg.git
cd lg

# Install dependencies
npm install

# Build the project
npm run build

# Link the CLI globally
npm link
```

### For Development

If you're developing the CLI, you can use the included update script to quickly rebuild and relink the tool:

```bash
# After making changes to the code
./update-cli.sh
```

This script will:

1. Build the project with TypeScript
2. Unlink any existing global installation
3. Link the updated package globally

## Usage

```bash
# Initialize the CLI
lg setup

# Interactive Mode (Recommended)
lg  # Directly prompts for a log entry

# Log an entry directly
lg "Had a great day today!"
lg log "Learned something new"

# List all entries
lg list

# Force a full sync with remote storage
lg list --sync

# View interactive dashboard
lg dash

# Enable debug logging
lg debug --enable
```

## Commands

### Core Commands

- `setup`: Initialize the CLI and configure GitHub Gist sync
- `log` or `add`: Log a life entry
- `list` or `ls`: List all logged entries
- `remove` or `rm`: Remove log entries

### Advanced Features

- `dashboard` or `dash`: Display interactive dashboard
- `debug` or `dbg`: Enable or disable debug logging

## Interactive Mode

The CLI features an interactive mode that makes logging entries easier, especially when dealing with special characters:

```bash
$ lg
? Enter your log entry: Meeting with Tom at 9am (might be late) #work
```

This interactive mode automatically handles special characters without requiring quotes or escaping.

## Dashboard

The CLI includes a rich interactive dashboard for visualizing and managing your log entries:

```bash
$ lg dash
```

### Dashboard Features

- **Calendar View**: Shows days with entries highlighted
- **Recent Entries**: Lists your most recent log entries
- **Tag Statistics**: Shows most frequently used tags
- **Entry Statistics**: Displays metrics about your logging habits
- **Quick Entry Form**: Add new entries directly from the dashboard

### Dashboard Navigation

- Use arrow keys to navigate between panels
- Press 'e' to focus on entries panel
- Press 'i' to focus on input panel
- Press ENTER when in input panel to start editing
- Press ESC to exit editing mode
- Press Ctrl+S to save a new entry
- Press q to quit the dashboard

## GitHub Gist Synchronization

Life Logger CLI supports synchronizing your entries across multiple devices using GitHub Gists:

```bash
# Set up GitHub Gist sync during initial setup
lg setup

# Or add Gist sync to an existing installation
lg setup
```

### Setting Up Gist Sync

1. You'll need a GitHub Personal Access Token with the "gist" scope
2. Create one at: https://github.com/settings/tokens
3. When prompted during setup, choose "yes" to set up GitHub Gist synchronization
4. Paste your GitHub Personal Access Token when prompted

### How Sync Works

- Every time you add or remove entries, they are automatically synced with your GitHub Gist in the background
- Sync happens without blocking your commands - you can continue using the CLI even without internet
- If you use Life Logger on multiple devices with the same GitHub account, your entries will be synchronized
- When setting up a new device, if the Gist already contains entries, they will be imported automatically

### Offline Support

Life Logger works seamlessly offline:

- All operations work locally without requiring an internet connection
- When you're offline, changes are stored locally
- When internet becomes available, background sync will automatically update the remote storage
- Use `lg list --sync` to force a full sync with remote storage when you're back online

### Benefits of Gist Sync

- **Backup**: Your entries are safely stored in your GitHub account
- **Multi-device**: Access and update your logs from any device
- **Private**: Gists are created as private by default
- **Seamless**: Sync happens automatically in the background
- **Offline-first**: Works without internet, syncs when connection is available

## Debug Logging

The debug command allows you to control the verbosity of the CLI's logging:

```bash
# Show current debug status
lg debug

# Enable debug logging
lg debug --enable

# Disable debug logging
lg debug --disable

# Show current debug status
lg debug --status
```

When debug logging is enabled, you'll see detailed information about operations like GitHub Gist synchronization, file operations, and more. This can be helpful for troubleshooting issues or understanding how the CLI works internally.

## Handling Special Characters

When logging entries directly (non-interactive mode) with special characters like `#`, `!`, `&`, `()`, etc., you **must** use quotes:

```bash
lg "Meeting with Tom at 9am (might be late) #work"
```

This is because shell interpreters like bash and zsh process special characters before passing arguments to the CLI.

For the easiest experience with special characters, use the interactive mode by simply typing `lg` without arguments.

### Important Note for zsh Users

If you're using zsh (the default shell on macOS) and experiencing issues with parentheses, you can either:

1. Use the interactive mode by typing `lg` without arguments (recommended)
2. Use quotes around your entry: `lg "Your entry with (special) characters"`
3. Add this function to your `~/.zshrc` file:

```bash
# Add this to your ~/.zshrc file
function lgl() {
  if [ $# -eq 0 ]; then
    lg
  else
    lg log "${(j: :)@}"
  fi
}
```

Then source your `.zshrc` file:

```bash
source ~/.zshrc
```

Now you can use `lgl` for logging entries with special characters:

```bash
lgl Meeting with Tom at 9am (might be late) #work
```

## Development

### Project Structure

```
lg/
├── src/                    # Source code
│   ├── index.ts            # Entry point
│   ├── commands/           # Command implementations
│   │   ├── index.ts        # Commands registry
│   │   └── [command].ts    # Individual command files
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Logging utilities
│   │   ├── gistSync.ts     # GitHub Gist synchronization
│   │   └── ...
│   └── types/              # TypeScript type definitions
├── dist/                   # Compiled JavaScript (generated)
├── update-cli.sh           # Development utility script
├── package.json            # Project metadata and dependencies
└── README.md               # Project documentation
```

### Adding a New Command

1. Create a new file in `src/commands/` (e.g., `mycommand.ts`)
2. Implement the Command interface
3. Register the command in `src/commands/index.ts`
4. Run `./update-cli.sh` to build and link the updated CLI

### Deployment

To package the CLI for distribution:

```bash
# Build the project
npm run build

# Create a tarball
npm pack

# The resulting .tgz file can be installed globally with:
npm install -g lg-0.1.0.tgz
```

For publishing to npm:

```bash
# Build the project
npm run build

# Publish to npm (requires npm account)
npm publish
```

## License

MIT
