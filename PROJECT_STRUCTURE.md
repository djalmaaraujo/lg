# lg Project Structure

This document outlines the architecture and organization of the lg CLI tool.

## Directory Structure

```
lg/
├── src/                    # Source code
│   ├── index.ts            # Entry point
│   ├── commands/           # Command implementations
│   │   ├── index.ts        # Commands registry
│   │   └── [command].ts    # Individual command files
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Logging utilities
│   │   ├── config.ts       # Configuration management
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   │   ├── index.ts        # Type exports
│   │   └── ...
│   └── config/             # Configuration files
│       └── defaults.ts     # Default configuration
├── tests/                  # Test files
│   ├── commands/           # Command tests
│   ├── utils/              # Utility tests
│   └── ...
├── dist/                   # Compiled JavaScript (generated)
├── node_modules/           # Dependencies (generated)
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
└── CONTRIBUTING.md         # Contribution guidelines
```

## Architecture

The lg CLI tool follows a modular architecture:

1. **Entry Point (src/index.ts)**
   - Parses command-line arguments
   - Routes to appropriate command handlers
   - Sets up global error handling

2. **Command Pattern**
   - Each command is implemented in its own file
   - Commands are registered in a central registry
   - Commands follow a consistent interface

3. **Configuration Management**
   - User settings stored in appropriate OS locations
   - Default configuration provided
   - Configuration can be overridden via command line flags

4. **Utility Modules**
   - Shared functionality extracted to utility modules
   - Logging, error handling, and other common tasks

5. **Type System**
   - Strong typing throughout the application
   - Shared interfaces and types in dedicated files

## Data Flow

1. User inputs command: `lg [command] [options]`
2. Entry point parses arguments using Commander.js
3. Command handler is identified and executed
4. Command performs its task, using utilities as needed
5. Results are displayed to the user

## Testing Strategy

- Unit tests for individual functions and commands
- Integration tests for command workflows
- Mock external dependencies for consistent testing

## Extensibility

New commands can be added by:
1. Creating a new file in the commands directory
2. Implementing the command interface
3. Registering the command in the commands registry
4. Adding tests for the new command 