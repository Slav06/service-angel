import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { FinderPause, type Ask } from './lead-finder';

// The lead finder's terminal engine: answers with the owner's Claude subscription by running Claude Code
// headless (`claude -p`). Lean on purpose: no tools, no settings, project files or memory, and our own system
// prompt, so each question costs about what it says rather than a whole coding session's context.
const CLAUDE = process.env.CLAUDE_BIN ?? 'claude';
const TIMEOUT_MS = 8 * 60_000;
const workDir = mkdtempSync(path.join(tmpdir(), 'lead-finder-'));

type CliResult = { is_error?: boolean; subtype?: string; result?: string; structured_output?: unknown };

function run(args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE, args, { cwd: workDir, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Claude took too long to answer.'));
    }, TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Couldn't start Claude Code (${e.message}). Is \`claude\` installed and signed in?`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (out.trim()) resolve(out);
      else reject(new Error(`Claude Code exited (${code}): ${err.trim().slice(0, 300) || 'no output'}`));
    });
    child.stdin.end(input);
  });
}

export const cliAsk: Ask = async (effort, schema, system, user) => {
  // Claude Code validates the schema itself and rejects the draft-2020-12 "$schema" marker zod adds.
  const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(schema) };
  delete jsonSchema.$schema;
  const args = [
    '-p',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(jsonSchema),
    '--system-prompt', system,
    '--effort', effort,
    '--tools', '',
    '--setting-sources', '',
    '--no-session-persistence',
  ];
  const raw = await run(args, user);
  let res: CliResult;
  try {
    res = JSON.parse(raw);
  } catch {
    throw new Error(`Claude Code gave an unreadable answer: ${raw.slice(0, 200)}`);
  }
  if (res.is_error || res.structured_output == null) {
    const why = res.result ?? res.subtype ?? 'no answer';
    // Usage limits and rate limits clear up on their own: pause instead of failing the request.
    if (/limit|rate|overloaded|529|try again/i.test(why)) throw new FinderPause(`Claude is busy or at its usage limit: ${why.slice(0, 200)}`);
    if (/log ?in|auth|credential/i.test(why)) throw new FinderPause(`Claude Code isn't signed in: ${why.slice(0, 200)}`);
    throw new Error(`Claude didn't answer: ${why.slice(0, 300)}`);
  }
  return schema.parse(res.structured_output);
};
