import { createQuoteMarkdown } from "../../utils/messageHelper.js";

//#region src/response/itemDetail/builders.ts
/** Shared renderer for the server-owned item, equipment, tool and skill detail view. */
const renderDetailView = (md, facts) => {
	for (const block of facts.view) switch (block.kind) {
		case "text":
			md.addText(block.text ?? "");
			break;
		case "newline":
			md.addNewline();
			break;
		case "quote":
			md.addBlockquote(createQuoteMarkdown((block.text ?? "").split("\n")));
			break;
		case "source": md.addBlockquote(createQuoteMarkdown([block.text ?? ""], block.command ? [{
			label: "前往",
			command: block.command
		}] : []));
	}
};
const buildItemDetail = (_item, _grade, md, _uid, facts) => {
	renderDetailView(md, facts);
};
const buildEquipmentDetail = (_equip, _grade, md, facts) => renderDetailView(md, facts);
const buildProfessionToolDetail = (_tool, _grade, md, facts) => renderDetailView(md, facts);
const buildSkillBookDetail = (_skillBook, _grade, md, facts) => renderDetailView(md, facts);

//#endregion
export { buildEquipmentDetail, buildItemDetail, buildProfessionToolDetail, buildSkillBookDetail, renderDetailView };