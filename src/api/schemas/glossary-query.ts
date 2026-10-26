/** Display fields retained from the existing glossary entry model. */
export interface GlossaryQueryEntry {
  id: number;
  keyword: string;
  content: string;
  category: string;
  authorName: string;
  editCount: number;
  lastEditorName: string;
}
export interface GlossaryQueryPage {
  items: GlossaryQueryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GlossaryQueryCursor {
  items: GlossaryQueryEntry[];
  nextCursor?: string;
}
