# web-vue quick reference

The canonical frontend uses Pinia setup stores under `src/stores/` and feature-local stores under
`src/features/`. HTTP access goes through `@tgb-resolver/contracts`; realtime and domain types go
through `@tgb-resolver/realtime`.

| React model | Vue store |
| --- | --- |
| `showModel` | `useShowStore` |
| `realtimeModel` | `useRealtimeStore` |
| `playbackModel` | `usePlaybackStore` |
| `leaderboardModel` | `useLeaderboardStore` |
| `animationsModel` | `useAnimationsStore` |
| `assetsManagerModel` | `useAssetsManagerStore` |

Use Panda recipes and styled-system components for UI styling. Use `motion-v` for declarative
animation and vanilla `motion` for imperative hot-path animation.
