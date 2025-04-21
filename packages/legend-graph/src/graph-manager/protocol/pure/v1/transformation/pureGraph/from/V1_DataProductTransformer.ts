import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  LakehouseAccessPoint,
  UnknownAccessPoint,
  type DataProduct,
} from '../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  V1_DataProduct,
  V1_LakehouseAccessPoint,
  V1_UnknownAccessPoint,
} from '../../../model/packageableElements/dataProduct/V1_DataProduct.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import { V1_transformRawLambda } from './V1_RawValueSpecificationTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';

export const V1_transformDataProduct = (
  element: DataProduct,
  context: V1_GraphTransformerContext,
): V1_DataProduct => {
  const product = new V1_DataProduct();
  V1_initPackageableElement(product, element);
  product.accessPoints = element.accessPoints.map((ap) => {
    if (ap instanceof LakehouseAccessPoint) {
      const lake = new V1_LakehouseAccessPoint();
      lake.id = ap.id;
      lake.func = V1_transformRawLambda(ap.func, context);
      lake.targetEnvironment = ap.targetEnvironment;
      return lake;
    } else if (ap instanceof UnknownAccessPoint) {
      const un = new V1_UnknownAccessPoint();
      un.content = ap.content;
      un.id = ap.id;
      return un;
    }
    throw new UnsupportedOperationError(
      `Unable to transform data product access point`,
    );
  });

  return product;
};
