declare class Builder {
  constructor(rosemary: unknown);
  useTemplate(templateName: string): this;
  addVisualization(type: string, data: object, options?: object): this;
  build(outputPath: string, options?: { serve?: boolean; port?: number }): string | void;
}

export = Builder;
