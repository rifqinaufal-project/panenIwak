import { describe, expect, test } from 'bun:test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function sources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? sources(join(directory, entry.name)) : [join(directory, entry.name)],
      ),
    )
  ).flat();
}

describe('workspace dependency boundaries', () => {
  test('domain rules do not import Vue, Nuxt, repositories or browser globals', async () => {
    for (const path of [
      'shared/utils/transactions.ts',
      'shared/utils/finance.ts',
      'shared/types/workspace.ts',
      'shared/types/accounts.ts',
      'shared/types/legacy-import.ts',
      'shared/utils/legacy-import.ts',
    ]) {
      const source = await readFile(path, 'utf8');
      expect(source).not.toMatch(/from\s+['"](?:vue|#app|.*app\/|.*repositories\/)/);
      expect(source).not.toMatch(/\$fetch|\bwindow\.|\bdocument\.|\buseRouter\(/);
    }
  });
  test('feature controllers depend on repository contracts, not HTTP adapters', async () => {
    for (const path of await sources('app/features')) {
      if (path.endsWith('/useWorkspace.ts')) continue; // Composition root alone selects infrastructure.
      const source = await readFile(path, 'utf8');
      expect(source).not.toMatch(/from\s+['"][^'"]*repositories\//);
      expect(source).not.toMatch(/\$fetch\s*(?:<[^>]+>)?\s*\(|\bfetch\s*\(/);
      expect(source).not.toMatch(/from\s+['"](?:dexie|@supabase\/supabase-js)['"]|\bindexedDB\./);
    }
  });
  test('workspace presentation cannot make HTTP calls or import repositories', async () => {
    const paths = await sources('app/components');
    for (const path of paths) {
      const source = await readFile(path, 'utf8');
      expect(source).not.toMatch(/\$fetch|from\s+['"][^'"]*repositories\//);
      expect(source).not.toMatch(/from\s+['"](?:dexie|@supabase\/supabase-js)['"]|\bindexedDB\./);
    }
    const shell = await readFile('app/components/WorkspaceApp.vue', 'utf8');
    expect(shell).not.toMatch(
      /\b(?:new Decimal|validateBatchDraft|validateSales|replaceTransaction|persist)\b/,
    );
  });
});
