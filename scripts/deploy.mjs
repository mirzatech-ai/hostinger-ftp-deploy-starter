#!/usr/bin/env node
/**
 * deploy.mjs
 * - Usage:
 *    node ./scripts/deploy.mjs            # reads from process.env or .env
 *    node ./scripts/deploy.mjs --site name  # picks config from domains.json
 *
 * - Supports SFTP (default) and FTP (set FTP_PROTOCOL=ftp)
 * - Optional deletion of remote files with DELETE_REMOTE=true
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import FTPClient from 'basic-ftp';
import SFTPClient from 'ssh2-sftp-client';

dotenv.config(); // loads .env if present

const DIST_DIR = path.resolve(process.cwd(), 'dist');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--site' && args[i + 1]) {
      out.site = args[i + 1];
      i++;
    }
  }
  return out;
}

async function fileList(dir) {
  const entries = [];
  async function walk(current, base) {
    const names = await fs.readdir(current, { withFileTypes: true });
    for (const dirent of names) {
      const res = path.join(current, dirent.name);
      const rel = path.relative(base, res).split(path.sep).join('/'); // posix
      if (dirent.isDirectory()) {
        await walk(res, base);
      } else if (dirent.isFile()) {
        entries.push({ local: res, relative: rel });
      }
    }
  }
  await walk(dir, dir);
  return entries;
}

async function readDomainsJson() {
  const p = path.resolve(process.cwd(), 'domains.json');
  if (!fsSync.existsSync(p)) return null;
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

function pickConfigFromEnv() {
  const cfg = {
    protocol: (process.env.FTP_PROTOCOL || 'sftp').toLowerCase(),
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : undefined,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    remoteDir: process.env.FTP_REMOTE_DIR,
    deleteRemote: (process.env.DELETE_REMOTE || 'false').toLowerCase() === 'true'
  };
  return cfg;
}

async function ensureLocalDist() {
  if (!fsSync.existsSync(DIST_DIR)) {
    throw new Error('dist/ folder not found. Did the build step succeed? Run `npm run build` first.');
  }
}

async function uploadWithSftp(cfg, files) {
  const sftp = new SFTPClient();
  const port = cfg.port || 22;
  console.log(`Connecting SFTP ${cfg.host}:${port} as ${cfg.user}`);
  await sftp.connect({
    host: cfg.host,
    port,
    username: cfg.user,
    password: cfg.password
  });

  // Ensure remote directories as necessary and upload
  for (const file of files) {
    const remotePath = path.posix.join(cfg.remoteDir, file.relative);
    const remoteDir = path.posix.dirname(remotePath);
    try {
      // recursive mkdir; if exists, it's okay
      await sftp.mkdir(remoteDir, true);
    } catch (err) {
      // some servers may not support recursive mkdir; ignore errors
    }
    process.stdout.write(`Uploading ${file.relative} ... `);
    await sftp.fastPut(file.local, remotePath);
    console.log('ok');
  }

  if (cfg.deleteRemote) {
    console.log('DELETE_REMOTE=true, scanning remote files for deletion...');
    await removeRemoteExtrasSftp(sftp, cfg.remoteDir, files);
  }

  await sftp.end();
}

async function removeRemoteExtrasSftp(sftp, remoteRoot, files) {
  const localSet = new Set(files.map(f => f.relative));
  async function listAll(dir, base) {
    let list = await sftp.list(dir);
    for (const item of list) {
      const remotePath = path.posix.join(dir, item.name);
      const rel = path.posix.relative(base, remotePath).split(path.sep).join('/');
      if (item.type === 'd') {
        await listAll(remotePath, base);
      } else {
        // file
        if (!localSet.has(rel)) {
          console.log(`Deleting remote file: ${rel}`);
          await sftp.delete(remotePath);
        }
      }
    }
  }
  try {
    await listAll(remoteRoot, remoteRoot);
  } catch (err) {
    console.warn('Warning while deleting remote files:', err.message);
  }
}

async function uploadWithFtp(cfg, files) {
  const client = new FTPClient.Client();
  client.ftp.verbose = false;
  const port = cfg.port || 21;
  console.log(`Connecting FTP ${cfg.host}:${port} as ${cfg.user}`);
  await client.access({
    host: cfg.host,
    port,
    user: cfg.user,
    password: cfg.password,
    secure: false
  });

  for (const file of files) {
    const remotePath = path.posix.join(cfg.remoteDir, file.relative);
    const remoteDir = path.posix.dirname(remotePath);
    try {
      await client.ensureDir(remoteDir);
    } catch (err) {
      // ensureDir may fail on some servers; continue anyway
    }
    process.stdout.write(`Uploading ${file.relative} ... `);
    await client.uploadFrom(file.local, remotePath);
    console.log('ok');
  }

  if (cfg.deleteRemote) {
    console.log('DELETE_REMOTE=true, scanning remote files for deletion...');
    await removeRemoteExtrasFtp(client, cfg.remoteDir, files);
  }

  client.close();
}

async function removeRemoteExtrasFtp(client, remoteRoot, files) {
  const localSet = new Set(files.map(f => f.relative));
  async function listDir(dir, base) {
    let list;
    try {
      list = await client.list(dir);
    } catch (err) {
      return;
    }
    for (const item of list) {
      const remotePath = path.posix.join(dir, item.name);
      const rel = path.posix.relative(base, remotePath).split(path.sep).join('/');
      if (item.isDirectory) {
        await listDir(remotePath, base);
      } else {
        if (!localSet.has(rel)) {
          console.log(`Deleting remote file: ${rel}`);
          try {
            await client.remove(remotePath);
          } catch (err) {
            console.warn(`Failed to delete ${remotePath}: ${err.message}`);
          }
        }
      }
    }
  }
  try {
    await listDir(remoteRoot, remoteRoot);
  } catch (err) {
    console.warn('Warning while deleting remote files:', err.message);
  }
}

async function main() {
  try {
    const args = parseArgs();
    const domains = await readDomainsJson();
    let cfg;
    if (args.site) {
      if (!domains || !domains[args.site]) {
        throw new Error(`Site "${args.site}" not found in domains.json`);
      }
      const d = domains[args.site];
      cfg = {
        protocol: (d.FTP_PROTOCOL || 'sftp').toLowerCase(),
        host: d.FTP_HOST,
        port: d.FTP_PORT,
        user: d.FTP_USER,
        password: d.FTP_PASSWORD,
        remoteDir: d.FTP_REMOTE_DIR,
        deleteRemote: (d.DELETE_REMOTE || false) === true || (d.DELETE_REMOTE === 'true')
      };
    } else {
      cfg = pickConfigFromEnv();
    }

    if (!cfg.host || !cfg.user || !cfg.password || !cfg.remoteDir) {
      throw new Error('Missing connection details. Set FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_REMOTE_DIR or use --site with domains.json');
    }

    await ensureLocalDist();
    const files = await fileList(DIST_DIR);
    console.log(`Found ${files.length} files in dist/ to upload.`);

    if (cfg.protocol === 'ftp') {
      await uploadWithFtp(cfg, files);
    } else {
      await uploadWithSftp(cfg, files);
    }

    console.log('Deploy complete.');
  } catch (err) {
    console.error('Deploy failed:', err.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.cwd()}/scripts/deploy.mjs` || import.meta.url.endsWith('/scripts/deploy.mjs')) {
  // not used — script run directly, but still call main()
}

await main();
