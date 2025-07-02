# Contributing to LexOS

Thank you for your interest in contributing to LexOS! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Setup](#development-setup)
5. [Coding Standards](#coding-standards)
6. [Commit Guidelines](#commit-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Testing](#testing)
9. [Documentation](#documentation)
10. [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful**: Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be collaborative**: Work together to resolve conflicts and assume good intentions.
- **Be patient**: Remember that everyone was new once. Help others learn.
- **Be considerate**: Your work affects others. Make decisions with the community in mind.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes
4. **Make your changes** following our guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request**

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**To report a bug:**
1. Use the bug report template
2. Include a clear title and description
3. Provide steps to reproduce
4. Include expected vs actual behavior
5. Add screenshots if applicable
6. List your environment details

### Suggesting Features

We love new ideas! To suggest a feature:

1. Check if it's already suggested
2. Use the feature request template
3. Explain the problem it solves
4. Describe your proposed solution
5. Consider alternatives
6. Add mockups if applicable

### Code Contributions

Types of contributions we're looking for:
- Bug fixes
- New features
- Performance improvements
- Documentation updates
- Test coverage improvements
- UI/UX enhancements

## Development Setup

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+ and pip
- Git
- A code editor (VS Code recommended)

### Local Development

1. **Clone your fork:**
```bash
git clone https://github.com/yourusername/lexos-genesis.git
cd lexos-genesis
```

2. **Install dependencies:**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

3. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development servers:**
```bash
# Start everything
./start-lexos.sh

# Or start individually
npm run dev          # Frontend
cd backend && python app.py  # Backend
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Coding Standards

### JavaScript/TypeScript

We use ESLint and Prettier for code formatting:

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

**Style Guidelines:**
- Use TypeScript for new code
- Prefer functional components in React
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

**Example:**
```typescript
// Good
const calculateTotalPrice = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

// Bad
const calc = (i) => {
  let t = 0;
  for(let x of i) t += x.p * x.q;
  return t;
};
```

### Python

Follow PEP 8 style guide:

```bash
# Check style
flake8 backend/

# Format code
black backend/
```

**Style Guidelines:**
- Use type hints
- Write docstrings for functions
- Keep lines under 80 characters
- Use meaningful names

**Example:**
```python
# Good
def calculate_total_price(items: List[Dict[str, float]]) -> float:
    """Calculate the total price of items in the cart."""
    return sum(item['price'] * item['quantity'] for item in items)

# Bad
def calc(i):
    t = 0
    for x in i:
        t += x['p'] * x['q']
    return t
```

### CSS/Styling

- Use Tailwind CSS utilities
- Create custom components sparingly
- Follow mobile-first design
- Ensure accessibility

## Commit Guidelines

We follow Conventional Commits specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
# Feature
feat(auth): add two-factor authentication

# Bug fix
fix(editor): resolve syntax highlighting for Python

# Documentation
docs(readme): update installation instructions

# Performance
perf(render): optimize virtual DOM updates
```

## Pull Request Process

1. **Update your fork:**
```bash
git checkout main
git pull upstream main
```

2. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes** following coding standards

4. **Write/update tests** for your changes

5. **Update documentation** if needed

6. **Commit your changes** following commit guidelines

7. **Push to your fork:**
```bash
git push origin feature/your-feature-name
```

8. **Create a Pull Request:**
- Use the PR template
- Link related issues
- Describe your changes
- Add screenshots for UI changes
- Request reviews

### PR Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No console errors
- [ ] Responsive design maintained
- [ ] Accessibility considered

## Testing

### Running Tests

```bash
# All tests
npm test

# Frontend tests
npm run test:frontend

# Backend tests
cd backend && python -m pytest

# E2E tests
npm run test:e2e
```

### Writing Tests

**Frontend (Jest/React Testing Library):**
```typescript
describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Backend (pytest):**
```python
def test_api_health_check(client):
    """Test the health check endpoint."""
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'
```

## Documentation

### Types of Documentation

1. **Code Comments**: Explain why, not what
2. **API Documentation**: Use docstrings and OpenAPI
3. **User Documentation**: Guides and tutorials
4. **Developer Documentation**: Architecture and setup

### Documentation Standards

- Write clear, concise documentation
- Include code examples
- Keep documentation up-to-date
- Use proper markdown formatting
- Add diagrams where helpful

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussions
- **Discord**: Real-time chat and support
- **Twitter**: Updates and announcements

### Getting Help

- Check existing documentation
- Search closed issues
- Ask in Discord #help channel
- Create a discussion thread

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor spotlight

## Thank You!

Your contributions make LexOS better for everyone. Whether it's fixing a typo, adding a feature, or helping others, every contribution matters.

Happy coding! 🚀