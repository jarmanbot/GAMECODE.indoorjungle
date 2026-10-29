import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';

const buildCommit = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unavailable';
  }
})();

export default defineConfig({
  // Netlify serves this project from the root of its assigned/custom domain.
  base: '/',
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __GIT_COMMIT__: JSON.stringify(buildCommit),
  },
});
