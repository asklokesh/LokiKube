# Contributing to LokiKube

Thank you for your interest in contributing to LokiKube! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/asklokesh/lokikube.git
   cd lokikube
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

## Project Structure

- `src/components/` - React components
- `src/pages/` - Next.js pages and API routes
- `src/services/` - Core services for Kubernetes interaction
- `src/utils/` - Utility functions
- `src/store/` - Zustand state management
- `src/styles/` - Global styles

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Write tests for new features
- Document your code with comments

## Pull Request Process

1. Create a new branch from `main` for your feature or fix
2. Make your changes and commit with clear messages
3. Push to your fork and submit a pull request
4. Ensure your PR includes:
   - A clear description of the changes
   - Any relevant issue numbers
   - Screenshots for UI changes

## Testing

Before submitting a PR, make sure to:

1. Test your changes with multiple Kubernetes clusters
2. Test with different cloud providers if applicable
3. Ensure no console errors or warnings appear

## Adding New Features

When adding new features:

1. Consider backward compatibility
2. Document the feature in the appropriate places
3. Update tests to cover the new functionality
4. Update README.md if necessary

## Reporting Bugs

When reporting bugs, please include:

1. Your operating system and browser
2. Steps to reproduce the issue
3. Expected vs. actual behavior
4. Any error messages (with sensitive information redacted)

## License

By contributing to LokiKube, you agree that your contributions will be licensed under the project's MIT license. 