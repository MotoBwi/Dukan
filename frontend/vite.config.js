import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// Content-Security-Policy for the production build only (the dev server needs inline scripts for hot reload).
// It blocks inline/injected scripts, so a cross-site-scripting bug cannot run attacker code or reach other hosts.
function contentSecurityPolicy(apiBaseUrl) {
  let apiOrigin = ''
  try {
    apiOrigin = new URL(apiBaseUrl).origin
  } catch {
    // relative URL: same origin, already covered by 'self'
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-csp',
        apply: 'build',
        transformIndexHtml() {
          return [
            {
              tag: 'meta',
              attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(apiBaseUrl) },
              injectTo: 'head-prepend',
            },
          ]
        },
      },
    ],
    server: {
      port: 5173,
    },
  }
})
