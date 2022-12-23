import React, { memo, useCallback } from 'react';
import { Editable, useSlate } from 'slate-react';
import { Range, Transforms } from 'slate';
import isHotkey, { isKeyHotkey } from 'is-hotkey';
import classNames from 'classnames';
import Leaf from '../Leaf';
import Element from '../Element';
import { HOTKEYS } from '../../utils/constant';
import useStyled from './styled';

import type { RenderLeafProps, RenderElementProps } from 'slate-react';
import type { NoEffectWrapTypes } from '../../utils/constant';

export interface ContentProps {
  className?: string;
  placeholder?: string;
  spellCheck?: boolean;
  autoFocus?: boolean;
  readOnly?: boolean;
  style?: React.CSSProperties;
  renderLeaf?: (props: RenderLeafProps, resolver: JSX.Element) => JSX.Element;
  renderElement?: (props: RenderElementProps, resolver: JSX.Element) => JSX.Element;
  onKeyboard?: React.KeyboardEventHandler<HTMLDivElement>;
}

function Content(props: ContentProps) {
  const {
    className,
    placeholder,
    spellCheck,
    autoFocus,
    readOnly,
    style,
    renderLeaf,
    renderElement,
    onKeyboard,
  } = props;

  const editor = useSlate();

  const { content } = useStyled();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const { selection } = editor;
      // Bugfix: 修复元素边界跳出时会间隔一个字符的问题
      // Default left/right behavior is unit:'character'.
      // This fails to distinguish between two cursor positions, such as
      // <inline>foo<cursor/></inline> vs <inline>foo</inline><cursor/>.
      // Here we modify the behavior to unit:'offset'.
      // This lets the user step into and out of the inline without stepping over characters.
      // You may wish to customize this further to only use unit:'offset' in specific cases.
      if (selection && Range.isCollapsed(selection)) {
        const { nativeEvent } = e;
        if (isKeyHotkey('left', nativeEvent)) {
          e.preventDefault();
          Transforms.move(editor, { unit: 'offset', reverse: true });
        }
        if (isKeyHotkey('right', nativeEvent)) {
          e.preventDefault();
          Transforms.move(editor, { unit: 'offset' });
        }
      }

      // 内置快捷键
      // Marks shortcut
      Object.keys(HOTKEYS.marks).forEach((hotkey) => {
        if (isHotkey(hotkey, e)) {
          e.preventDefault();
          const mark = HOTKEYS.marks[hotkey];
          editor.toggleMark(mark);
        }
      });
      // Nodes shortcut
      Object.keys(HOTKEYS.nodes).forEach((hotkey) => {
        if (isHotkey(hotkey, e)) {
          e.preventDefault();
          const type = HOTKEYS.nodes[hotkey] as NoEffectWrapTypes;
          editor.toggleElement(type);
        }
      });
      // Aligns shortcut
      Object.keys(HOTKEYS.aligns).forEach((hotkey) => {
        if (isHotkey(hotkey, e)) {
          e.preventDefault();
          const align = HOTKEYS.aligns[hotkey];
          editor.toggleAlign(align);
        }
      });
      // 暴露接口：用户自定义行为
      if (onKeyboard) onKeyboard(e);
    },
    [editor, onKeyboard]
  );

  const receiveRenderLeaf = useCallback(
    (props: RenderLeafProps, resolver: JSX.Element) => {
      if (renderLeaf) return renderLeaf(props, resolver);
      return resolver;
    },
    [renderLeaf]
  );

  const receiveRenderElement = useCallback(
    (props: RenderElementProps, resolver: JSX.Element) => {
      if (renderElement) return renderElement(props, resolver);
      return resolver;
    },
    [renderElement]
  );

  // 处理文本级（行内元素）渲染
  const handleRenderLeaf = useCallback(
    (props: RenderLeafProps) => receiveRenderLeaf(props, <Leaf {...props} />),
    [receiveRenderLeaf]
  );

  // 处理节点级（块级元素）渲染
  const handleRenderElement = useCallback(
    (props: RenderElementProps) => receiveRenderElement(props, <Element {...props} />),
    [receiveRenderElement]
  );

  return (
    <Editable
      className={classNames(content, className)}
      role="textbox"
      placeholder={placeholder}
      spellCheck={spellCheck}
      autoFocus={autoFocus}
      readOnly={readOnly}
      style={style}
      renderLeaf={handleRenderLeaf}
      renderElement={handleRenderElement}
      onKeyDown={handleKeyDown}
    />
  );
}

export default memo(Content);
