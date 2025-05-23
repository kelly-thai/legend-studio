/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @finos/legend/enforce-module-import-hierarchy */
import type {
  ClassifierPathMapping,
  SubtypeInfo,
} from '../action/protocol/ProtocolInfo.js';
import axios, { type AxiosResponse, AxiosError } from 'axios';
import {
  ContentType,
  HttpHeader,
  type PlainObject,
} from '@finos/legend-shared';
import type { V1_ExecutionResult } from '../protocol/pure/v1/engine/execution/V1_ExecutionResult.js';
import { V1_ExecuteInput } from '../protocol/pure/v1/engine/execution/V1_ExecuteInput.js';
import type { V1_PureModelContext } from '../protocol/pure/v1/model/context/V1_PureModelContext.js';
import type { V1_ValueSpecification } from '../protocol/pure/v1/model/valueSpecification/V1_ValueSpecification.js';
import {
  V1_ArtifactGenerationExtensionInput,
  type V1_ArtifactGenerationExtensionOutput,
} from '../protocol/pure/v1/engine/generation/V1_ArtifactGenerationExtensionApi.js';
import type { V1_Lambda } from '../protocol/pure/v1/model/valueSpecification/raw/V1_Lambda.js';
import type { V1_RelationType } from '../protocol/pure/v1/model/packageableElements/type/V1_RelationType.js';
import type {
  V1_LambdaReturnTypeInput,
  V1_LambdaReturnTypeResult,
} from '../protocol/pure/v1/engine/compilation/V1_LambdaReturnType.js';
import type { V1_RawLambda } from '../protocol/pure/v1/model/rawValueSpecification/V1_RawLambda.js';

export const ENGINE_TEST_SUPPORT_API_URL = 'http://localhost:6300/api';

export { AxiosError as ENGINE_TEST_SUPPORT__NetworkClientError };

export async function ENGINE_TEST_SUPPORT__getClassifierPathMapping(): Promise<
  ClassifierPathMapping[]
> {
  return (
    await axios.get<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/protocol/pure/getClassifierPathMap`,
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__getSubtypeInfo(): Promise<SubtypeInfo> {
  return (
    await axios.get<unknown, AxiosResponse<SubtypeInfo>>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/protocol/pure/getSubtypeInfo`,
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__execute(
  executionInput: V1_ExecuteInput,
): Promise<PlainObject<V1_ExecutionResult>> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/execution/execute`,
      V1_ExecuteInput.serialization.toJson(executionInput),
      {
        headers: {
          [HttpHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON,
        },
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__grammarToJSON_model(
  code: string,
  returnSourceInformation?: boolean | undefined,
): Promise<{ elements: object[] }> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/grammar/grammarToJson/model`,
      code,
      {
        headers: {
          [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
        },
        params: {
          returnSourceInformation,
        },
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__grammarToJSON_lambda(
  code: string,
  returnSourceInformation?: boolean | undefined,
): Promise<PlainObject<V1_ValueSpecification>> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/grammar/grammarToJson/lambda`,
      code,
      {
        headers: {
          [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
        },
        params: {
          returnSourceInformation,
        },
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__grammarToJSON_valueSpecification(
  code: string,
  returnSourceInformation?: boolean | undefined,
): Promise<PlainObject<V1_ValueSpecification>> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/grammar/grammarToJson/valueSpecification`,
      code,
      {
        headers: {
          [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
        },
        params: {
          returnSourceInformation,
        },
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__JSONToGrammar_model(
  model: PlainObject<V1_PureModelContext>,
  pretty?: boolean | undefined,
): Promise<string> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/grammar/jsonToGrammar/model`,
      model,
      {
        headers: {
          [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN,
        },
        params: {
          renderStyle: pretty ? 'PRETTY' : 'STANDARD',
        },
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__JSONToGrammar_valueSpecification(
  value: PlainObject<V1_ValueSpecification>,
  pretty?: boolean | undefined,
): Promise<string> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/grammar/jsonToGrammar/valueSpecification`,
      value,
      {
        headers: {
          [HttpHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON,
          [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN,
        },
        params: {
          renderStyle: pretty ? 'PRETTY' : 'STANDARD',
        },
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__JSONToGrammar_lambda(
  value: PlainObject<V1_Lambda>,
  pretty?: boolean | undefined,
): Promise<string> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/grammar/jsonToGrammar/lambda`,
      value,
      {
        headers: {
          [HttpHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON,
          [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN,
        },
        params: {
          renderStyle: pretty ? 'PRETTY' : 'STANDARD',
        },
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__compile(
  model: PlainObject<V1_PureModelContext>,
): Promise<AxiosResponse<{ message: string }>> {
  return axios.post<unknown, AxiosResponse>(
    `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/compilation/compile`,
    model,
  );
}

export async function ENGINE_TEST_SUPPORT__getLambdaReturnType(
  lambda: PlainObject<V1_LambdaReturnTypeInput>,
  model: PlainObject<V1_PureModelContext>,
): Promise<PlainObject<V1_LambdaReturnTypeResult>> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/compilation/lambdaReturnType`,
      {
        lambda,
        model,
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__getLambdaRelationType(
  lambda: PlainObject<V1_Lambda>,
  model: PlainObject<V1_PureModelContext>,
): Promise<PlainObject<V1_RelationType>> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/compilation/lambdaRelationType`,
      {
        lambda,
        model,
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__transformTdsToRelation_lambda(
  lambda: PlainObject<V1_Lambda>,
  model: PlainObject<V1_PureModelContext>,
): Promise<PlainObject<V1_RawLambda>> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/compilation/autofix/transformTdsToRelation/lambda`,
      {
        lambda,
        model,
      },
    )
  ).data;
}

export async function ENGINE_TEST_SUPPORT__generateArtifacts(
  input: V1_ArtifactGenerationExtensionInput,
): Promise<PlainObject<V1_ArtifactGenerationExtensionOutput>> {
  return (
    await axios.post<unknown, AxiosResponse>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/generation/generateArtifacts`,
      V1_ArtifactGenerationExtensionInput.serialization.toJson(input),
    )
  ).data;
}
