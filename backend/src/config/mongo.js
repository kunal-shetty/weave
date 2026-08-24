import mongoose from 'mongoose';
import https from 'node:https';
import dns from 'node:dns';

// Local DNS on this machine cannot resolve *.mongodb.net. We route every
// lookup that the MongoDB driver makes — both `lookup` (hostname→IP) and
// `resolveSrv` (SRV→hostname) — through Google DNS-over-HTTPS, which works.

const DOH_HOST = 'dns.google';
const DOH_PATH = '/resolve';
const DOH_AGENT = new https.Agent({ keepAlive: true, family: 4 });

function dohQuery(name, type) {
  return new Promise((resolve, reject) => {
    const path = `${DOH_PATH}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
    const req = https.request(
      { host: DOH_HOST, path, method: 'GET', agent: DOH_AGENT, headers: { Accept: 'application/dns-json' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (body.Status !== 0) {
              return reject(new Error(`DoH ${name} ${type} status=${body.Status}`));
            }
            resolve(body.Answer || []);
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

const cache = new Map();

async function dohLookupOne(hostname) {
  if (cache.has(hostname)) return cache.get(hostname);

  const a = await dohQuery(hostname, 'A').catch(() => []);
  let ip = '';
  for (const r of a) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(r.data)) {
      ip = r.data;
      break;
    }
  }
  if (!ip) throw new Error(`DoH: no A record for ${hostname}`);
  cache.set(hostname, ip);
  return ip;
}

// Custom `lookup` for the MongoDB driver. Returns (err, address, family).
async function dohLookup(hostname, _opts, cb) {
  try {
    const ip = await dohLookupOne(hostname);
    process.nextTick(cb, null, ip, 4);
  } catch (err) {
    process.nextTick(cb, err);
  }
}

// Patch node:dns so resolveSrv / resolve4 also go through DoH. We monkey-patch
// the module-level functions used by the MongoDB driver.
const origResolveSrv = dns.resolveSrv;
const origResolve4 = dns.resolve4;
const srvCache = new Map();

dns.resolveSrv = function patchedResolveSrv(hostname, cb) {
  if (srvCache.has(hostname)) return process.nextTick(cb, null, srvCache.get(hostname));
  dohQuery(hostname, 'SRV')
    .then((answers) => {
      const records = answers
        .map((r) => {
          const parts = (r.data || '').split(' ');
          // SRV data: priority weight port target
          return {
            name: hostname,
            priority: Number(parts[0]) || 0,
            weight: Number(parts[1]) || 0,
            port: Number(parts[2]) || 27017,
            target: (parts[3] || '').replace(/\.$/, ''),
          };
        })
        .filter((r) => r.target);
      srvCache.set(hostname, records);
      cb(null, records);
    })
    .catch((err) => {
      // Fall back to the original resolver in case DoH also fails.
      origResolveSrv.call(dns, hostname, cb);
    });
};

dns.resolve4 = function patchedResolve4(hostname, cb) {
  if (cache.has(hostname)) return process.nextTick(cb, null, [cache.get(hostname)]);
  dohQuery(hostname, 'A')
    .then((answers) => {
      const ips = answers
        .map((r) => r.data)
        .filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
      if (ips[0]) cache.set(hostname, ips[0]);
      cb(null, ips);
    })
    .catch(() => origResolve4.call(dns, hostname, cb));
};

export async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codex';
  try {
    await mongoose.connect(uri, {
      family: 4,
      lookup: dohLookup,
      serverSelectionTimeoutMS: 20000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}
