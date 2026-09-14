import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  test: {
    // A git WORKTREE parked under .claude/ is a second full checkout
    // of this repo, test files included — so vitest collected every
    // suite twice and reported 111 tests for a project that has 53.
    // Harmless until the day the two copies disagree, which is any
    // day a worktree is left behind across a change: the stale copy
    // fails on an assertion the live code deliberately dropped, and
    // `npm test` reports a red suite for a file nobody edited.
    // Vitest's defaults already exclude node_modules and dist; this
    // adds the one directory this project keeps checkouts in.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
})
