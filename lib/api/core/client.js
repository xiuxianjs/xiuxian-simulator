import { SDKError } from "./error.js";
import { fail, headerValue, isParameterRecord, isRecord, isValidTimeout, parameterScalar, protectedHeaders, redact, validateParameter } from "./helpers.js";
import { parseExactJSON } from "./exact-json.js";
import { operationDefinitions } from "../registry.js";
import axios from "axios";

//#region src/api/core/client.ts
var APIClient = class {
	origin;
	identity;
	http;
	timeoutMs;
	onTiming;
	onPresentation;
	constructor(options) {
		let url;
		try {
			url = new URL(options.baseUrl);
		} catch {
			fail("baseUrl must be an HTTP(S) origin");
		}
		if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") fail("baseUrl must be an HTTP(S) origin without credentials, path, query or fragment");
		this.origin = url.origin;
		this.onTiming = options.onTiming;
		this.onPresentation = options.onPresentation;
		this.identity = { ...options.identity ?? { kind: "public" } };
		this.http = axios.create({
			...options.connectionPools,
			adapter: options.adapter ?? ["http", "fetch"],
			maxRedirects: 0,
			fetchOptions: {
				redirect: "error",
				credentials: "omit"
			},
			withCredentials: false,
			validateStatus: () => true,
			responseType: "text",
			transformResponse: []
		});
		this.timeoutMs = options.timeoutMs ?? 1e4;
		if (!isValidTimeout(this.timeoutMs)) fail("timeoutMs must be between 1 and 2147483647 milliseconds");
	}
	async request(operationId, ...args) {
		let stage = "api.sdk.prepare";
		let stageStartedAt = performance.now();
		let stageOutcome = "rejected";
		const finishStage = () => {
			const finishedAt = performance.now();
			try {
				this.onTiming?.(stage, stageStartedAt, finishedAt, stageOutcome);
			} catch {}
		};
		const nextStage = (name) => {
			stageOutcome = "fulfilled";
			finishStage();
			stage = name;
			stageStartedAt = performance.now();
			stageOutcome = "rejected";
		};
		try {
			if (args[0] !== void 0 && !isParameterRecord(args[0])) fail("Request options must be an object");
			const options = args[0] ?? {};
			const requestId = headerValue(options.requestId ?? globalThis.crypto?.randomUUID?.() ?? "", "requestId");
			if (!Object.prototype.hasOwnProperty.call(operationDefinitions, operationId)) fail("Unknown operation", requestId);
			const definition = operationDefinitions[operationId];
			for (const [kind, value, parameters] of [[
				"path",
				options.path,
				definition.pathParams
			], [
				"query",
				options.query,
				definition.queryParams
			]]) {
				if (value === void 0) continue;
				if (!isParameterRecord(value)) fail(`${kind} parameters must be an object`, requestId);
				for (const name of Object.keys(value)) if (!parameters.some((parameter) => parameter.name === name)) fail(`Unknown ${kind} parameter ${name}`, requestId);
			}
			let headers;
			try {
				headers = new Headers(options.headers);
			} catch {
				fail("Invalid request headers", requestId);
			}
			for (const name of headers.keys()) if (protectedHeaders.has(name.toLowerCase())) fail(`Header ${name} is managed by the SDK`, requestId);
			headers.set("X-Request-ID", requestId);
			const security = definition.security;
			if (!(security.length === 0 || security.some((requirement) => Object.keys(requirement).length === 0))) {
				const names = this.identity.kind === "robot" ? ["RobotBearer", "RobotBid"] : this.identity.kind === "user" ? ["UserBearer"] : this.identity.kind === "worker" ? ["WorkerToken"] : [];
				if (!security.some((requirement) => Object.keys(requirement).every((name) => names.includes(name)))) throw new SDKError("Identity is not permitted for this operation", {
					code: "SDK_AUTH_REQUIRED",
					requestId
				});
				if (this.identity.kind === "public" || typeof this.identity.token !== "string" || !this.identity.token.trim() || /[^\x20-\x7e]/.test(this.identity.token)) fail("A non-empty printable ASCII token is required", requestId);
				if (this.identity.kind === "worker") headers.set("X-Worker-Token", this.identity.token);
				else headers.set("Authorization", `Bearer ${this.identity.token}`);
				if (this.identity.kind === "robot") {
					if (typeof this.identity.bid !== "string" || this.identity.bid.length === 0 || this.identity.bid.trim() !== this.identity.bid || this.identity.bid.length > 255 || this.identity.bid.includes(",") || /[^\x20-\x7e]/.test(this.identity.bid)) fail("A single printable ASCII robot bid of 1 to 255 bytes without surrounding whitespace is required", requestId);
					headers.set("X-Bid", this.identity.bid);
				}
			}
			if (options.idempotencyKey !== void 0 || definition.headerParams.some((parameter) => parameter.name.toLowerCase() === "idempotency-key" && parameter.required)) headers.set("Idempotency-Key", headerValue(options.idempotencyKey ?? "", "idempotencyKey", requestId));
			let path = definition.path;
			for (const parameter of definition.pathParams) {
				const value = options.path?.[parameter.name];
				if (typeof value !== "string" && typeof value !== "number" || String(value) === "" || typeof value === "number" && !Number.isFinite(value)) fail(`Missing or invalid path parameter ${parameter.name}`, requestId);
				validateParameter(value, parameter.schema, parameter.name, requestId);
				if (value === "." || value === "..") fail(`Invalid path parameter ${parameter.name}`, requestId);
				path = path.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
			}
			const url = new URL(path, this.origin);
			for (const parameter of definition.queryParams) {
				const value = options.query?.[parameter.name];
				if (value === void 0 || value === null) {
					if (parameter.required) fail(`Missing query parameter ${parameter.name}`, requestId);
					continue;
				}
				validateParameter(value, parameter.schema, parameter.name, requestId);
				url.searchParams.set(parameter.name, parameterScalar(value, parameter.name, requestId));
			}
			for (const parameter of definition.headerParams) if (parameter.required && !headers.has(parameter.name)) fail(`Missing header ${parameter.name}`, requestId);
			if (definition.bodyRequired && options.body === void 0) fail("Request body is required", requestId);
			let body;
			if (options.body !== void 0) {
				const contentType = definition.requestContentType;
				if (!contentType) fail("This operation does not accept a body", requestId);
				headers.set("Content-Type", contentType);
				if (contentType === "application/x-www-form-urlencoded") {
					if (!isRecord(options.body)) fail("Form body must be an object", requestId);
					const form = new URLSearchParams();
					for (const [key, value] of Object.entries(options.body)) if (value !== void 0 && value !== null) form.set(key, String(value));
					body = form.toString();
				} else if (contentType.includes("json")) {
					try {
						body = JSON.stringify(options.body, (_key, value) => {
							if (typeof value === "number" && (!Number.isFinite(value) || Number.isInteger(value) && !Number.isSafeInteger(value))) fail("JSON body must not contain non-finite or imprecise integers", requestId);
							return value;
						});
					} catch {
						fail("Body is not JSON serializable", requestId);
					}
					if (body === void 0) fail("Body is not JSON serializable", requestId);
				} else if (typeof options.body === "string") body = options.body;
				else fail("Unsupported request body content type", requestId);
			}
			const timeoutMs = options.timeoutMs ?? this.timeoutMs;
			if (!isValidTimeout(timeoutMs)) fail("timeoutMs must be between 1 and 2147483647 milliseconds", requestId);
			const controller = new AbortController();
			let timedOut = false;
			const onAbort = () => controller.abort();
			options.signal?.addEventListener("abort", onAbort, { once: true });
			if (options.signal?.aborted) controller.abort();
			const timer = setTimeout(() => {
				if (!controller.signal.aborted) {
					timedOut = true;
					controller.abort();
				}
			}, timeoutMs);
			try {
				if (controller.signal.aborted) throw new SDKError("Request aborted", {
					code: "SDK_ABORTED",
					requestId
				});
				nextStage("api.http.wait");
				const response = await this.http.request({
					url: url.toString(),
					method: definition.method,
					headers: Object.fromEntries(headers.entries()),
					data: body,
					signal: controller.signal,
					transformRequest: [(value) => value]
				});
				nextStage("api.sdk.response");
				const ok = response.status >= 200 && response.status < 300;
				const serverRequestId = response.headers["x-request-id"];
				const responseRequestId = redact(typeof serverRequestId === "string" && serverRequestId.length ? serverRequestId : requestId, this.identity.kind === "public" ? void 0 : this.identity.token);
				const text = response.data;
				let payload;
				nextStage("api.json.parse");
				if (text && (definition.responseKind === "json" || !ok)) try {
					payload = parseExactJSON(text);
				} catch {
					if (ok) throw new SDKError("Invalid JSON response", {
						code: "SDK_INVALID_RESPONSE",
						status: response.status,
						requestId: responseRequestId
					});
				}
				nextStage("api.sdk.envelope");
				if (!ok) {
					if (isRecord(payload) && payload.presentation !== void 0) try {
						this.onPresentation?.(payload.presentation);
					} catch {}
					const error = isRecord(payload) && isRecord(payload.error) ? payload.error : void 0;
					const secret = this.identity.kind === "public" ? void 0 : this.identity.token;
					throw new SDKError(redact(typeof error?.message === "string" ? error.message : `HTTP ${response.status}`, secret), {
						code: redact(typeof error?.code === "string" ? error.code : "SDK_HTTP_ERROR", secret),
						status: response.status,
						requestId: redact(responseRequestId, secret),
						details: redact(error?.details, secret)
					});
				}
				if (definition.responseKind === "void") {
					stageOutcome = "fulfilled";
					return;
				}
				if (definition.responseKind === "text") {
					stageOutcome = "fulfilled";
					return text;
				}
				if (!text) throw new SDKError("Expected a JSON response body", {
					code: "SDK_INVALID_RESPONSE",
					status: response.status,
					requestId: responseRequestId
				});
				if (definition.responseEnvelope) {
					if (!isRecord(payload) || !Object.prototype.hasOwnProperty.call(payload, "data")) throw new SDKError("Response is missing data", {
						code: "SDK_INVALID_RESPONSE",
						status: response.status,
						requestId: responseRequestId
					});
					if (payload.error !== void 0 && payload.error !== null) throw new SDKError("Response contains an error", {
						code: "SDK_INVALID_RESPONSE",
						status: response.status,
						requestId: responseRequestId
					});
					if (payload.presentation !== void 0) try {
						this.onPresentation?.(payload.presentation);
					} catch {}
					stageOutcome = "fulfilled";
					return payload.data;
				}
				stageOutcome = "fulfilled";
				return payload;
			} catch (error) {
				if (error instanceof SDKError) throw error;
				throw new SDKError(timedOut ? "Request timed out" : controller.signal.aborted ? "Request aborted" : "Network request failed", {
					code: timedOut ? "SDK_TIMEOUT" : controller.signal.aborted ? "SDK_ABORTED" : "SDK_NETWORK_ERROR",
					requestId
				});
			} finally {
				clearTimeout(timer);
				options.signal?.removeEventListener("abort", onAbort);
			}
		} finally {
			finishStage();
		}
	}
};
function createClient(options) {
	return new APIClient(options);
}

//#endregion
export { APIClient, createClient };