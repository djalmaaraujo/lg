# Contributing to lg

Thank you for considering contributing to lg! This document outlines the guidelines and processes for contributing to this project.

## Development Process

1. **Fork the Repository**
   - Fork the repository to your GitHub account
   - Clone your fork locally

2. **Set Up Development Environment**
   - Install dependencies: `npm install`
   - Ensure tests pass: `npm test`

3. **Create a Feature Branch**
   - Create a branch for your feature: `git checkout -b feature/your-feature-name`
   - Keep branch names descriptive and prefixed with `feature/`, `bugfix/`, or `docs/`

4. **Development Guidelines**
   - Follow the code style defined in ESLint and Prettier configurations
   - Write tests for new functionality
   - Keep commits small and focused
   - Use descriptive commit messages

5. **Testing**
   - Run tests before submitting: `npm test`
   - Ensure all tests pass
   - Add new tests for new functionality

6. **Submit a Pull Request**
   - Push your changes to your fork
   - Submit a pull request to the main repository
   - Describe your changes in detail
   - Reference any related issues

## Code Style

- Follow the ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments to functions and classes
- Keep files under 200 lines
- Follow the project structure outlined in the README

## Commit Messages

Write clear, descriptive commit messages:

```
feat: Add new command for logging

- Implement log command with timestamp options
- Add tests for log command
- Update documentation
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the documentation if needed
3. The PR should work in all supported Node.js versions
4. PRs require review before merging

## Code of Conduct

- Be respectful and inclusive
- Value constructive feedback
- Focus on the best outcome for the project

Thank you for contributing! 