# HyperswarmWeb Examples

This directory contains examples demonstrating P2P connectivity between web applications and various types of Pear Runtime applications.

## Structure

```
examples/
├── web/                    # Web Applications
│   ├── chat/              # Browser-based chat application
│   └── file-share/        # Browser-based file sharing application
│
└── pear/                  # Pear Runtime Applications
    ├── cli-chat/          # Command-line chat application
    ├── electron-media/    # Desktop media streaming application
    └── react-native-status/ # Mobile status monitoring application
```

## Web Applications

These applications run in web browsers and use HyperswarmWeb to connect to the P2P network:

- **Chat Application**: Simple text chat demonstrating basic P2P messaging
- **File Sharing**: File transfer example showing binary data exchange

## Pear Runtime Applications

These applications run in the Pear Runtime environment, showcasing different platforms and use cases:

- **CLI Chat**: Command-line interface demonstrating P2P chat (Node.js)
- **Electron Media**: Desktop application showing media streaming (Electron)
- **React Native Status**: Mobile app broadcasting device status (React Native)

## Running the Examples

1. Start one or more Pear applications
2. Open the web applications in your browser
3. Watch them discover and connect to each other automatically

All examples use the same network topic (`hyperswarm-web-example`) to ensure they can find each other.
