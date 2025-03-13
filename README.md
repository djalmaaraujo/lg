# lg - Command Line Tool

A powerful CLI tool built with TypeScript and Node.js.

## Project Guidelines

### Code Structure
- **src/**: Contains all source code
  - **commands/**: Individual command implementations
  - **utils/**: Utility functions and helpers
  - **types/**: TypeScript type definitions
  - **config/**: Configuration files and constants
- **tests/**: Test files mirroring the src structure
- **dist/**: Compiled JavaScript (generated)

### Development Principles
1. **Clean, Simple, Readable Code**
   - Use descriptive variable and function names
   - Keep functions small and focused on a single responsibility
   - Limit file size to under 200 lines
   - Use consistent formatting and style

2. **Modular Architecture**
   - Each command should be in its own file
   - Shared functionality should be extracted to utility modules
   - Use dependency injection where appropriate

3. **Testing**
   - Write tests for all commands and utilities
   - Test after every meaningful change
   - Aim for high test coverage

4. **Documentation**
   - Add JSDoc comments to all functions and classes
   - Keep comments up-to-date with code changes
   - Document complex logic with inline comments
   - Update README with new features and usage examples

5. **Error Handling**
   - Provide clear, user-friendly error messages
   - Handle edge cases gracefully
   - Log errors appropriately for debugging

6. **Version Control**
   - Write meaningful commit messages
   - Create feature branches for new functionality
   - Review code before merging

### Coding Standards
- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Prefer async/await over callbacks and promise chains
- Use functional programming patterns where appropriate
- Avoid any usage

## Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the project
npm run build

# Run tests
npm test
```

## License

ISC 