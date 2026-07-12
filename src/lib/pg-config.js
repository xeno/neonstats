/**
 * Build node-pg / PrismaPg connection options that work with managed Postgres
 * (DigitalOcean, etc.) whose CA is not in the public trust store.
 *
 * Newer `pg` treats sslmode=require like verify-full. We strip sslmode from the
 * URL and set `ssl.rejectUnauthorized` explicitly instead.
 *
 * Env:
 *   DATABASE_SSL_REJECT_UNAUTHORIZED=true  → verify certs (strict)
 *   default when SSL is requested           → rejectUnauthorized: false
 */
export function getPgConnectionConfig(connectionString) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const url = new URL(connectionString);
  const sslmode = (url.searchParams.get('sslmode') || url.searchParams.get('ssl') || '')
    .toLowerCase();
  const sslDisabled = sslmode === 'disable';
  const sslRequested = Boolean(sslmode) && !sslDisabled;

  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');
  url.searchParams.delete('uselibpqcompat');

  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

  /** @type {import('pg').PoolConfig} */
  const config = {
    connectionString: url.toString(),
  };

  if (sslRequested) {
    config.ssl = { rejectUnauthorized };
  }

  return config;
}

export function getSchemaFromDatabaseUrl(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) return null;
  try {
    return new URL(connectionString).searchParams.get('schema');
  } catch {
    return null;
  }
}

/**
 * Prisma CLI (migrate/db pull) uses its own engine — not node-pg.
 * For private-CA hosts, add sslaccept=accept_invalid_certs unless strict mode is on.
 */
export function getPrismaCliDatabaseUrl(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true') {
    return connectionString;
  }

  const url = new URL(connectionString);
  const sslmode = (url.searchParams.get('sslmode') || '').toLowerCase();
  if (sslmode && sslmode !== 'disable' && !url.searchParams.has('sslaccept')) {
    url.searchParams.set('sslaccept', 'accept_invalid_certs');
  }
  return url.toString();
}
