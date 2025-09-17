class RequestTemplateBuilder {
  private template: Record<string, string> = {};

  header(sourceKey: string, targetKey?: string) {
    this.template[targetKey || sourceKey] = "$input.params().header." + sourceKey;
    return this;
  }
  body(sourceKey: string, targetKey?: string) {
    this.template[targetKey || sourceKey] = `$input.json('$.${sourceKey}')`;
    return this;
  }
  path(sourceKey: string, targetKey?: string) {
    this.template[targetKey || sourceKey] = "$input.params().path." + sourceKey;
    return this;
  }
  query(sourceKey: string, targetKey?: string) {
    this.template[targetKey || sourceKey] = "$input.params().querystring." + sourceKey;
    return this;
  }
  build() {
    return `{${Object.entries(this.template).map(([k, v]) => `"${k}":${v.startsWith("$input.json") ? v : `"${v}"`}`)}}`;
  }
}

export function requestTemplate() {
  return new RequestTemplateBuilder();
}
