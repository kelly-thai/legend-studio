import type { PlainObject } from '@finos/legend-shared';

export class AdhocDataProductDeployResponse {
  content!: PlainObject;
}

export const createAdhocDataProductDeployResponse = (
  json: PlainObject<AdhocDataProductDeployResponse>,
): AdhocDataProductDeployResponse => {
  const response = new AdhocDataProductDeployResponse();
  response.content = json;
  return response;
};
