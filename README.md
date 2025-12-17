# Open MCP Gateway Documentation

This directory contains the documentation website for Open MCP Gateway, built with [Docusaurus](https://docusaurus.io/).

## Live Site

The documentation is available at: **https://openmcp.aof.sh**

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd docs-site
npm install
```

### Start Development Server

```bash
npm start
```

This starts a local development server at `http://localhost:3000`. Most changes are reflected live without having to restart the server.

### Build

```bash
npm run build
```

This generates static content into the `build` directory that can be served by any static hosting service.

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` or `dev` branch. See `.github/workflows/deploy-docs.yml` for the deployment workflow.

### Custom Domain

The site is configured to use `openmcp.aof.sh` as the custom domain. The CNAME file in `static/CNAME` ensures this works with GitHub Pages.

## Documentation Structure

```
docs/
├── introduction.md          # Homepage/intro
├── why-mcp-gateway.md       # Value proposition
├── getting-started.md       # Quick start guide
├── installation.md          # Installation instructions
├── quick-start.md           # 5-minute quick start
├── configuration.md         # Config overview
├── configuration/           # Detailed config docs
│   ├── gateway-config.md
│   ├── server-catalog.md
│   ├── runtimes.md
│   └── authentication.md
├── usage/                   # Usage guides
│   ├── http-transport.md
│   ├── stdio-transport.md
│   ├── claude-desktop.md
│   └── hot-reload.md
├── deployment/              # Deployment guides
│   ├── docker.md
│   ├── kubernetes.md
│   └── production.md
├── developer/               # Developer docs
│   ├── overview.md
│   ├── architecture.md
│   ├── crate-structure.md
│   ├── runtime-abstraction.md
│   ├── lifecycle-management.md
│   ├── api-reference.md
│   ├── api-endpoints.md
│   ├── mcp-protocol.md
│   ├── custom-runtimes.md
│   ├── middleware.md
│   ├── contributing.md
│   └── changelog.md
├── troubleshooting.md       # Troubleshooting guide
├── faq.md                   # FAQ
└── roadmap.md               # Project roadmap
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b docs/my-change`)
3. Make your changes
4. Test locally with `npm start`
5. Build to check for errors with `npm run build`
6. Commit your changes (`git commit -m 'docs: add new guide'`)
7. Push to the branch (`git push origin docs/my-change`)
8. Open a Pull Request
