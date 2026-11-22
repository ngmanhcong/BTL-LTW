import React, { useEffect, useMemo, useState } from 'react';
import Markdown from 'markdown-to-jsx/react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-typescript';
import { FiCheck, FiCopy } from 'react-icons/fi';
import styles from './guideContent.module.css';

Prism.manual = true;
const aliases = {
  'c++': 'cpp',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  html: 'markup',
  xml: 'markup',
};
function textOf(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textOf).join('');
  return React.isValidElement(value) ? textOf(value.props.children) : '';
}
function renderTokens(tokens) {
  if (typeof tokens === 'string') return tokens;
  if (Array.isArray(tokens))
    return tokens.map((token, index) => (
      <React.Fragment key={index}>{renderTokens(token)}</React.Fragment>
    ));
  return (
    <span className={styles[tokens.type] || styles.token}>{renderTokens(tokens.content)}</span>
  );
}
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const previous = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(field);
  try {
    field.select();
    if (!document.execCommand('copy')) throw new Error('Copy unavailable');
  } finally {
    field.remove();
    previous?.focus?.();
  }
}
function CodeBlock({ children }) {
  const child = React.Children.toArray(children).find(React.isValidElement);
  const code = textOf(children);
  const requested =
    child?.props?.className?.match(/(?:language|lang)-([^\s]+)/)?.[1]?.toLowerCase() || 'text';
  const language = aliases[requested] || requested;
  const grammar = Object.prototype.hasOwnProperty.call(Prism.languages, language)
    ? Prism.languages[language]
    : null;
  const highlighted = useMemo(
    () => (grammar ? renderTokens(Prism.tokenize(code, grammar)) : code),
    [code, grammar]
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span>{requested.replace(/[^a-z0-9+#.-]/g, '').slice(0, 24) || 'text'}</span>
        <button
          type="button"
          aria-label={copied ? 'Đã sao chép mã' : 'Sao chép mã'}
          title={copied ? 'Đã sao chép' : 'Sao chép mã'}
          onClick={async () => {
            setError(false);
            try {
              await copyText(code);
              setCopied(true);
            } catch {
              setError(true);
            }
          }}
        >
          {copied ? <FiCheck /> : <FiCopy />}
          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre tabIndex={0} aria-label={`Mã ${requested}`}>
        <code>{highlighted}</code>
      </pre>
      {error && (
        <p className={styles.copyError} role="alert">
          Chưa sao chép được. Bạn có thể chọn mã và sao chép thủ công.
        </p>
      )}
    </div>
  );
}
function SafeLink({ href, children }) {
  if (!/^https?:\/\//i.test(href || '')) return <span>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
const options = {
  forceBlock: true,
  disableParsingRawHTML: true,
  evalUnserializableExpressions: false,
  overrides: {
    pre: { component: CodeBlock },
    a: { component: SafeLink },
    img: { component: ({ alt }) => <span>{alt || ''}</span> },
    table: {
      component: ({ children }) => (
        <div className={styles.tableScroll}>
          <table>{children}</table>
        </div>
      ),
    },
  },
};
export default function GuideContent({ content = '', compact = false }) {
  return (
    <div className={`${styles.prose} ${compact ? styles.compact : ''}`}>
      <Markdown options={options}>{content}</Markdown>
    </div>
  );
}
