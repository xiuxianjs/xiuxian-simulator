/** Service-authoritative result of replacing one profession-tool instance. */
export interface ProfessionToolReplaceResponse {
  toolId: number;
  userToolId: number;
  toolName: string;
  typeName: string;
  gradeName: string;
  gradeLevel: number;
  message: string;
}
