# API contract metadata

`src/api` stores the robot's typed HTTP metadata and response DTOs. The Go service's `docs/openapi.yaml` is authoritative: update the operation metadata and DTO parser together when its contract changes.

This checkout does not currently define a `test:contracts` script or contain the referenced `test/*_contracts.mjs` suite. After changing API metadata or DTO parsing, run `tsgo` and `yarn lint:fix` in this repository, then verify the corresponding service contract with the Go repository's `make docs-check`. These checks do not prove gameplay behavior or live platform delivery.

Metadata is maintained in domain `operations.ts` files; DTOs, domain exports and `registry.ts` remain independently reviewed because OpenAPI's generic `data` envelope does not describe all gameplay payloads. Each operation must retain its method, path, parameter and authentication semantics from Go OpenAPI.

Robot requests use `xiuxian-game.backend.api_base_url` with `api_base_path` (default `/api`) when the primary origin is configured. For example, `/channel-api/v2/robot/home-overview` must be rewritten to `/api/v2/robot/home-overview` by the gateway. Without a primary origin the robot uses `api_url` with the standard `/api` prefix.

When three primary requests fail within a rolling 60-second window, new requests use `api_url` with `/api`. Network errors, timeouts, gateway errors (502/503/504), route-level 404s and invalid SDK responses count toward the threshold. The triggering request keeps its original result. Both origins must point at the same game environment and accept the configured credentials. Set a valid fallback origin to enable switching. The selected fallback lasts until the process restarts or the endpoint configuration changes.

The robot notification adapter consumes the internal `/api/v1/internal/notification-relay/events/stream` SSE with native `fetch` because it is a persistent stream, then uses the existing relay `claim`/`ack`/`retry` HTTP calls for durable delivery. The stream contract is documented in the Go OpenAPI.

Do not put gameplay settlement, eligibility, rewards, costs, cooldowns or derived state in this layer. The robot validates transport payloads, calls Go and renders the returned facts.
