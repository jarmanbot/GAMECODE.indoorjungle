import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string;
const buildId = (() => {
  const ciCommit = process.env.COMMIT_REF || process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA;
  if (ciCommit) return ciCommit.slice(0, 7);
  try {
    const commit = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim();
    const modified = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
    return modified ? `${commit}-modified` : commit;
  } catch {
    return 'local';
  }
})();

export default defineConfig({
  // Netlify serves this project from the root of its assigned/custom domain.
  base: '/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __BUILD_ID__: JSON.stringify(buildId),
    __APP_VERSION__: JSON.stringify(packageVersion),
  },
});
