//#region src/response/config.ts
const selects = onSelects([
	"message.create",
	"private.message.create",
	"private.interaction.create",
	"interaction.create"
]);

//#endregion
export { selects };