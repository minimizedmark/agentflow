# Dependency Audit Report

**Date:** 2025-12-29
**Project:** Agent12 Voice Agent Platform
**Total Dependencies:** 773 (338 production, 399 dev, 60 optional)

---

## Executive Summary

✅ **Security:** No vulnerabilities detected
⚠️ **Bloat:** 2 unused dependencies identified
⚠️ **Consistency:** ESLint version conflicts between workspaces
📦 **Size:** 773 total dependencies (moderate for a monorepo with Next.js)

---

## 1. Security Analysis

### ✅ No Vulnerabilities Found
- Ran `npm audit` across all workspaces
- Zero critical, high, moderate, low, or info-level vulnerabilities
- All dependencies are currently secure

**Recommendation:** Continue running `npm audit` regularly, especially before deployments.

---

## 2. Unused Dependencies (Bloat)

### 🚨 Critical: Remove Unused Packages

#### Frontend: `recharts` (UNUSED)
- **Package:** recharts@^2.12.7
- **Impact:** Large charting library (~500KB+ minified)
- **Usage:** 0 files found using this package
- **Action:** Remove immediately

```bash
cd frontend && npm uninstall recharts
```

#### WebSocket Server: `axios` (UNUSED)
- **Package:** axios@^1.7.7
- **Impact:** HTTP client library (~13KB minified)
- **Usage:** 0 files found using this package
- **Note:** Native `fetch` API is available in Node.js 18+
- **Action:** Remove immediately

```bash
cd websocket-server && npm uninstall axios
```

**Estimated bundle size reduction:** ~500KB+ (mainly from recharts)

---

## 3. Version Conflicts & Inconsistencies

### ⚠️ ESLint Version Mismatch

**Issue:** Different ESLint versions across workspaces
- **Frontend:** ESLint 9.39.2 (latest)
- **WebSocket Server:** ESLint 8.57.1 (older)

**Impact:**
- Inconsistent linting rules across codebase
- Different plugin versions required
- websocket-server uses `@typescript-eslint/*@6.21.0` which is incompatible with ESLint 9

**Recommendation (Option 1 - Upgrade websocket-server):**
```bash
cd websocket-server
npm install --save-dev eslint@^9.39.2 @typescript-eslint/eslint-plugin@^8.0.0 @typescript-eslint/parser@^8.0.0
```

**Recommendation (Option 2 - Downgrade frontend for stability):**
```bash
cd frontend
npm install --save-dev eslint@^8.57.1
```

**Preferred:** Option 1 (upgrade to ESLint 9 for consistency)

### TypeScript Version Inconsistencies

**Current State:**
- Frontend: `typescript@^5` (likely 5.9.3)
- WebSocket Server: `typescript@5.6.2`
- Shared: `typescript@5.6.2`

**Recommendation:** Pin to same version across all workspaces
```bash
# In all three workspaces
npm install --save-dev typescript@5.9.3
```

---

## 4. Potential Optimizations

### Logging Library (websocket-server)

**Current:** `winston@^3.14.2`
- Usage: 1 file (src/utils/logger.ts)
- Size: ~100KB with transitive dependencies
- Features: Full-featured production logger

**Alternatives:**
1. **pino** - 5x faster, smaller footprint (~30KB)
2. **console.log** - Zero dependencies (if complex logging not needed)

**Recommendation:** If you need structured logging in production, keep winston. Otherwise, consider pino or native console methods.

### Lucide React Version

**Current:** `lucide-react@^0.445.0`
- Very high minor version (445!)
- Still in pre-1.0 (0.x)

**Recommendation:** Monitor for 1.0 stable release, but current version is fine for now. The library is actively maintained and widely used.

### Date Formatting Library

**Current:** `date-fns@^3.6.0`
- Usage: 4 files
- Size: Tree-shakeable, only imports used functions

**Status:** ✅ Good choice, optimal for bundle size

---

## 5. Package-Specific Analysis

### Frontend Dependencies (24 packages)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| next | ^16.1.1 | ✅ Latest | Major framework, well maintained |
| react | ^18.3.1 | ✅ Current | Latest stable React |
| @supabase/supabase-js | ^2.45.0 | ✅ Current | Backend integration |
| stripe | ^16.12.0 | ✅ Current | Payment processing (8 files) |
| zod | ^3.23.8 | ✅ Current | Schema validation |
| react-hook-form | ^7.53.0 | ✅ Current | Form management |
| @radix-ui/* | Multiple | ✅ Current | UI component primitives |
| **recharts** | ^2.12.7 | ❌ **UNUSED** | **Remove** |

### WebSocket Server Dependencies (6 packages)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| ws | ^8.18.0 | ✅ Current | WebSocket library |
| express | ^4.19.2 | ✅ Current | HTTP server |
| twilio | ^5.3.2 | ✅ Current | Voice integration (4 files) |
| @supabase/supabase-js | ^2.45.0 | ✅ Current | Backend integration |
| dotenv | ^16.4.5 | ✅ Current | Environment variables |
| winston | ^3.14.2 | ⚠️ Consider | Could optimize (see section 4) |
| **axios** | ^1.7.7 | ❌ **UNUSED** | **Remove** |

---

## 6. Recommended Actions (Priority Order)

### 🔴 High Priority (Do Immediately)

1. **Remove unused dependencies**
   ```bash
   cd /home/user/agentflow/frontend && npm uninstall recharts
   cd /home/user/agentflow/websocket-server && npm uninstall axios
   npm install  # Re-lock dependencies
   ```

2. **Standardize ESLint across workspaces**
   ```bash
   cd /home/user/agentflow/websocket-server
   npm install --save-dev eslint@^9.39.2 @typescript-eslint/eslint-plugin@^8.0.0 @typescript-eslint/parser@^8.0.0
   # Update .eslintrc configuration if needed
   ```

### 🟡 Medium Priority (Next Sprint)

3. **Standardize TypeScript versions**
   ```bash
   # Update package.json in websocket-server and shared
   # Change "typescript": "^5.6.2" to "typescript": "^5.9.3"
   npm install
   ```

4. **Verify all dependencies are still needed**
   - Audit imports periodically
   - Consider using tools like `depcheck` or `knip`

### 🟢 Low Priority (Consider for Future)

5. **Evaluate winston vs pino** for logging (if performance matters)

6. **Set up automated dependency updates**
   - Use Dependabot or Renovate Bot
   - Enable automated security patches

7. **Monitor bundle sizes**
   - Use `next bundle-analyzer` for frontend
   - Track dependency size trends

---

## 7. Maintenance Best Practices

### Regular Audits
```bash
# Run monthly
npm audit
npm outdated

# Check for unused dependencies
npx depcheck
```

### Keep Dependencies Updated
```bash
# Update all minor/patch versions
npm update

# Major version updates (review breaking changes first)
npm outdated
# Then update selectively
```

### Before Adding New Dependencies

Ask:
1. Is this package actively maintained?
2. What's the bundle size impact?
3. Can we achieve this with existing dependencies?
4. Is the package tree-shakeable?
5. Are there lighter alternatives?

---

## 8. Summary Metrics

| Metric | Current | After Cleanup | Change |
|--------|---------|---------------|--------|
| Total Dependencies | 773 | ~750-760 | -13 to -23 |
| Unused Packages | 2 | 0 | -2 |
| Frontend Prod Deps | 24 | 23 | -1 |
| WebSocket Prod Deps | 6 | 5 | -1 |
| Security Issues | 0 | 0 | 0 |
| ESLint Versions | 2 | 1 | Unified |

---

## Conclusion

The project has a **healthy dependency profile** with no security vulnerabilities. The main issues are:

1. **Two unused packages** adding unnecessary bloat
2. **ESLint version inconsistency** affecting development workflow
3. **Minor TypeScript version differences** (non-critical)

Implementing the high-priority recommendations will:
- Reduce bundle size by ~500KB+
- Standardize tooling across workspaces
- Improve build consistency and developer experience

**Overall Grade: B+** (would be A after implementing high-priority fixes)
