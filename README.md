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
```

## Interactive Mode

The CLI now features an interactive mode that makes logging entries easier, especially when dealing with special characters:

```bash
$ lg
? Enter your log entry: Meeting with Tom at 9am (might be late) #work
```

This interactive mode automatically handles special characters without requiring quotes or escaping.

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

- `setup`: Initialize the CLI
- `log` or `add`: Log a life entry
- `list` or `ls`: List all logged entries
- `remove` or `rm`: Remove log entries

## License

MIT
