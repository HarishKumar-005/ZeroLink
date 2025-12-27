# ZeroLink - Offline Automation Protocol

[![Production Ready](https://img.shields.io/badge/production-beta-yellow)](PRODUCTION_CHECKLIST.md)
[![TypeScript](https://img.shields.io/badge/typescript-100%25-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> Build and transmit automation logic using natural language and QR codes. **Zero accounts. Zero pairing. Zero internet required.**

ZeroLink is a Progressive Web App (PWA) that converts natural language automation rules into structured JSON using the Gemini API, then transfers this logic between devices using QR codes. The receiver simulates sensor inputs and executes actions visually - all without requiring user accounts, device pairing, or network connectivity after initial load.

## ✨ Features

- 🤖 **AI-Powered Logic Generation** - Describe automation rules in plain English
- 📱 **QR Code Transfer** - Share logic between devices instantly
- 🔒 **Zero-Login Architecture** - No accounts, no tracking, complete privacy
- 📡 **Offline-First** - Works completely offline after first load
- 🎮 **Visual Simulator** - See your automation rules in action
- 💾 **Local Storage** - Save logic rules on-device
- ☁️ **Optional Cloud Sync** - Firebase integration for multi-device sync (optional)
- 🔐 **Secure** - Checksum validation, input sanitization, error boundaries

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- At least one Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/HarishKumar-005/ZeroLink.git
cd ZeroLink

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your Gemini API key(s) to .env.local
# GEMINI_API_KEY_1=your_api_key_here

# Run development server
npm run dev
```

Visit `http://localhost:9002` to see the app in action.

### Build for Production

```bash
npm run build
npm start
```

## 📖 Documentation

- **[Complete Audit Report](AUDIT_REPORT.md)** - Comprehensive security, performance, and architecture analysis
- **[QR Protocol Specification](QR_PROTOCOL.md)** - Technical specification of the QR transfer protocol
- **[Production Checklist](PRODUCTION_CHECKLIST.md)** - Deployment and monitoring guide
- **[Environment Variables](.env.example)** - Configuration reference

## 🏗️ Architecture

```
ZeroLink/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   │   ├── sender-view.tsx      # Logic generation & QR display
│   │   ├── receiver-view.tsx    # QR scanning & logic loading
│   │   ├── logic-simulator.tsx  # Visual sensor simulator
│   │   └── qr-scanner.tsx       # Multi-chunk QR scanner
│   ├── hooks/            # Custom React hooks
│   │   ├── use-logic-runner.ts  # Logic evaluation engine
│   │   └── use-logic-storage.ts # Local/cloud storage
│   ├── lib/              # Core utilities
│   │   ├── schema.ts            # Zod validation schemas
│   │   ├── actions.ts           # Gemini API integration
│   │   └── gemini-key-rotator.ts # API key rotation
│   └── types/            # TypeScript definitions
├── public/
│   ├── sw.js             # Service worker (offline support)
│   ├── manifest.json     # PWA manifest
│   └── offline.html      # Offline fallback page
└── docs/                 # Additional documentation
```

## 🎯 How It Works

### Sender Mode (Logic Creation)

1. Enter automation rule in plain English: *"If temperature > 30°C, turn on the fan"*
2. Gemini API converts to structured JSON with validation
3. Logic is chunked and encoded into QR code(s)
4. Display QR codes with auto-rotation (for multi-part logic)

### Receiver Mode (Logic Execution)

1. Scan QR code(s) with device camera
2. Chunks are validated with checksums and reassembled
3. Logic is loaded into visual simulator
4. Adjust sensor values (temperature, light, motion)
5. Watch actions trigger in real-time (device toggles, alerts, logs)

## 🔒 Security

ZeroLink implements multiple security layers:

- ✅ **No Hardcoded Secrets** - All API keys via environment variables
- ✅ **Input Sanitization** - Prevents injection attacks
- ✅ **Checksum Validation** - Detects corrupted QR data
- ✅ **Zod Schema Validation** - Runtime type safety
- ✅ **Error Boundaries** - Graceful failure recovery
- ✅ **Privacy-First** - Zero tracking, zero data collection

See [AUDIT_REPORT.md](AUDIT_REPORT.md) for complete security analysis.

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
```

### Other Platforms

ZeroLink works on any platform that supports Next.js:
- Netlify
- Cloudflare Pages
- AWS Amplify
- Self-hosted (Docker, VPS)

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for deployment guide.

## 🧪 Testing

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build (tests production build)
npm run build
```

## 🛣️ Roadmap

- [ ] E2E tests for critical flows
- [ ] Compression for large logic payloads
- [ ] WebRTC peer-to-peer transfer (no QR)
- [ ] Logic marketplace/sharing
- [ ] Streaming Gemini responses
- [ ] Multi-language support

## 📊 Production Readiness

**Current Score: 8.5/10** 🟢

✅ All critical issues resolved  
✅ Security hardened  
✅ Comprehensive documentation  
✅ Error handling complete  
⚠️ Manual testing recommended  
⚠️ E2E tests pending  

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for full details.

## 🤝 Contributing

Contributions are welcome! Please read our contribution guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Gemini API](https://ai.google.dev/) - Natural language processing
- [Next.js](https://nextjs.org/) - React framework
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Zod](https://zod.dev/) - Schema validation
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) - QR code scanning

## 📞 Support

- 📖 [Documentation](AUDIT_REPORT.md)
- 🐛 [Issues](https://github.com/HarishKumar-005/ZeroLink/issues)
- 💬 [Discussions](https://github.com/HarishKumar-005/ZeroLink/discussions)

---

**Built with ❤️ for the offline-first future**
