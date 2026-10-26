//#region src/api/core/error.ts
var SDKError = class extends Error {
	code;
	status;
	requestId;
	details;
	constructor(message, options) {
		super(message);
		this.name = "SDKError";
		this.code = options.code;
		this.status = options.status;
		this.requestId = options.requestId;
		this.details = options.details;
	}
};

//#endregion
export { SDKError };