import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
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
import { SvgrInline, SvgrWrap } from '../Icons';
import useStyled from './styled';

import type { RenderElementProps } from 'slate-react';
import type { ImageElement } from 'slate';
import type { DropDownProps } from 'antd';
import type { ExcludeNullableFunc } from '../../types';

const trigger: DropDownProps['trigger'] = ['contextMenu'];

function Image(props: RenderElementProps) {
  const { attributes, children, element } = props;

  const imageEle = element as ImageElement;

  const anim = useRef<number | null>(null);

  // memoize
  const [open, setOpen] = useState(false);

  const editor = useSlate();

  const selected = useSelected();

  const focused = useFocused();

  const readOnly = useReadOnly();

  const baseResolver = useBaseResolver();

  const imageResolver = useMemo(() => baseResolver.find((item) => item.key === 'image'), [baseResolver]);

  const { image, imageCore, inlineSelected, blockSelected } = useStyled();

  const locked = editor.getElementFieldsValue('lock', 'paragraph');

  // handler
  const preventContextMenu: React.MouseEventHandler<HTMLSpanElement> = (e) => {
    // e.preventDefault();
    e.stopPropagation();
    // 触发点击事件，选中图片
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    e.target.dispatchEvent(event);
  };

  const handleOpenChange = useCallback((v: boolean) => {
    anim.current = requestAnimationFrame(() => {
      // 降低优先级，先等 preventContextMenu click 事件触发，选中图片，再打开下拉菜单
      // 如果不延迟，会导致选中图片后，下拉菜单打开，然后立即关闭
      setOpen(v);
    });
  }, []);

  const handleImageSizeChange = useCallback(
    (size: [number, number]) => {
      editor.setElementProperties('image', { width: size[0], height: size[1] });
    },
    [editor]
  );

  const handleMenuClick = useCallback<NonNullable<NonNullable<DropDownProps['menu']>['onClick']>>(
    ({ key }) => {
      setOpen(false);
      const floatKeys = ['left', 'right']; // 浮动互斥选项
      const typeKeys = ['inline', 'block']; // 元素类型互斥选项
      // handler
      if (floatKeys.includes(key)) {
        // 设置浮动
        const prefloat = editor.getElementFieldsValue('float', 'image');
        const float = key;
        editor.setElementProperties('image', { float: prefloat === float ? undefined : float });
        ReactEditor.focus(editor);
      } else if (typeKeys.includes(key)) {
        // 设置元素类型
        editor.setElementProperties('image', { inline: key === 'inline' }, { refactor: true });
        ReactEditor.focus(editor);
      } else if (key === 'copy') {
        const url = editor.getElementFieldsValue('url', 'image');
        copyToClipboard(url)
          .then(() => {
            message.success('图片地址已复制');
          })
          .catch(() => {
            message.error('复制失败，浏览器不支持');
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

  useEffect(() => () => {
    // unmount
    if (anim.current) {
      cancelAnimationFrame(anim.current);
    }
  }, []);

  const menu = useMemo<DropDownProps['menu']>(
    () => ({
      items: [
        {
          key: 'delete',
          label: '删除图片',
          icon: <CloseOutlined style={{ color: 'red' }} />,
        },
        {
          key: 'edit',
          label: '编辑图片',
          icon: <FormOutlined />,
        },
        {
          key: 'copy',
          label: '复制图片地址',
          icon: <GlobalOutlined />,
        },
        imageEle.inline && {
          key: 'float',
          label: '设置浮动',
          icon: <PicCenterOutlined />,
          children: [
            {
              key: 'left',
              label: '左浮动',
              icon: <PicLeftOutlined />,
            },
            {
              key: 'right',
              label: '右浮动',
              icon: <PicRightOutlined />,
            },
          ],
        },
        {
          key: 'type',
          label: '元素类型',
          icon: <BlockOutlined />,
          children: [
            {
              key: 'inline',
              label: '行内元素',
              icon: <Icon component={SvgrInline} />,
            },
            {
              key: 'block',
              label: '块级元素',
              icon: <Icon component={SvgrWrap} />,
            },
          ],
        },
      ].filter(Boolean as any as ExcludeNullableFunc),
      selectable: true,
      selectedKeys: [editor.isInline(imageEle) ? 'inline' : 'block', imageEle.float].filter(
        Boolean as any as ExcludeNullableFunc
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

  // 只读状态 / 锁定状态
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

  // 编辑状态
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
      <Dropdown trigger={trigger} menu={menu} open={open} onOpenChange={handleOpenChange}>
        {core}
      </Dropdown>
      {imageResolver?.attachRender}
    </DynamicElement>
  );
}

export default memo(Image);
