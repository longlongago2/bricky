import React, { memo, useMemo, useCallback } from 'react';
import { useSelected, useFocused, useReadOnly, useSlate, ReactEditor } from 'slate-react';
import Icon, {
  BlockOutlined,
  CloseOutlined,
  FormOutlined,
  GlobalOutlined,
  PicCenterOutlined,
  PicLeftOutlined,
  PicRightOutlined,
} from '@ant-design/icons';
import { Dropdown, message } from 'antd';
import classNames from 'classnames';
import { copyToClipboard } from '../../utils';
import DynamicElement from '../DynamicElement';
import ImageEnhancer from '../ImageEnhancer';
import useBaseResolver from '../Toolbar/useBaseResolver';
import { SvgrInline, SvgrWrap } from '../SvgrIcons';
import useStyled from './styled';

import type { RenderElementProps } from 'slate-react';
import type { ImageElement } from 'slate';
import type { DropDownProps } from 'antd';

const trigger: DropDownProps['trigger'] = ['contextMenu'];

function Image(props: RenderElementProps) {
  const { attributes, children, element } = props;

  const imageEle = element as ImageElement;

  const editor = useSlate();

  const selected = useSelected();

  const focused = useFocused();

  const readOnly = useReadOnly();

  const baseResolver = useBaseResolver();

  const imageResolver = useMemo(() => baseResolver.find((item) => item.key === 'image'), [baseResolver]);

  const { image, imageCore, inlineSelected, blockSelected } = useStyled();

  const locked = editor.getElementFieldsValue('lock', 'paragraph');

  const preventContextMenu: React.MouseEventHandler<HTMLSpanElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    e.target.dispatchEvent(event);
  };

  const handleImageSizeChange = useCallback(
    (size: [number, number]) => {
      editor.setElementProperties('image', { width: size[0], height: size[1] });
    },
    [editor]
  );

  const handleMenuClick = useCallback<NonNullable<NonNullable<DropDownProps['menu']>['onClick']>>(
    ({ key }) => {
      const floatKeys = ['left', 'right']; // ??????????????????
      const typeKeys = ['inline', 'block']; // ????????????????????????
      // handler
      if (floatKeys.includes(key)) {
        // ????????????
        const prefloat = editor.getElementFieldsValue('float', 'image');
        const float = key;
        editor.setElementProperties('image', { float: prefloat === float ? undefined : float });
        ReactEditor.focus(editor);
      } else if (typeKeys.includes(key)) {
        // ??????????????????
        editor.setElementProperties('image', { inline: key === 'inline' }, { refactor: true });
        ReactEditor.focus(editor);
      } else if (key === 'copy') {
        const url = editor.getElementFieldsValue('url', 'image');
        copyToClipboard(url)
          .then(() => {
            message.success('?????????????????????');
          })
          .catch(() => {
            message.error('?????????????????????????????????');
          });
      } else if (key === 'delete') {
        editor.removeElement('image');
        ReactEditor.focus(editor);
      } else if (key === 'edit') {
        if (imageResolver && 'onClick' in imageResolver) {
          imageResolver.onClick?.(editor, { target: 'emitter_edit' });
        }
      }
    },
    [editor, imageResolver]
  );

  const menu = useMemo<DropDownProps['menu']>(
    () => ({
      items: [
        {
          key: 'delete',
          label: '????????????',
          icon: <CloseOutlined style={{ color: 'red' }} />,
        },
        {
          key: 'edit',
          label: '????????????',
          icon: <FormOutlined />,
        },
        {
          key: 'copy',
          label: '??????????????????',
          icon: <GlobalOutlined />,
        },
        imageEle.inline && {
          key: 'float',
          label: '????????????',
          icon: <PicCenterOutlined />,
          children: [
            {
              key: 'left',
              label: '?????????',
              icon: <PicLeftOutlined />,
            },
            {
              key: 'right',
              label: '?????????',
              icon: <PicRightOutlined />,
            },
          ],
        },
        {
          key: 'type',
          label: '????????????',
          icon: <BlockOutlined />,
          children: [
            {
              key: 'inline',
              label: '????????????',
              icon: <Icon component={SvgrInline} />,
            },
            {
              key: 'block',
              label: '????????????',
              icon: <Icon component={SvgrWrap} />,
            },
          ],
        },
      ].filter(Boolean as any as ExcludesFalse),
      selectable: true,
      selectedKeys: [editor.isInline(imageEle) ? 'inline' : 'block', imageEle.float].filter(
        Boolean as any as ExcludesFalse
      ),
      onClick: handleMenuClick,
    }),
    [editor, handleMenuClick, imageEle]
  );

  const getStyle = useCallback(() => {
    const style: React.CSSProperties = {};
    if (imageEle.inline && imageEle.float) {
      style.float = imageEle.float;
    }
    if (!imageEle.inline && imageEle.align) {
      style.textAlign = imageEle.align;
    }
    return style;
  }, [imageEle]);

  const style = useMemo<React.CSSProperties>(() => getStyle(), [getStyle]);

  const imageSelected = imageEle.inline ? inlineSelected : blockSelected;

  const core = (
    <span contentEditable={false} className={imageCore}>
      <ImageEnhancer
        active={selected}
        showNative={locked || readOnly}
        src={imageEle.url}
        width={imageEle.width}
        height={imageEle.height}
        inline={imageEle.inline}
        onSizeChange={handleImageSizeChange}
      />
    </span>
  );

  // ???????????? / ????????????
  if (readOnly || locked) {
    return (
      <DynamicElement
        tag={imageEle.inline ? 'span' : 'section'}
        style={style}
        {...attributes}
        className={classNames(image, {
          [`${image}--block`]: !imageEle.inline,
        })}
      >
        {children}
        {core}
      </DynamicElement>
    );
  }

  // ????????????
  return (
    <DynamicElement
      tag={imageEle.inline ? 'span' : 'section'}
      style={style}
      {...attributes}
      className={classNames(image, {
        [`${image}--block`]: !imageEle.inline,
        [imageSelected]: selected,
        [`${imageSelected}--blur`]: selected && !focused,
      })}
      onContextMenu={preventContextMenu}
    >
      {children}
      <Dropdown trigger={trigger} menu={menu}>
        {core}
      </Dropdown>
      {imageResolver?.attachRender}
    </DynamicElement>
  );
}

export default memo(Image);
