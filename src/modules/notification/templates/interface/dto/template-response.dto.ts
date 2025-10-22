export class TemplateResponseDto {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject: string;
  body: string;
  language: string;
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateListResponseDto {
  templates: TemplateResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RenderedTemplateResponseDto {
  subject: string;
  body: string;
  variables: Record<string, any>;
}
