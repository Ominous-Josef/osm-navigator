# Architecture Decision Records

An ADR captures one significant architectural decision: the context, the options considered, the choice made, and its consequences. ADRs are **append-only**. To change a decision, write a new ADR that supersedes the old one and update the old one's status. Don't rewrite history.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [0001](./0001-native-map-rendering-strategy.md) | Native map rendering strategy | Accepted | 2026-10-04 |
| [0002](./0002-expo-sdk-57-baseline.md) | Expo SDK 57 baseline | Accepted | 2026-10-04 |

## Writing a new ADR

1. Copy [`template.md`](./template.md) to `NNNN-short-kebab-title.md` using the next number.
2. Fill in every section. Keep it short; link out for detail.
3. Add a row to the index above.
4. Open a PR. The ADR is `Proposed` until merged, then `Accepted`.

**Statuses:** `Proposed` · `Accepted` · `Deprecated` · `Superseded by NNNN`
