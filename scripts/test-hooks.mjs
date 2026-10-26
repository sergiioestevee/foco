// Lets Node run the TypeScript logic tests: resolves the "@/" alias to src/ and extensionless imports to .ts.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

export async function resolve(specifier, context, next) {
  let target = null;
  if (specifier.startsWith('@/')) target = SRC + specifier.slice(2);
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.includes('/src/')) {
    target = fileURLToPath(new URL(specifier, context.parentURL));
  }
  if (target) {
    for (const candidate of [target, `${target}.ts`, `${target}/index.ts`]) {
      if (existsSync(candidate) && !candidate.endsWith('/')) {
        try {
          return await next(pathToFileURL(candidate).href, context);
        } catch {
          // A directory or unloadable match: try the next candidate.
        }
      }
    }
  }
  return next(specifier, context);
}
