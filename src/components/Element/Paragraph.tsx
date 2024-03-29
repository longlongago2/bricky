import React, { useCallback, memo, useMemo } from 'react';
import { Dropdown } from 'antd';
import { Editor, Transforms } from 'slate';
import { ReactEditor, useSlate, useReadOnly, useSelected, useFocused } from 'slate-react';
import { EnterOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import useStyled from './styled';

import type { RenderElementProps } from 'slate-react';
import type { ParagraphElement } from 'slate';
import type { DropDownProps } from 'antd';
import type { ExcludeNullableFunc } from '../../types';

const trigger: DropDownProps['trigger'] = ['contextMenu'];

function Paragraph(props: RenderElementProps) {
  const { attributes, children } = props;

  const element = props.element as ParagraphElement;

  // memorized
  const { paragraphCore, blockSelected } = useStyled();

  const editor = useSlate();

  const readOnly = useReadOnly();

  const selected = useSelected();

  const focused = useFocused();

  // handler
  const handleUpEnter = useCallback(() => {
    const paragraph: ParagraphElement = {
      type: 'paragraph',
      children: [{ text: '' }],
    };
    ReactEditor.focus(editor);
    const path = ReactEditor.findPath(editor, element);
    Transforms.insertNodes(editor, paragraph, { at: Editor.start(editor, path), select: true });
  }, [editor, element]);

  const handleDownEnter = useCallback(() => {
    const paragraph: ParagraphElement = {
      type: 'paragraph',
      children: [{ text: '' }],
    };
    ReactEditor.focus(editor);
    const path = ReactEditor.findPath(editor, element);
    Transforms.insertNodes(editor, paragraph, { at: Editor.end(editor, path), select: true });
  }, [editor, element]);

  const handleMenuClick = useCallback<NonNullable<NonNullable<DropDownProps['menu']>['onClick']>>(
    ({ key }) => {
      if (key === 'up-enter') {
        handleUpEnter();
      } else if (key === 'down-enter') {
        handleDownEnter();
      } else if (key.indexOf('lock') > -1) {
        editor.toggleLock('paragraph');
      }
    },
    [editor, handleDownEnter, handleUpEnter]
  );

  // memorize
  const style = useMemo<React.CSSProperties>(
    () => ({
      textAlign: element.align,
    }),
    [element.align]
  );

  const menu = useMemo<DropDownProps['menu']>(
    () => ({
      items: [
        element.lock
          ? {
            key: 'unlock',
            label: '解除锁定',
            icon: <UnlockOutlined />,
          }
          : {
            key: 'lock',
            label: '锁定段落',
            icon: <LockOutlined />,
          },
        {
          key: 'up-enter',
          label: '新增上段落',
          icon: <EnterOutlined style={{ transform: 'rotate(90deg)' }} />,
        },
        {
          key: 'down-enter',
          label: '新增下段落',
          icon: <EnterOutlined />,
        },
      ].filter(Boolean as any as ExcludeNullableFunc),
      onClick: handleMenuClick,
    }),
    [element.lock, handleMenuClick]
  );

  // render
  // 只读状态
  if (readOnly) {
    return (
      <p style={style} {...attributes} className={paragraphCore}>
        {children}
      </p>
    );
  }

  // 锁定状态
  if (element.lock) {
    return (
      <Dropdown trigger={trigger} menu={menu}>
        <p
          style={style}
          {...attributes}
          className={classNames(paragraphCore, `${paragraphCore}--locked`)}
          title="该段落已锁定，右键可解除"
          suppressContentEditableWarning={true}
          contentEditable={!selected}
        >
          {children}
        </p>
      </Dropdown>
    );
  }

  // 编辑状态
  return (
    <Dropdown trigger={trigger} menu={menu}>
      <p
        style={style}
        {...attributes}
        className={classNames(paragraphCore, {
          [blockSelected]: selected,
          [`${blockSelected}--blur`]: selected && !focused,
        })}
      >
        {children}
      </p>
    </Dropdown>
  );
}

export default memo(Paragraph);
