import { activeFeatureText, isRetiredCommand, mentionsRetiredFeature } from "../response/retiredFeatures.js";

//#region src/expose/active-design.ts
/** The bot's available design view; never changes server rules or player state. */
function activeDesign(content) {
	const commands = /* @__PURE__ */ new Map();
	for (const [command, id] of Object.entries(content.commandFeatures ?? {})) commands.set(id, [...commands.get(id) ?? [], command]);
	const retiredIds = new Set([...commands].filter(([, paths]) => paths.every(isRetiredCommand)).map(([id]) => id));
	const retiredNames = /* @__PURE__ */ new Set();
	for (const stage of content.featureCatalog ?? []) for (const feature of stage.features) if (retiredIds.has(feature.id) || mentionsRetiredFeature(feature.name)) {
		retiredIds.add(feature.id);
		retiredNames.add(feature.name);
	}
	const activeName = (name) => !retiredNames.has(name) && !mentionsRetiredFeature(name);
	const unlocks = (rows) => rows.map((row) => ({
		...row,
		features: row.features.filter(activeName)
	})).filter((row) => row.features.length > 0);
	const stage = (value) => ({
		...value,
		unlocks: unlocks(value.unlocks)
	});
	return {
		...content,
		intro: activeFeatureText(content.intro),
		realmUnlocks: unlocks(content.realmUnlocks),
		notes: content.notes.filter((note) => !mentionsRetiredFeature(note)),
		...content.currentStage ? { currentStage: stage(content.currentStage) } : {},
		...content.nextStage ? { nextStage: stage(content.nextStage) } : {},
		...content.featureCatalog ? { featureCatalog: content.featureCatalog.map((group) => ({
			...group,
			features: group.features.filter((feature) => !retiredIds.has(feature.id) && activeName(feature.name)).map((feature) => ({
				...feature,
				description: activeFeatureText(feature.description),
				conditions: feature.conditions.filter((condition) => !mentionsRetiredFeature(condition)),
				..."entryPaths" in feature && Array.isArray(feature.entryPaths) ? { entryPaths: feature.entryPaths.filter((path) => typeof path !== "string" || !isRetiredCommand(path)) } : {}
			}))
		})) } : {},
		...content.commandFeatures ? { commandFeatures: Object.fromEntries(Object.entries(content.commandFeatures).filter(([command, id]) => !isRetiredCommand(command) && !retiredIds.has(id))) } : {}
	};
}

//#endregion
export { activeDesign };