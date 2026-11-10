# API contract metadata

`src/api` stores the robot's typed HTTP metadata and response DTOs. The Go service's `docs/openapi.yaml` is authoritative: update the operation metadata and DTO parser together when its contract changes.

This checkout does not currently define a `test:contracts` script or contain the referenced `test/*_contracts.mjs` suite. After changing API metadata or DTO parsing, run `tsgo` and `yarn lint:fix` in this repository, then verify the corresponding service contract with the Go repository's `make docs-check`. These checks do not prove gameplay behavior or live platform delivery.

Metadata is maintained in domain `operations.ts` files; DTOs, domain exports and `registry.ts` remain independently reviewed because OpenAPI's generic `data` envelope does not describe all gameplay payloads. Each operation must retain its method, path, parameter and authentication semantics from Go OpenAPI.

SDK requests are restricted to canonical `/api/` operations. The existing `xiuxian-game.backend.api_url` is used unless `api_base_url` supplies an override. Set `api_base_path` (SDK option `apiBase`) to replace the default `/api` prefix, for example `/api/v2/robot/home-overview` becomes `/channel-api/v2/robot/home-overview`. The gateway must rewrite the alternate prefix to `/api` on the selected upstream. The same setting applies to direct game-backend requests such as chat and notification delivery. Publish the backend with the new chat routes before updating the robot.

The robot notification adapter consumes the internal `/api/v1/internal/notification-relay/events/stream` SSE with native `fetch` because it is a persistent stream, then uses the existing relay `claim`/`ack`/`retry` HTTP calls for durable delivery. The stream contract is documented in the Go OpenAPI.

Do not put gameplay settlement, eligibility, rewards, costs, cooldowns or derived state in this layer. The robot validates transport payloads, calls Go and renders the returned facts.
