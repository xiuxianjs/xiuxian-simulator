import type { EncyclopediaDetailFacts } from './encyclopedia';

export interface ItemDetailMemorial {
  userName: string | null;
  partnerName: string | null;
  companionSince: string | null;
}
export interface ItemDetailFacts extends EncyclopediaDetailFacts {
  memorial: ItemDetailMemorial | null;
}
export interface ItemDetailQueryData {
  entries: Array<
    EncyclopediaDetailFacts & {
      category: 'item' | 'equipment' | 'profession_tool' | 'skill_book';
      record: Record<string, any>;
      grade: Record<string, any> | null;
    }
  >;
  memorial: ItemDetailMemorial | null;
}
