# LexOS - Next-Generation Cloud Desktop

<div align="center">
  <img src="public/lexos-logo.png" alt="LexOS" width="200"/>
  
  **A Modern Cloud-Based Desktop Environment**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
  [![Python](https://img.shields.io/badge/python-%3E%3D3.8-blue.svg)](https://python.org)
  [![React](https://img.shields.io/badge/react-18.x-61dafb.svg)](https://reactjs.org)
</div>

## Overview

LexOS is a revolutionary cloud-based desktop environment that brings the power of a full operating system to your web browser. With its intuitive interface, powerful applications, and seamless integration, LexOS provides a complete computing experience accessible from anywhere.

### Key Features

- **Full Desktop Environment**: Complete with taskbar, start menu, and window management
- **Built-in Applications**: Text editor, terminal, file manager, and more
- **Real-time Collaboration**: Share your desktop and work together in real-time
- **Cloud Storage**: All your files are safely stored and accessible from anywhere
- **Cross-Platform**: Works on any device with a modern web browser
- **Extensible**: Easy to add new applications and features
- **Secure**: End-to-end encryption and secure authentication

## Screenshots

<div align="center">
  <img src="docs/screenshots/desktop.png" alt="LexOS Desktop" width="800"/>
  <p><em>LexOS Desktop Interface</em></p>
</div>

<div align="center">
  <img src="docs/screenshots/applications.png" alt="LexOS Applications" width="800"/>
  <p><em>Built-in Applications</em></p>
</div>

## Quick Start

### One-Click Installation and Startup

```bash
# Clone the repository
git clone https://github.com/yourusername/lexos-genesis.git
cd lexos-genesis

# Make the startup script executable
chmod +x start-lexos.sh

# Start LexOS with a single command
./start-lexos.sh
```

That's it! LexOS will automatically:
- Check system requirements
- Install all dependencies
- Start all services
- Open your browser to the LexOS desktop

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         LexOS Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Browser   │    │   Frontend  │    │   Backend   │    │
│  │             │◄──►│   (React)   │◄──►│  (Python)   │    │
│  │             │    │             │    │             │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│         │                   │                   │           │
│         │                   │                   │           │
│  ┌─────────────────────────────────────────────┴───┐       │
│  │                    API Gateway                   │       │
│  └─────────────────────────────────────────────────┘       │
│                            │                                │
│  ┌──────────┬──────────┬──────────┬──────────┐           │
│  │   File   │   Auth   │   Apps   │  System  │           │
│  │  System  │  Service │  Manager │  Monitor │           │
│  └──────────┴──────────┴──────────┴──────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features in Detail

### Desktop Environment
- **Modern UI**: Clean, intuitive interface inspired by modern operating systems
- **Window Management**: Drag, resize, minimize, maximize, and close windows
- **Taskbar**: Quick access to running applications and system tray
- **Start Menu**: Launch applications and access system settings
- **Desktop Icons**: Shortcuts to frequently used applications and files

### Built-in Applications
- **Text Editor**: Full-featured editor with syntax highlighting
- **Terminal**: Powerful command-line interface
- **File Manager**: Browse, organize, and manage your files
- **Image Viewer**: View and edit images
- **Calculator**: Scientific calculator with advanced functions
- **Settings**: Customize your desktop experience

### Cloud Features
- **Cloud Storage**: All files are automatically synced to the cloud
- **Real-time Sync**: Changes are instantly reflected across all devices
- **Collaboration**: Share files and folders with other users
- **Version Control**: Automatic versioning of all files
- **Backup**: Automated backups ensure your data is always safe

### Security
- **Authentication**: Secure login with username/password or SSO
- **Encryption**: All data is encrypted in transit and at rest
- **Access Control**: Fine-grained permissions for files and applications
- **Audit Logging**: Complete audit trail of all actions
- **Two-Factor Authentication**: Optional 2FA for enhanced security

## System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 20.04+
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RAM**: 2GB
- **Storage**: 1GB free space
- **Network**: Stable internet connection

### Recommended Requirements
- **OS**: Latest version of Windows, macOS, or Linux
- **Browser**: Latest version of Chrome or Firefox
- **RAM**: 4GB or more
- **Storage**: 5GB free space
- **Network**: Broadband internet connection

## Installation

### Prerequisites
- Node.js 16.0.0 or higher
- Python 3.8 or higher
- npm or yarn package manager
- pip package manager

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/lexos-genesis.git
cd lexos-genesis

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the application
cd ..
./start-lexos.sh
```

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Frontend Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000

# Backend Configuration
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///lexos.db

# Optional Features
ENABLE_COLLABORATION=true
ENABLE_CLOUD_STORAGE=true
MAX_UPLOAD_SIZE=100MB
```

## Usage

### Starting LexOS
```bash
# Start with one command
./start-lexos.sh

# Or start services individually
cd backend && python app.py  # Start backend
npm start                     # Start frontend
```

### Stopping LexOS
```bash
# Stop all services
./stop-lexos.sh

# Or press Ctrl+C in the terminal
```

### Accessing LexOS
Open your browser and navigate to: `http://localhost:3000`

Default credentials:
- Username: `admin`
- Password: `admin` (change immediately!)

## Development

### Project Structure
```
lexos-genesis/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── apps/              # Built-in applications
│   ├── services/          # API services
│   └── styles/            # CSS styles
├── backend/               # Backend source code
│   ├── api/               # API endpoints
│   ├── models/            # Data models
│   ├── services/          # Business logic
│   └── utils/             # Utilities
├── public/                # Static assets
├── docs/                  # Documentation
└── tests/                 # Test files
```

### Running Tests
```bash
# Frontend tests
npm test

# Backend tests
cd backend
python -m pytest

# End-to-end tests
npm run test:e2e
```

### Building for Production
```bash
# Build frontend
npm run build

# Package for distribution
npm run package
```

## Troubleshooting

### Common Issues

**Services won't start**
- Check logs in `logs/` directory
- Ensure all dependencies are installed
- Verify no other services are using ports 3000 or 5000

**Can't access LexOS in browser**
- Check firewall settings
- Ensure services are running: `ps aux | grep lexos`
- Try different browser or incognito mode

**Performance issues**
- Check system resources with built-in monitor
- Reduce number of open applications
- Clear browser cache

### Getting Help
- Check the [FAQ](docs/FAQ.md)
- Read the [User Guide](docs/USER_GUIDE.md)
- Submit issues on [GitHub](https://github.com/yourusername/lexos-genesis/issues)
- Join our [Discord community](https://discord.gg/lexos)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/lexos-genesis.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Open a pull request
```

## Roadmap

- [ ] Mobile app for iOS and Android
- [ ] Plugin system for third-party applications
- [ ] AI-powered assistant
- [ ] Advanced collaboration features
- [ ] Offline mode
- [ ] Multi-language support
- [ ] Theme customization
- [ ] Performance optimizations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- React team for the amazing framework
- Python community for Flask and excellent libraries
- All contributors who have helped make LexOS better
- Open source community for inspiration and support

---

**LexOS v1.0.0**  
*Your Desktop, Everywhere*  

Made with ❤️ by the LexOS Team