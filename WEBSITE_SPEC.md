# Open MCP Gateway - Website Specification for Builder.io

## Overview

This specification defines the marketing/landing website for Open MCP Gateway, a Rust-native MCP (Model Context Protocol) server orchestration platform. The website should complement the Docusaurus documentation site with a more visually compelling marketing presence.

---

## Brand Identity

### Name
**Open MCP Gateway**

### Tagline
"Vendor-neutral MCP server orchestration for the modern AI stack"

### Tone
- Technical but accessible
- Confident and professional
- Developer-focused
- Open source friendly

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #5B6AF0 | Buttons, links, accents |
| Primary Dark | #1A1A2E | Headers, dark backgrounds |
| Secondary | #764BA2 | Gradients, highlights |
| Success | #28A745 | Available features, checkmarks |
| Warning | #FFC107 | Coming soon badges |
| Text | #333333 | Body text |
| Light BG | #F8F9FA | Section backgrounds |

### Typography
- **Headings**: Inter or similar sans-serif, bold
- **Body**: Inter or system fonts, regular
- **Code**: JetBrains Mono or Fira Code

---

## Page Structure

### 1. Homepage

#### Hero Section
**Layout**: Full-width, gradient background (#1A1A2E to #0F3460)

**Content**:
- Logo (optional gateway/network icon)
- H1: "Open MCP Gateway"
- Subtitle: "Vendor-neutral MCP server orchestration for the modern AI stack"
- CTA Buttons:
  - Primary: "Get Started" → /docs/getting-started
  - Secondary: "View on GitHub" → GitHub repo
- Optional: Terminal animation showing gateway in action

#### Value Proposition Strip
**Layout**: 3-4 icon boxes in a row

**Content**:
| Icon | Title | Description |
|------|-------|-------------|
| 🚀 | Auto-Managed | Servers start on-demand, stop when idle |
| 🔄 | Hot Reload | Update config without restart |
| 🔌 | Multi-Runtime | Process, HTTP, Docker, Kubernetes |
| ⚡ | Rust Performance | Memory-safe, high throughput |

#### "Why MCP Gateway" Section
**Layout**: Split layout - text left, illustration right

**Content**:
- H2: "The Problem with MCP Server Management"
- Pain points:
  - ❌ Each client connects to each server separately
  - ❌ Servers run 24/7, wasting resources
  - ❌ Configuration scattered across machines
  - ❌ No centralized monitoring

- H2: "The Solution"
- Benefits:
  - ✅ Single gateway, all servers
  - ✅ Auto start/stop saves 80% compute
  - ✅ One YAML file, Git-tracked
  - ✅ Built-in stats and health checks

**Illustration**: Simple architecture diagram showing:
```
[Clients] → [Gateway] → [MCP Servers]
```

#### Features Section
**Layout**: 2x3 grid of feature cards

**Features**:

1. **Auto-Managed Lifecycle**
   - Icon: Play/pause symbol
   - Description: Servers automatically start when needed and gracefully stop after configurable idle periods. Zero manual intervention required.
   - Badge: Available

2. **Hot Reload Configuration**
   - Icon: Refresh/sync symbol
   - Description: Update your server catalog without restarting the gateway. File changes are detected and applied in milliseconds.
   - Badge: Available

3. **Multiple Runtime Backends**
   - Icon: Layers/stack symbol
   - Description: Local processes for dev, remote HTTP for cloud, Docker and Kubernetes for production. One config works everywhere.
   - Sub-items:
     - ✅ Local Process
     - ✅ Remote SSE
     - 🔜 Docker (v0.2)
     - 🔜 Kubernetes (v0.3)

4. **Dual Transport Support**
   - Icon: Split arrows
   - Description: HTTP/REST API for web apps, stdio wrapper for Claude Desktop. Same servers, any client.
   - Badge: Available

5. **Rust-Native Performance**
   - Icon: Lightning bolt
   - Description: ~5MB memory footprint, millisecond latency, handles thousands of concurrent connections.
   - Stats: 5MB base memory | <1ms overhead

6. **Vendor Neutral & Open Source**
   - Icon: Open source logo
   - Description: Apache-2.0 licensed. Not locked to Docker or any vendor. Works with your existing infrastructure.
   - Badge: Apache-2.0

#### Code Example Section
**Layout**: Dark code block with syntax highlighting

**Content**:
```yaml
# catalog.yaml - Define all your MCP servers
servers:
  - id: postgres
    display_name: PostgreSQL Tools
    runtime:
      type: local-process
      command: postgres-mcp
    env:
      DATABASE_URL: ${DATABASE_URL}

  - id: github
    display_name: GitHub API
    runtime:
      type: remote-sse
      url: https://mcp.example.com/github
      headers:
        Authorization: Bearer ${GITHUB_TOKEN}
```

Caption: "Simple YAML configuration. Git-friendly. Hot-reloadable."

#### Use Cases Section
**Layout**: 3-column cards

**Use Cases**:

1. **Development Teams**
   - Share MCP configurations via Git
   - Consistent settings across the team
   - Local development with production-like setup

2. **Production APIs**
   - Deploy as your AI backend
   - Auto-lifecycle reduces compute costs
   - Built-in health checks and monitoring

3. **Claude Desktop Users**
   - Centralize all MCP server config
   - No more JSON file editing
   - Update servers without restart

#### Comparison Section
**Layout**: Feature comparison table

| Feature | Direct MCP | Docker MCP Gateway | Open MCP Gateway |
|---------|------------|-------------------|------------------|
| Multi-runtime | ❌ | Docker only | ✅ All |
| Hot reload | ❌ | ❌ | ✅ |
| Auto lifecycle | ❌ | Partial | ✅ Full |
| Stdio support | ✅ | Limited | ✅ |
| Centralized config | ❌ | ❌ | ✅ |
| Open source | N/A | ✅ | ✅ |

#### Roadmap Section
**Layout**: Timeline or version cards

**Versions**:

- **v0.1 - MVP** (Current ✅)
  - Auto-managed lifecycle
  - Local process & Remote SSE runtimes
  - HTTP & Stdio transports
  - Hot reload

- **v0.2 - Containers** (Coming Q1 2025)
  - Docker & Podman runtimes
  - Prometheus metrics
  - Enhanced security

- **v0.3 - Enterprise** (Coming Q2 2025)
  - Kubernetes runtimes
  - Multi-tenant support
  - Namespace isolation

#### Getting Started CTA Section
**Layout**: Centered with gradient background

**Content**:
- H2: "Ready to Simplify Your MCP Infrastructure?"
- Subtitle: "Get started in under 5 minutes. No complex setup required."
- CTA: "Read the Docs" button
- Sub-link: "or view on GitHub"

#### Footer
**Sections**:
- Documentation links
- Community (GitHub, Discord)
- Resources (Blog, Changelog)
- License: Apache-2.0

---

### 2. Why MCP Gateway (Detailed)

This page expands on the value proposition with more detail.

**Sections**:
1. The MCP Challenge (pain points in detail)
2. How the Gateway Solves It (with diagrams)
3. Comparison with Alternatives
4. Customer/User Testimonials (placeholder)
5. Getting Started CTA

---

### 3. Documentation (Link to Docusaurus)

External link to the documentation site.

---

## Design Components

### Buttons
- Primary: Solid fill with primary color
- Secondary: Outline with primary color
- Sizes: sm, md, lg

### Cards
- Feature cards with icon, title, description
- Use case cards with scenario and benefits
- Version cards with status badges

### Badges
- Available (green)
- Coming Soon (yellow/orange)
- New (blue)

### Code Blocks
- Dark theme (#1E1E1E background)
- Syntax highlighting for YAML, Bash, JSON
- Copy button

### Icons
- Prefer emoji or simple line icons
- Consistent style throughout

---

## Responsive Breakpoints

| Breakpoint | Width | Columns |
|------------|-------|---------|
| Mobile | < 768px | 1 |
| Tablet | 768-1024px | 2 |
| Desktop | > 1024px | 3-4 |

---

## SEO & Meta

### Title Tag
"Open MCP Gateway - Vendor-Neutral MCP Server Orchestration"

### Meta Description
"Open MCP Gateway is a Rust-native gateway server that enables AI clients to connect to multiple MCP servers through a unified interface. Auto-managed lifecycle, hot reload, and multi-runtime support."

### Keywords
- MCP Gateway
- Model Context Protocol
- AI infrastructure
- Claude Desktop
- MCP server management
- Rust MCP
- MCP orchestration

### Open Graph
- og:title: Open MCP Gateway
- og:description: Vendor-neutral MCP server orchestration for the modern AI stack
- og:image: Social preview card (gateway architecture visual)
- og:type: website

---

## Content Assets Needed

### Images
1. Logo (SVG, multiple sizes)
2. OG/social preview image
3. Architecture diagram
4. Feature icons (or use emoji)
5. Screenshot of terminal/config

### Copy
1. Homepage hero text ✅
2. Feature descriptions ✅
3. Use case descriptions ✅
4. Comparison table ✅

---

## Technical Requirements

### Performance
- Lighthouse score > 90
- First contentful paint < 1.5s
- Core Web Vitals passing

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support

### Analytics
- Google Analytics or Plausible
- Event tracking for CTA clicks
- Documentation link tracking

---

## Unique Selling Points Summary

For marketing copy, emphasize these key differentiators:

1. **"One Gateway, All Servers"** - Single entry point for any number of MCP servers

2. **"Start on Demand, Stop When Idle"** - Automatic lifecycle management saves resources

3. **"Configure Once, Update Anytime"** - Hot reload means no restarts

4. **"Any Runtime, Any Platform"** - Not locked to Docker or any vendor

5. **"Rust-Powered Performance"** - Memory-safe, minimal overhead, production-ready

6. **"Open Source, No Strings"** - Apache-2.0, community-driven

---

## Implementation Notes for Builder.io

1. Use Builder.io's visual editor for the marketing sections
2. Embed Docusaurus for the /docs paths
3. Use Builder.io's A/B testing for CTA optimization
4. Consider Builder.io's personalization for different user segments (developers vs. enterprises)

---

## Next Steps

1. Create logo and visual assets
2. Build homepage in Builder.io
3. Connect to domain
4. Set up analytics
5. Launch alongside Docusaurus docs
