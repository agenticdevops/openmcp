import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HeroBanner() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Get Started in 5 Minutes
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/why-mcp-gateway"
            style={{marginLeft: '1rem', color: 'white', borderColor: 'white'}}>
            Why MCP Gateway?
          </Link>
        </div>
      </div>
    </header>
  );
}

const FeatureList = [
  {
    title: 'Auto-Managed Lifecycle',
    icon: '🚀',
    description: (
      <>
        Servers start automatically when needed and stop after idle periods.
        No manual process management. Configure once, run forever.
      </>
    ),
  },
  {
    title: 'Hot Reload Configuration',
    icon: '🔄',
    description: (
      <>
        Update your server catalog without restarting the gateway.
        Changes are detected automatically and applied in milliseconds.
      </>
    ),
  },
  {
    title: 'Multiple Runtime Backends',
    icon: '🔌',
    description: (
      <>
        Local processes, remote HTTP/SSE, Docker containers, and Kubernetes.
        One gateway, any deployment model.
      </>
    ),
  },
  {
    title: 'Dual Transport Support',
    icon: '🌐',
    description: (
      <>
        HTTP/REST API for web applications. Stdio wrapper for Claude Desktop
        and Cline. Same servers, any client.
      </>
    ),
  },
  {
    title: 'Rust-Native Performance',
    icon: '⚡',
    description: (
      <>
        Memory-safe, zero-cost abstractions, and async I/O. Minimal footprint
        with maximum throughput.
      </>
    ),
  },
  {
    title: 'Vendor Neutral',
    icon: '🎯',
    description: (
      <>
        Not locked to Docker or any platform. Works with your existing
        infrastructure. Open source under Apache-2.0.
      </>
    ),
  },
];

function Feature({icon, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <div style={{fontSize: '3rem', marginBottom: '1rem'}}>{icon}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExample() {
  return (
    <section className={styles.codeSection}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <Heading as="h2">Simple YAML Configuration</Heading>
            <p>
              Define all your MCP servers in a single catalog file.
              The gateway handles the rest.
            </p>
            <pre className={styles.codeBlock}>
{`servers:
  - id: postgres
    display_name: PostgreSQL Tools
    runtime:
      type: local-process
      command: postgres-mcp
    env:
      DATABASE_URL: \${DATABASE_URL}

  - id: github
    display_name: GitHub API
    runtime:
      type: remote-sse
      url: https://mcp.github.example.com`}
            </pre>
          </div>
          <div className="col col--6">
            <Heading as="h2">RESTful API</Heading>
            <p>
              Full HTTP API for server management and MCP communication.
              Works with any HTTP client.
            </p>
            <pre className={styles.codeBlock}>
{`# List servers
GET /servers

# Start a server
POST /servers/postgres/start

# Send MCP request
POST /mcp
{
  "server_id": "postgres",
  "method": "tools/list"
}

# Hot reload catalog
POST /admin/reload`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section className={styles.useCases}>
      <div className="container">
        <Heading as="h2" className="text--center" style={{marginBottom: '2rem'}}>
          Built For Your Use Case
        </Heading>
        <div className="row">
          <div className="col col--4">
            <div className={styles.useCase}>
              <Heading as="h3">Development Teams</Heading>
              <p>
                Share MCP server configurations across your team via Git.
                Everyone uses the same servers with consistent settings.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.useCase}>
              <Heading as="h3">Production APIs</Heading>
              <p>
                Deploy the gateway as your MCP backend. Auto-lifecycle
                management reduces compute costs by 80%.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.useCase}>
              <Heading as="h3">Desktop Users</Heading>
              <p>
                Centralize your Claude Desktop MCP config. Update servers
                without editing JSON files or restarting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className={styles.cta}>
      <div className="container text--center">
        <Heading as="h2">Ready to Simplify Your MCP Infrastructure?</Heading>
        <p style={{fontSize: '1.2rem', marginBottom: '2rem'}}>
          Get started in under 5 minutes. No complex setup required.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started">
            Read the Docs
          </Link>
          <Link
            className="button button--outline button--lg"
            href="https://github.com/agentic/mcp-gateway"
            style={{marginLeft: '1rem'}}>
            View on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="Vendor-neutral MCP server orchestration for the modern AI stack">
      <HeroBanner />
      <main>
        <FeaturesSection />
        <CodeExample />
        <UseCases />
        <CTASection />
      </main>
    </Layout>
  );
}
