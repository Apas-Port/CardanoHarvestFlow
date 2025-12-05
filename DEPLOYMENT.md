# Deployment Instructions for Vercel

## Steps to Deploy

1. **Clean Local Installation**
   ```bash
   rm -rf node_modules package-lock.json yarn.lock pnpm-lock.yaml
   rm -rf .next .vercel
   pnpm install
   pnpm build
   ```

2. **Commit Changes**
   ```bash
   git add .
   git commit -m "Fix Next.js version for Vercel deployment"
   git push
   ```

3. **Vercel Settings**
   In your Vercel project settings:
   
   - **Framework Preset**: Next.js
   - **Node.js Version**: 20.x
   - **Install Command**: `pnpm install --no-frozen-lockfile`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`

4. **Environment Variables**
   Make sure to add these in Vercel:
   - `BLOCKFROST_PROJECT_ID`
   - `CARDANO_NETWORK`
   - `NEXT_PUBLIC_PROJECT_TREASURY_ADDRESS`

5. **Clear Cache and Redeploy**
   - In Vercel dashboard, go to Settings → Functions
   - Clear build cache
   - Trigger a new deployment

## Troubleshooting

If deployment still fails:

1. Check the build logs for specific errors
2. Ensure all dependencies are listed in package.json
3. Try deploying with `npm` instead of `pnpm`:
   - Change install command to: `npm install`
   - Change build command to: `npm run build`

## Version Information

- Next.js: 14.2.13 (stable)
- React: 18.3.1
- Node.js: 20.x
- Package Manager: pnpm (preferred) or npm