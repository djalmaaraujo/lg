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

# Log an entry
lg "Had a great day today!"
lg log "Learned something new"

# List all entries
lg list
lg  # Shortcut for lg list

# Remove entries
lg rm  # Remove entries from the most recent day
lg rm -d  # Select a date to remove entries from
lg rm -l  # Remove the last entry
```

## Handling Special Characters

When logging entries with special characters like `#`, `!`, `&`, `()`, etc., you **must** use quotes:

```bash
lg "Meeting with Tom at 9am (might be late) #work"
```

This is because shell interpreters like bash and zsh process special characters before passing arguments to the CLI.

### Important Note for zsh Users

If you're using zsh (the default shell on macOS) and experiencing issues with parentheses, you need to add this function to your `~/.zshrc` file:

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

This function will properly handle special characters in zsh.

## Commands

- `setup`: Initialize the CLI
- `log` or `add`: Log a life entry
- `list` or `ls`: List all logged entries
- `remove` or `rm`: Remove log entries

## License

MIT
