# Graph Report - web-naive-polished  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 526 nodes · 644 edges · 37 communities (18 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9d0c9980`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28

## God Nodes (most connected - your core abstractions)
1. `loadFromTemplateOnFirstRun()` - 19 edges
2. `ChartConfigItem` - 9 edges
3. `useAuthStore` - 9 edges
4. `scripts` - 8 edges
5. `DisplayColumn` - 6 edges
6. `createCharts()` - 6 edges
7. `createRequestClient()` - 6 edges
8. `dbApi` - 6 edges
9. `loadData()` - 5 edges
10. `cnToEnField()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `ChartCard` --references--> `ChartConfigItem`  [EXTRACTED]
  src/views/power-compare/index.vue → src/api/db.ts
- `generateAccess()` --indirect_call--> `BasicLayout()`  [INFERRED]
  src/router/access.ts → src/layouts/index.ts
- `generateAccess()` --indirect_call--> `IFrameView()`  [INFERRED]
  src/router/access.ts → src/layouts/index.ts
- `doReAuthenticate()` --calls--> `useAuthStore`  [EXTRACTED]
  src/api/request.ts → src/store/auth.ts
- `generateAccess()` --calls--> `getAllMenusApi()`  [EXTRACTED]
  src/router/access.ts → src/api/core/menu.ts

## Import Cycles
- 3-file cycle: `src/api/core/auth.ts -> src/api/request.ts -> src/api/core/index.ts -> src/api/core/auth.ts`
- 3-file cycle: `src/api/core/index.ts -> src/api/core/menu.ts -> src/api/request.ts -> src/api/core/index.ts`
- 3-file cycle: `src/api/core/index.ts -> src/api/core/user.ts -> src/api/request.ts -> src/api/core/index.ts`

## Communities (37 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (35): AllDataResponse, ApiResponse, CategoryData, CategoryInfo, CategoryInfoConfig, CategoryInfoData, CategoryPowerConfig, CategoryPowerData (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (43): concurrently, echarts, naive-ui, dependencies, concurrently, echarts, naive-ui, pinia (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (35): allChartRows, allProducts, assignProductColor(), category, categoryName, chartCards, chartColors, chartConfigs (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (36): app, categoryNameToKey(), CHART_TYPE_MAP, CN_TO_EN_RESERVED, cnToEnField(), createTable(), dbConfig, detectFieldTypes() (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): getAllMenusApi(), isAdmin, route, router, username, userRole, AuthPageLayout(), BasicLayout() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (16): NButton, NCheckbox, NCheckboxGroup, NDatePicker, NDivider, NInput, NInputNumber, NRadio (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (20): initComponentAdapter(), withDefaultPlaceholder(), initSetupVbenForm(), { commonTokens }, themeOverrides, tokenDateLocale, tokenLocale, tokenTheme (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (16): ComponentType, VbenFormSchema, formSchema, MOCK_ROLES_OPTIONS, profileBaseSettingRef, tabs, tabsValue, userStore (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (19): { dialog, loadingBar, message, modal, notification }, themeOverridesProviderProps, themeProviderProps, AuthApi, getAccessCodesApi(), loginApi(), LoginParams, LoginResult (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (18): chartRef, { renderEcharts }, chartRef, chartRef, { renderEcharts }, { renderEcharts }, chartRef, { renderEcharts } (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (16): accessStore, authStore, avatar, { destroyWatermark, updateWatermark }, menus, notifications, router, showDot (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (23): author, email, name, url, bugs, homepage, imports, license (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (18): activeCategory, activeCategoryInfoData, activeCategoryPowerData, activeSubTab, allData, categories, fileInputRef, handleDeleteInfo() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (12): getImageUrl(), allData, brandModels, brands, category, categoryName, displayFields, hasSelectedProducts (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (18): adm-zip, cors, express, multer, mysql2, dependencies, adm-zip, cors (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (11): src/**/*.ts, src/**/*.tsx, src/**/*.vue, @vben/tsconfig/web-app.json, compilerOptions, baseUrl, paths, extends (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (9): @vben/tsconfig/node.json, vite.config.mts, compilerOptions, composite, noEmit, tsBuildInfoFile, extends, include (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.40
Nodes (4): cellImagesRels, cellImagesXml, imageEntry, zip

## Knowledge Gaps
- **261 isolated node(s):** `ApiResponse`, `CategoryData`, `CategoryInfoConfig`, `CategoryInfoData`, `CategoryPowerConfig` (+256 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 335 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbApi` connect `Community 0` to `Community 2`, `Community 12`, `Community 13`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 8` to `Community 10`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 1` to `Community 11`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `ApiResponse`, `CategoryData`, `CategoryInfoConfig` to the rest of the system?**
  _261 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05612244897959184 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07017543859649122 - nodes in this community are weakly interconnected._