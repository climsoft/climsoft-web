export interface ElementModel {
  id: number;

  name: string;

  abbreviation: string;

  description: string;

  typeId: number;

  lowerLimit: number | null;

  upperLimit: number | null;

  entryScaleFactor: number | null;

  comment: string | null;

  entryUserId?: string;

  entryDateTime?: string;
}