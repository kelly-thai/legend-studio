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

import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type AccessPointGroupState,
  AccessPointState,
  DATA_PRODUCT_ACTIVITY,
  DataProductEditorState,
  generateUrlToDeployOnOpen,
  LakehouseAccessPointState,
} from '../../../../stores/editor/editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import {
  clsx,
  LockIcon,
  PanelContent,
  PanelHeader,
  PanelHeaderActions,
  Dialog,
  PanelDivider,
  InputWithInlineValidation,
  useResizeDetector,
  AccessPointIcon,
  TimesIcon,
  PlusIcon,
  PanelHeaderActionItem,
  RocketIcon,
  ListEditor,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  PencilEditIcon,
  PanelFormTextField,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  WarningIcon,
  PanelFormSection,
  ContextMenu,
  VerticalDragHandleIcon,
  useDragPreviewLayer,
  DragPreviewLayer,
  PanelDnDEntry,
  PanelEntryDragHandle,
  HomeIcon,
  QuestionCircleIcon,
  ErrorWarnIcon,
  ErrorIcon,
  GroupWorkIcon,
  ThinChevronDownIcon,
} from '@finos/legend-art';
import React, {
  useRef,
  useState,
  useEffect,
  type ChangeEventHandler,
  useCallback,
} from 'react';
import { filterByType } from '@finos/legend-shared';
import {
  InlineLambdaEditor,
  valueSpecReturnTDS,
} from '@finos/legend-query-builder';
import { action, flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { LakehouseTargetEnv, Email, DataProduct } from '@finos/legend-graph';
import {
  accessPointGroup_setDescription,
  accessPointGroup_setName,
  dataProduct_setDescription,
  dataProduct_setSupportInfoIfAbsent,
  dataProduct_setTitle,
  supportInfo_setDocumentationUrl,
  supportInfo_setWebsite,
  supportInfo_setFaqUrl,
  supportInfo_setSupportUrl,
  supportInfo_addEmail,
  supportInfo_deleteEmail,
  dataProduct_addAccessPointGroup,
  dataProduct_addAccessPoint,
  dataProduct_deleteAccessPoint,
} from '../../../../stores/graph-modifier/DSL_DataProduct_GraphModifierHelper.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationNavigationContext,
} from '@finos/legend-application';
import { useDrag, useDrop } from 'react-dnd';

export enum AP_GROUP_MODAL_ERRORS {
  GROUP_NAME_EMPTY = 'Group Name is empty',
  GROUP_NAME_EXISTS = 'Group Name already exists',
  GROUP_DESCRIPTION_EMPTY = 'Group Description is empty',
  AP_NAME_EMPTY = 'Access Point Name is empty',
  AP_NAME_EXISTS = 'Access Point Name already exists',
  AP_DESCRIPTION_EMPTY = 'Access Point Description is empty',
}

export const AP_EMPTY_DESC_WARNING =
  'Click here to describe the data this access point produces';

//KXT TODO move this to where its used later
const AccessPointDragPreviewLayer: React.FC = () => (
  <DragPreviewLayer
    labelGetter={(item: AccessPointDragSource): string => {
      return item.accessPoint.accessPoint.id ?? 'oops'; //KXT TODO bug??? idk how to fix yet
    }}
    types={['ACCESS_POINT']} //KXT TODO hardcoded
  />
);

const NewAccessPointAccessPoint = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState: dataProductEditorState } = props;
    const accessPointInputRef = useRef<HTMLInputElement>(null);
    const [id, setId] = useState<string | undefined>(undefined);
    const handleIdChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setId(event.target.value);
    const [description, setDescription] = useState<string | undefined>(
      undefined,
    );
    const handleDescriptionChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setDescription(event.target.value);
    const handleClose = () => {
      dataProductEditorState.setAccessPointModal(false);
    };
    const handleSubmit = () => {
      if (id) {
        const accessPointGroup =
          dataProductEditorState.selectedGroupState ?? 'default'; //KXT how to handle this better?
        dataProductEditorState.addAccessPoint(
          id,
          description,
          accessPointGroup,
        );
        handleClose();
      }
    };
    const handleEnter = (): void => {
      accessPointInputRef.current?.focus();
    };
    const disableCreateButton =
      id === '' ||
      id === undefined ||
      description === '' ||
      description === undefined ||
      dataProductEditorState.accessPoints.map((e) => e.id).includes(id);
    const nameErrors =
      id === ''
        ? AP_GROUP_MODAL_ERRORS.AP_NAME_EMPTY
        : dataProductEditorState.accessPoints
              .map((e) => e.id)
              .includes(id ?? '')
          ? AP_GROUP_MODAL_ERRORS.AP_NAME_EXISTS
          : undefined;

    const descriptionErrors =
      description === ''
        ? AP_GROUP_MODAL_ERRORS.AP_DESCRIPTION_EMPTY
        : undefined;
    return (
      <Dialog
        open={true}
        onClose={handleClose}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className={clsx('modal search-modal', {
            'modal--dark': true,
          })}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div className="modal__title">New Access Point</div>
          <div>
            <div className="panel__content__form__section__header__label">
              Name
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              ref={accessPointInputRef}
              spellCheck={false}
              value={id ?? ''}
              onChange={handleIdChange}
              placeholder="Access Point Name"
              error={nameErrors}
            />
          </div>
          <div>
            <div className="panel__content__form__section__header__label">
              Description
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              spellCheck={false}
              value={description ?? ''}
              onChange={handleDescriptionChange}
              placeholder="Access Point Description"
              error={descriptionErrors}
            />
          </div>
          <div></div>
          <PanelDivider />
          <div className="search-modal__actions">
            <button
              className={clsx('btn btn--primary', {
                'btn--dark': true,
              })}
              disabled={disableCreateButton}
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const NewAccessPointGroupModal = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState: dataProductEditorState } = props;
    const accessPointGroupInputRef = useRef<HTMLInputElement>(null);
    const [groupName, setGroupName] = useState<string | undefined>(undefined);
    const handleGroupNameChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setGroupName(event.target.value);
    const [groupDescription, setGroupDescription] = useState<
      string | undefined
    >(undefined);
    const handleGroupDescriptionChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setGroupDescription(event.target.value);
    const [apName, setApName] = useState<string | undefined>(undefined);
    const handleApNameChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setApName(event.target.value);
    const [apDescription, setApDescription] = useState<string | undefined>(
      undefined,
    );
    const handleApDescriptionChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setApDescription(event.target.value);
    const handleClose = () => {
      dataProductEditorState.setAccessPointGroupModal(false);
    };
    const handleEnter = (): void => {
      accessPointGroupInputRef.current?.focus();
    };

    const groupNameErrors =
      groupName === ''
        ? AP_GROUP_MODAL_ERRORS.GROUP_NAME_EMPTY
        : dataProductEditorState.accessPointGroupStates
              .map((e) => e.value.id)
              .includes(groupName ?? '')
          ? AP_GROUP_MODAL_ERRORS.GROUP_NAME_EXISTS
          : undefined;
    const groupDescriptionErrors =
      groupDescription === ''
        ? AP_GROUP_MODAL_ERRORS.GROUP_DESCRIPTION_EMPTY
        : undefined;
    const apNameErrors =
      apName === ''
        ? AP_GROUP_MODAL_ERRORS.AP_NAME_EMPTY
        : dataProductEditorState.accessPoints
              .map((e) => e.id)
              .includes(apName ?? '')
          ? AP_GROUP_MODAL_ERRORS.AP_NAME_EXISTS
          : undefined;
    const apDescriptionErrors =
      apDescription === ''
        ? AP_GROUP_MODAL_ERRORS.AP_DESCRIPTION_EMPTY
        : undefined;

    const disableCreateButton =
      !groupName ||
      !groupDescription ||
      !apName ||
      !apDescription ||
      Boolean(
        groupNameErrors ??
          groupDescriptionErrors ??
          apNameErrors ??
          apDescriptionErrors,
      );
    const handleSubmit = () => {
      if (!disableCreateButton && apName) {
        const createdGroup = dataProductEditorState.createGroupAndAdd(
          groupName,
          groupDescription,
        );
        dataProductEditorState.addAccessPoint(
          apName,
          apDescription,
          createdGroup,
        );
        handleClose();
      }
    };

    return (
      <Dialog
        open={true}
        onClose={handleClose}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className={clsx('modal search-modal', {
            'modal--dark': true,
          })}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div className="modal__title">New Access Point Group</div>
          <div>
            <div className="panel__content__form__section__header__label">
              Group Name
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              ref={accessPointGroupInputRef}
              spellCheck={false}
              value={groupName ?? ''}
              onChange={handleGroupNameChange}
              placeholder="Access Point Group Name"
              error={groupNameErrors}
            />
          </div>
          <div>
            <div className="panel__content__form__section__header__label">
              Group Description
            </div>
            <InputWithInlineValidation
              className={clsx('input new-access-point-modal__id-input', {
                'input--dark': true,
              })}
              spellCheck={false}
              value={groupDescription ?? ''}
              onChange={handleGroupDescriptionChange}
              placeholder="Access Point Group Description"
              error={groupDescriptionErrors}
            />
          </div>
          <div>
            <div className="panel__content__form__section__header__label">
              Access Point
            </div>
            <div className="new-access-point-group-modal">
              <div className="panel__content__form__section__header__label">
                Name
              </div>
              <InputWithInlineValidation
                className={clsx('input new-access-point-modal__id-input', {
                  'input--dark': true,
                })}
                spellCheck={false}
                value={apName ?? ''}
                onChange={handleApNameChange}
                placeholder="Access Point Name"
                error={apNameErrors}
              />
              <div className="panel__content__form__section__header__label">
                Description
              </div>
              <InputWithInlineValidation
                className={clsx('input new-access-point-modal__id-input', {
                  'input--dark': true,
                })}
                spellCheck={false}
                value={apDescription ?? ''}
                onChange={handleApDescriptionChange}
                placeholder="Access Point Description"
                error={apDescriptionErrors}
              />
            </div>
          </div>
          <PanelDivider />
          <div className="search-modal__actions">
            <button
              className={clsx('btn btn--primary', {
                'btn--dark': true,
              })}
              disabled={disableCreateButton}
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

interface HoverTextAreaProps {
  text: string;
  handleMouseOver: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseOut: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

const HoverTextArea: React.FC<HoverTextAreaProps> = ({
  text: text,
  handleMouseOver,
  handleMouseOut,
  className,
}) => {
  return (
    <div
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      className={clsx(className)}
    >
      {text}
    </div>
  );
};

const hoverIcon = () => {
  return (
    <div data-testid={LEGEND_STUDIO_TEST_ID.HOVER_EDIT_ICON}>
      <PencilEditIcon />
    </div>
  );
};

//kxt todo move this to the top if needed
export type AccessPointDragSource = {
  accessPoint: AccessPointState; //KXT state or ap?
};

export const LakehouseDataProductAcccessPointEditor = observer(
  (props: {
    accessPointState: LakehouseAccessPointState;
    isReadOnly: boolean;
  }) => {
    const { accessPointState } = props;
    const editorStore = useEditorStore();
    const accessPoint = accessPointState.accessPoint;
    const groupState = accessPointState.state;
    const lambdaEditorState = accessPointState.lambdaState;
    const propertyHasParserError = groupState.accessPointStates
      .filter(filterByType(LakehouseAccessPointState))
      .find((pm) => pm.lambdaState.parserError);
    const [editingDescription, setEditingDescription] = useState(false);
    const [editingName, setEditingName] = useState(accessPoint.id === '');
    const [isHovering, setIsHovering] = useState(false);

    const handleDescriptionEdit = () => setEditingDescription(true);
    const handleNameEdit = () => setEditingName(true);
    const handleDescriptionBlur = () => {
      setEditingDescription(false);
      setIsHovering(false);
    };
    const handleNameBlur = () => {
      if (accessPoint.id !== '') {
        setEditingName(false);
      }
    };

    const handleMouseOver: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHovering(true);
    };
    const handleMouseOut: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHovering(false);
    };

    const updateAccessPointDescription: React.ChangeEventHandler<HTMLTextAreaElement> =
      action((event) => {
        accessPoint.description = event.target.value;
      });

    const updateAccessPointName: React.ChangeEventHandler<HTMLTextAreaElement> =
      action((event) => {
        accessPoint.id = event.target.value;
      });

    const updateAccessPointTargetEnvironment = action(
      (targetEnvironment: LakehouseTargetEnv) => {
        accessPoint.targetEnvironment = targetEnvironment;
      },
    );

    const handleRemoveAccessPoint = (): void => {
      editorStore.applicationStore.alertService.setActionAlertInfo({
        message: `Are you sure you want to delete Access Point ${accessPoint.id}?`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Confirm',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              groupState.deleteAccessPoint(accessPointState);
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    //KXT TODO if don't use as drag previw put back in return statement
    const TitleElement = observer(() => {
      // <div className={clsx('access-point-editor__name', {})}>
      //   <div className="access-point-editor__name__label">{accessPoint.id}</div>
      // </div>

      return editingName ? (
        <textarea
          className="access-point-editor__name"
          spellCheck={false}
          value={accessPoint.id ?? ''}
          onChange={updateAccessPointName}
          placeholder={'Access Point Name'}
          onBlur={handleNameBlur}
          style={{
            overflow: 'hidden',
            width: 'auto',
            color: 'white',
            resize: 'none',
            padding: '0.25rem',
            borderColor: accessPoint.id === '' ? 'red' : 'transparent',
            borderWidth: 'thin',
          }}
        />
      ) : (
        <div
          onClick={handleNameEdit}
          title="Click to edit access point description"
          // className="access-point-editor__description-container"
        >
          {/* <div className={clsx('access-point-editor__name', {})}> */}
          <div className="access-point-editor__name__label">
            {accessPoint.id}
          </div>
          {/* </div> */}
        </div>
      );
    });

    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const handleHover = useCallback((item: AccessPointDragSource): void => {
      //KXT TODO implement logic of dropping here, this is for reordering
    }, []);

    const [{ isBeingDraggedAP }, dropConnector] = useDrop<
      //KXT TODO idk what this is doing here tbh
      AccessPointDragSource,
      void,
      { isBeingDraggedAP: AccessPointState | undefined }
    >(
      () => ({
        accept: ['ACCESS_POINT'], //KXT hardcoded
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedAP: monitor.getItem<AccessPointDragSource | null>()
            ?.accessPoint,
        }),
      }),
      [handleHover],
    );
    dropConnector(ref);

    const isBeingDragged = accessPoint === isBeingDraggedAP?.accessPoint;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<AccessPointDragSource>(
        () => ({
          type: 'ACCESS_POINT',
          item: () => ({
            accessPoint: accessPointState,
          }),
          collect: (monitor) => ({
            isDragging: monitor.isDragging(), // Track if this item is being dragged
          }),
        }),
        [accessPointState],
      );
    dragConnector(handleRef);

    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div
        className={clsx('access-point-editor', {
          backdrop__element: propertyHasParserError,
        })}
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
          title={'Drag this Access Point to another group'}
        />

        {/* KXT this div encompasses whole access point (what was there before) - TODO move to own class */}
        <div style={{ flex: 1 }}>
          <div className="access-point-editor__metadata">
            <TitleElement />
            {editingDescription ? (
              <textarea
                className="panel__content__form__section__input"
                spellCheck={false}
                value={accessPoint.description ?? ''}
                onChange={updateAccessPointDescription}
                placeholder="Access Point description"
                onBlur={handleDescriptionBlur}
                style={{
                  overflow: 'hidden',
                  resize: 'none',
                  padding: '0.25rem',
                }}
              />
            ) : (
              <div
                onClick={handleDescriptionEdit}
                title="Click to edit access point description"
                className="access-point-editor__description-container"
              >
                {accessPoint.description ? (
                  <HoverTextArea
                    text={accessPoint.description}
                    handleMouseOver={handleMouseOver}
                    handleMouseOut={handleMouseOut}
                  />
                ) : (
                  <div
                    className="access-point-editor__group-container__description--warning"
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                  >
                    <WarningIcon />
                    {AP_EMPTY_DESC_WARNING}
                  </div>
                )}

                {isHovering && hoverIcon()}
              </div>
            )}
            <div className="access-point-editor__info">
              <div
                className={clsx('access-point-editor__type')}
                title={'Change target environment'}
              >
                <div className="access-point-editor__type__label">
                  {accessPoint.targetEnvironment}
                </div>
                <div
                  style={{
                    background: 'transparent',
                    height: '100%',
                    alignItems: 'center',
                    display: 'flex',
                  }}
                >
                  <ControlledDropdownMenu
                    className="access-point-editor__dropdown"
                    content={
                      <MenuContent>
                        {Object.values(LakehouseTargetEnv).map(
                          (environment) => (
                            <MenuContentItem
                              key={environment}
                              className="btn__dropdown-combo__option"
                              onClick={() =>
                                updateAccessPointTargetEnvironment(environment)
                              }
                            >
                              {environment}
                            </MenuContentItem>
                          ),
                        )}
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: {
                        vertical: 'bottom',
                        horizontal: 'right',
                      },
                      transformOrigin: {
                        vertical: 'top',
                        horizontal: 'right',
                      },
                    }}
                  >
                    <CaretDownIcon />
                  </ControlledDropdownMenu>
                </div>
              </div>
            </div>
          </div>
          <div className="access-point-editor__content">
            <div className="access-point-editor__generic-entry">
              <div className="access-point-editor__entry__container">
                <div className="access-point-editor__entry">
                  <InlineLambdaEditor
                    className={'access-point-editor__lambda-editor'}
                    disabled={
                      lambdaEditorState.val.state.state
                        .isConvertingTransformLambdaObjects
                    }
                    lambdaEditorState={lambdaEditorState}
                    forceBackdrop={Boolean(lambdaEditorState.parserError)}
                  />
                </div>
              </div>
              <button
                className="access-point-editor__generic-entry__remove-btn"
                onClick={() => {
                  handleRemoveAccessPoint();
                }}
                tabIndex={-1}
                title="Remove"
              >
                <TimesIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const DataProductEditorSplashScreen = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState } = props;
    const logoWidth = 280;
    const logoHeight = 270;
    const [showLogo, setShowLogo] = useState(false);
    const { ref, height, width } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      setShowLogo((width ?? 0) > logoWidth && (height ?? 0) > logoHeight);
    }, [height, width]);

    return (
      <div ref={ref} className="data-product-editor__splash-screen">
        <div
          onClick={() => dataProductEditorState.setAccessPointGroupModal(true)}
          className="data-product-editor__splash-screen__label"
        >
          Add Access Point Group
        </div>
        <div className="data-product-editor__splash-screen__spacing"></div>
        <div
          onClick={() => dataProductEditorState.setAccessPointGroupModal(true)}
          title="Add new Access Point Group"
          className={clsx('data-product-editor__splash-screen__logo', {
            'data-product-editor__splash-screen__logo--hidden': !showLogo,
          })}
        >
          <AccessPointIcon />
        </div>
      </div>
    );
  },
);

const DataProductDeploymentResponseModal = observer(
  (props: { state: DataProductEditorState }) => {
    const { state } = props;
    const applicationStore = state.editorStore.applicationStore;
    const closeModal = (): void => state.setDeployResponse(undefined);
    return (
      <Dialog
        open={Boolean(state.deployResponse)}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
        onClose={closeModal}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal"
        >
          <ModalHeader>
            <ModalTitle title="Data Product Deployment Response" />
          </ModalHeader>
          <ModalBody>
            <PanelContent>
              <CodeEditor
                inputValue={JSON.stringify(
                  state.deployResponse?.content ?? {},
                  null,
                  2,
                )}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.JSON}
              />
            </PanelContent>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closeModal}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const AccessPointGroupCard = observer(
  (props: { groupState: AccessPointGroupState; isReadOnly: boolean }) => {
    const { groupState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const productEditorState = groupState.state;
    const [editingDescription, setEditingDescription] = useState(false);
    const [isHoveringDescription, setIsHoveringDescription] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [isHoveringName, setIsHoveringName] = useState(false);

    const handleDescriptionEdit = () => setEditingDescription(true);
    const handleDescriptionBlur = () => {
      setEditingDescription(false);
      setIsHoveringDescription(false);
    };
    const handleMouseOverDescription: React.MouseEventHandler<
      HTMLDivElement
    > = () => {
      setIsHoveringDescription(true);
    };
    const handleMouseOutDescription: React.MouseEventHandler<
      HTMLDivElement
    > = () => {
      setIsHoveringDescription(false);
    };
    const updateGroupDescription = (val: string): void => {
      accessPointGroup_setDescription(groupState.value, val);
    };

    const handleNameEdit = () => setEditingName(true);
    const handleNameBlur = () => {
      setEditingName(false);
      setIsHoveringName(false);
    };
    const handleMouseOverName: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHoveringName(true);
    };
    const handleMouseOutName: React.MouseEventHandler<HTMLDivElement> = () => {
      setIsHoveringName(false);
    };
    const updateGroupName = (val: string): void => {
      if (val) {
        accessPointGroup_setName(groupState.value, val);
      }
    };

    const handleRemoveAccessPointGroup = (): void => {
      editorStore.applicationStore.alertService.setActionAlertInfo({
        message: `Are you sure you want to delete Access Point Group ${groupState.value.id} and all of its Access Points?`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Confirm',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              productEditorState.deleteAccessPointGroup(groupState);
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    const openNewModal = () => {
      //KXT TODO rename
      // productEditorState.setSelectedGroupState(groupState); //KXT TODO this shouldn't be needed anymore
      // productEditorState.setAccessPointModal(true);
      productEditorState.addAccessPoint(
        '', //KXT TODO better placeholder
        undefined,
        productEditorState.selectedGroupState ?? 'default', //KXT how to handle this better?
      );
    };
    return (
      <div className="access-point-editor__group-container">
        <div className="access-point-editor__group-container__title-editor">
          {editingName ? (
            <textarea
              className="panel__content__form__section__input"
              spellCheck={false}
              value={groupState.value.id}
              onChange={(event) => updateGroupName(event.target.value)}
              placeholder="Access Point Group Name"
              onBlur={handleNameBlur}
              style={{
                overflow: 'hidden',
                resize: 'none',
                padding: '0.25rem',
              }}
            />
          ) : (
            <div
              onClick={handleNameEdit}
              title="Click to edit group name"
              className="access-point-editor__group-container__title"
            >
              <HoverTextArea
                text={groupState.value.id}
                handleMouseOver={handleMouseOverName}
                handleMouseOut={handleMouseOutName}
                className="access-point-editor__group-container__title"
              />

              {isHoveringName && hoverIcon()}
            </div>
          )}
          <button
            className="access-point-editor__generic-entry__remove-btn--group"
            onClick={() => {
              handleRemoveAccessPointGroup();
            }}
            tabIndex={-1}
            title="Remove Access Point Group"
          >
            <TimesIcon />
          </button>
        </div>
        <div className="access-point-editor__group-container__description-editor">
          {editingDescription ? (
            <textarea
              className="panel__content__form__section__input"
              spellCheck={false}
              value={groupState.value.description ?? ''}
              onChange={(event) => updateGroupDescription(event.target.value)}
              placeholder="Provide a description for this Access Point Group"
              onBlur={handleDescriptionBlur}
              style={{
                overflow: 'hidden',
                resize: 'none',
                padding: '0.25rem',
              }}
            />
          ) : (
            <div
              onClick={handleDescriptionEdit}
              title="Click to edit group description"
              className="access-point-editor__description-container"
            >
              {groupState.value.description ? (
                <HoverTextArea
                  text={groupState.value.description}
                  handleMouseOver={handleMouseOverDescription}
                  handleMouseOut={handleMouseOutDescription}
                  className="access-point-editor__group-container__description"
                />
              ) : (
                <div
                  className="access-point-editor__group-container__description--warning"
                  onMouseOver={handleMouseOverDescription}
                  onMouseOut={handleMouseOutDescription}
                >
                  <WarningIcon />
                  Users request access at the access point group level. Click
                  here to add a meaningful description to guide users.
                </div>
              )}
              {isHoveringDescription && hoverIcon()}
            </div>
          )}
        </div>
        <PanelHeader className="panel__header--access-point">
          <div className="panel__header__title">Access Points</div>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              className="panel__header__action"
              onClick={openNewModal}
              disabled={isReadOnly}
              title="Create new access point"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        {groupState.accessPointStates
          .filter(filterByType(LakehouseAccessPointState))
          .map((apState) => (
            <LakehouseDataProductAcccessPointEditor
              key={apState.uuid}
              isReadOnly={isReadOnly}
              accessPointState={apState}
            />
          ))}
        {productEditorState.accessPointModal && (
          <NewAccessPointAccessPoint
            dataProductEditorState={productEditorState}
          />
        )}
      </div>
    );
  },
);

const AccessPointGroupTab = observer(
  (props: {
    dataProductEditorState: DataProductEditorState;
    isReadOnly: boolean;
  }) => {
    const { dataProductEditorState, isReadOnly } = props;
    const accessPointStates = dataProductEditorState.accessPointGroupStates
      .map((e) => e.accessPointStates)
      .flat(); //KXT TODO is this needed? track group states?
    const groupStates = dataProductEditorState.accessPointGroupStates;
    // const groupStates = dataProductEditorState.product.accessPointGroups;
    const selectedGroupState = dataProductEditorState.selectedGroupState;
    const openNewModal = () => {
      //KXT TODO change name
      // dataProductEditorState.setAccessPointGroupModal(true);
      dataProductEditorState.createGroupAndAdd(
        'Group placeholder', //KXT TODO better placeholder
      );
      console.log('added group');
    };
    const changeGroup = (group: AccessPointGroupState): void => {
      dataProductEditorState.setSelectedGroupState(group);
    };

    return (
      <div className="panel" style={{ overflow: 'visible' }}>
        <AccessPointDragPreviewLayer />
        <div
          className="panel__content__form__section__header__label"
          style={{ paddingLeft: '1rem' }}
        >
          Access Point Groups
        </div>
        <PanelHeader>
          <div className="uml-element-editor__tabs">
            {groupStates.map((group) => {
              const [{ isOver }, drop] = useDrop(() => ({
                accept: 'ACCESS_POINT', // Accept draggable items of type 'ACCESS_POINT'
                drop: (item: AccessPointDragSource) => {
                  // Handle the drop event
                  group.addAccessPoint(item.accessPoint.accessPoint);
                  item.accessPoint.state.deleteAccessPoint(item.accessPoint);
                },
                collect: (monitor) => ({
                  isOver: monitor.isOver(), // Track if an item is being dragged over this tab
                }),
              }));

              return (
                <div
                  ref={(node) => {
                    drop(node); // Apply the drop ref
                  }}
                  key={group.value.id}
                  onClick={(): void => changeGroup(group)}
                  className={clsx('service-test-suite-editor__tab', {
                    'service-test-suite-editor__tab--active':
                      group === selectedGroupState,
                  })}
                >
                  {group.value.id}
                  {group.accessPointStates.length === 0 && (
                    <ErrorWarnIcon title="This group needs at least one access point defined" />
                  )}
                </div>
              );
            })}
            <PanelHeaderActionItem
              className="panel__header__action"
              onClick={openNewModal}
              disabled={isReadOnly}
              title="Create new access point group"
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </div>

          <PanelHeaderActions></PanelHeaderActions>
        </PanelHeader>
        <PanelContent>
          <div
            style={{
              overflow: 'visible',
              margin: '1rem',
              marginLeft: '1.5rem',
            }} //KXT move this to individual groups? make sure each group is scrollable
          >
            {selectedGroupState && (
              <AccessPointGroupCard
                key={selectedGroupState.uuid}
                groupState={selectedGroupState}
                isReadOnly={isReadOnly}
              />
            )}
          </div>
        </PanelContent>
        {dataProductEditorState.accessPointGroupModal && (
          <NewAccessPointGroupModal
            dataProductEditorState={dataProductEditorState}
          />
        )}
        {dataProductEditorState.deployResponse && (
          <DataProductDeploymentResponseModal state={dataProductEditorState} />
        )}
      </div>
    );
  },
);

const GeneralActivityBar = observer(
  (props: { dataProductEditorState: DataProductEditorState }) => {
    const { dataProductEditorState } = props;
    const generalActivityBarActions = [
      {
        title: DATA_PRODUCT_ACTIVITY.HOME,
        icon: <HomeIcon />,
      },
      {
        title: DATA_PRODUCT_ACTIVITY.SUPPORT,
        icon: <QuestionCircleIcon />,
      },
      {
        title: DATA_PRODUCT_ACTIVITY.APG,
        icon: <GroupWorkIcon />,
      },
    ];
    return (
      <div
        className="data-space__viewer__activity-bar"
        style={{ position: 'static' }}
      >
        <div className="data-space__viewer__activity-bar__items">
          {generalActivityBarActions.map((activity) => (
            <>
              <button
                key={activity.title}
                className={clsx('data-space__viewer__activity-bar__item', {
                  'data-space__viewer__activity-bar__item--active':
                    dataProductEditorState.selectedActivity === activity.title,
                })}
                onClick={() =>
                  dataProductEditorState.setSelectedActivity(activity.title)
                }
                tabIndex={-1}
                title={activity.title}
                style={{
                  flexDirection: 'column',
                  fontSize: '12px',
                  margin: '1rem 0rem',
                }}
              >
                {activity.icon}
                {activity.title}
              </button>
            </>
          ))}
        </div>
      </div>
    );
  },
);

const DescriptionActivity = observer(
  (props: { product: DataProduct; isReadOnly: boolean }) => {
    const { product, isReadOnly } = props;
    const updateDataProductTitle = (val: string | undefined): void => {
      dataProduct_setTitle(product, val ?? '');
    };
    const updateDataProductDescription: ChangeEventHandler<
      HTMLTextAreaElement
    > = (event) => {
      dataProduct_setDescription(product, event.target.value);
    };

    return (
      <div style={{ flexDirection: 'column', display: 'flex' }}>
        <PanelFormTextField
          name="Title"
          value={product.title}
          prompt="Provide a descriptive name for the Data Product to appear in Marketplace."
          update={updateDataProductTitle}
          placeholder="Enter title"
        />
        <div style={{ margin: '1rem' }}>
          <div className="panel__content__form__section__header__label">
            Description
          </div>
          <div
            className="panel__content__form__section__header__prompt"
            style={{
              color:
                product.description === '' || product.description === undefined
                  ? 'red'
                  : 'var(--color-light-grey-400)',
            }}
          >
            Clearly describe the purpose, content, and intended use of the Data
            Product. Markdown is supported.
          </div>
          <textarea
            className="panel__content__form__section__textarea"
            spellCheck={false}
            disabled={isReadOnly}
            value={product.description}
            onChange={updateDataProductDescription}
            style={{
              padding: '0.5rem',
              width: '45rem',
              maxWidth: '45rem !important',
              borderColor:
                product.description === '' || product.description === undefined
                  ? 'red'
                  : 'transparent',
            }}
          />
        </div>
      </div>
    );
  },
);

const SupportActivity = observer(
  (props: { product: DataProduct; isReadOnly: boolean }) => {
    const { product, isReadOnly } = props;
    const updateSupportInfoDocumentationUrl = (
      val: string | undefined,
    ): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setDocumentationUrl(product.supportInfo, val ?? '');
      }
    };

    const updateSupportInfoWebsite = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setWebsite(product.supportInfo, val ?? '');
      }
    };

    const updateSupportInfoFaqUrl = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setFaqUrl(product.supportInfo, val ?? '');
      }
    };

    const updateSupportInfoSupportUrl = (val: string | undefined): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_setSupportUrl(product.supportInfo, val ?? '');
      }
    };

    const handleSupportInfoEmailAdd = (
      address: string,
      title: string,
    ): void => {
      dataProduct_setSupportInfoIfAbsent(product);
      if (product.supportInfo) {
        supportInfo_addEmail(product.supportInfo, new Email(address, title));
      }
    };

    const handleSupportInfoEmailRemove = (email: Email): void => {
      if (product.supportInfo) {
        supportInfo_deleteEmail(product.supportInfo, email);
      }
    };

    const SupportEmailComponent = observer(
      (props: { item: Email }): React.ReactElement => {
        const { item } = props;

        return (
          <div className="panel__content__form__section__list__item__rows">
            <div className="row">
              <label className="label">Address</label>
              <div className="textbox">{item.address}</div>
            </div>
            <div className="row">
              <label className="label">Title</label>
              <div className="textbox">{item.title}</div>
            </div>
          </div>
        );
      },
    );

    const NewSupportEmailComponent = observer(
      (props: { onFinishEditing: () => void }) => {
        const { onFinishEditing } = props;
        const [address, setAddress] = useState('');
        const [title, setTitle] = useState('');

        return (
          <div className="data-product-editor__support-info__new-email">
            <div className="panel__content__form__section__list__new-item__input">
              <input
                className="input input-group__input panel__content__form__section__input input--dark"
                type="email"
                placeholder="Enter email"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                }}
              />
            </div>
            <div className="panel__content__form__section__list__new-item__input">
              <input
                className="input input-group__input panel__content__form__section__input input--dark"
                type="title"
                placeholder="Enter title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
              />
            </div>
            <button
              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
              onClick={() => {
                handleSupportInfoEmailAdd(address, title);
                setAddress('');
                setTitle('');
                onFinishEditing();
              }}
            >
              Save
            </button>
          </div>
        );
      },
    );

    return (
      <PanelFormSection>
        <div className="panel__content__form__section__header__label">
          Support Information
        </div>
        <div className="panel__content__form__section__header__prompt">
          Configure support information for this Lakehouse Data Product.
        </div>
        <PanelFormTextField
          name="Documentation URL"
          value={product.supportInfo?.documentationUrl ?? ''}
          update={updateSupportInfoDocumentationUrl}
          placeholder="Enter Documentation URL"
        />
        <PanelFormTextField
          name="Website"
          value={product.supportInfo?.website}
          update={updateSupportInfoWebsite}
          placeholder="Enter Website"
        />
        <PanelFormTextField
          name="FAQ URL"
          value={product.supportInfo?.faqUrl}
          update={updateSupportInfoFaqUrl}
          placeholder="Enter FAQ URL"
        />
        <PanelFormTextField
          name="Support URL"
          value={product.supportInfo?.supportUrl}
          update={updateSupportInfoSupportUrl}
          placeholder="Enter Support URL"
        />
        <ListEditor
          title="Emails"
          items={product.supportInfo?.emails}
          keySelector={(email: Email) => email.address + email.title}
          ItemComponent={SupportEmailComponent}
          NewItemComponent={NewSupportEmailComponent}
          handleRemoveItem={handleSupportInfoEmailRemove}
          isReadOnly={isReadOnly}
          emptyMessage="No emails specified"
        />
      </PanelFormSection>
    );
  },
);

export const DataProductEditor = observer(() => {
  const editorStore = useEditorStore();
  const dataProductEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataProductEditorState);
  const product = dataProductEditorState.product;
  const accessPointStates = dataProductEditorState.accessPointGroupStates
    .map((e) => e.accessPointStates)
    .flat(); //KXT remove if don't use
  const isReadOnly = dataProductEditorState.isReadOnly;
  const auth = useAuth();

  const deployDataProduct = (): void => {
    // Trigger OAuth flow if not authenticated
    if (!auth.isAuthenticated) {
      // remove this redirect if we move to do oauth at the beginning of opening studio
      auth
        .signinRedirect({
          state: generateUrlToDeployOnOpen(dataProductEditorState),
        })
        .catch(editorStore.applicationStore.alertUnhandledError);
      return;
    }
    // Use the token for deployment
    const token = auth.user?.access_token;
    if (token) {
      flowResult(dataProductEditorState.deploy(token)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    } else {
      editorStore.applicationStore.notificationService.notifyError(
        'Authentication failed. No token available.',
      );
    }
  };

  const selectedActivity = dataProductEditorState.selectedActivity;
  const renderActivivtyBarTab = (): React.ReactNode => {
    switch (selectedActivity) {
      case DATA_PRODUCT_ACTIVITY.HOME:
        return (
          <DescriptionActivity product={product} isReadOnly={isReadOnly} />
        );
      case DATA_PRODUCT_ACTIVITY.SUPPORT:
        return <SupportActivity product={product} isReadOnly={isReadOnly} />;
      case DATA_PRODUCT_ACTIVITY.APG:
        return (
          <AccessPointGroupTab
            dataProductEditorState={dataProductEditorState}
            isReadOnly={isReadOnly}
          />
        );
      default:
        return null;
    }
  };

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATA_PRODUCT_EDITOR,
  );

  useEffect(() => {
    flowResult(dataProductEditorState.convertAccessPointsFuncObjects()).catch(
      dataProductEditorState.editorStore.applicationStore.alertUnhandledError,
    );
  }, [dataProductEditorState]);

  useEffect(() => {
    if (dataProductEditorState.deployOnOpen) {
      flowResult(dataProductEditorState.deploy(auth.user?.access_token)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    }
  }, [
    auth,
    editorStore.applicationStore.alertUnhandledError,
    dataProductEditorState,
  ]);

  return (
    <div className="data-product-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">data product</div>
          </div>
          <PanelHeaderActions>
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              <button
                className="btn__dropdown-combo__label"
                onClick={deployDataProduct}
                title={dataProductEditorState.deployValidationMessage}
                tabIndex={-1}
                disabled={!dataProductEditorState.deployValidationMessage}
              >
                <RocketIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">Deploy</div>
              </button>
            </div>
          </PanelHeaderActions>
        </div>

        <div
          className="panel"
          style={{ padding: '1rem', flexDirection: 'row' }}
        >
          <GeneralActivityBar dataProductEditorState={dataProductEditorState} />

          {renderActivivtyBarTab()}
        </div>
      </div>
    </div>
  );
});
