# Life Logger CLI (lg)

A simple command-line tool for logging daily life events.

## Installation

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
```

## Interactive Mode

The CLI now features an interactive mode that makes logging entries easier, especially when dealing with special characters:

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

The dashboard provides:

- Calendar view showing days with entries
- List of recent entries
- Tag statistics
- Entry statistics
- Quick entry form for adding new logs

Navigate with arrow keys, press Enter to focus on the quick entry form, and Ctrl+S to save a new entry. Press q to quit.

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

## Commands

- `setup`: Initialize the CLI and configure GitHub Gist sync
- `log` or `add`: Log a life entry
- `list` or `ls`: List all logged entries (use `--sync` flag to force full sync)
- `remove` or `rm`: Remove log entries
- `dashboard` or `dash`: Display interactive dashboard

## License

MIT
