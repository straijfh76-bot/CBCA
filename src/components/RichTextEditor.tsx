import React, { useRef, useCallback, useEffect } from "react";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Type,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "36"];
const FONT_FAMILIES = [
  { label: "Default", value: "inherit" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
];

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-all text-sm ${
        active
          ? "bg-[#0A2B5E] text-white shadow-inner"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />;
}

export default function RichTextEditor({ value, onChange, placeholder = "Write content here...", minHeight = 280 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
    forceUpdate();
  }, [onChange]);

  const queryState = (cmd: string) => {
    try { return document.queryCommandState(cmd); } catch { return false; }
  };

  const handleInput = useCallback(() => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const handleFontSize = (size: string) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    range.surroundContents(span);
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
    forceUpdate();
  };

  const handleFontFamily = (family: string) => {
    exec("fontName", family);
  };

  const showPlaceholder = !value || value === "<br>" || value === "";

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#1E3A8A] focus-within:border-transparent transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* Text style */}
        <ToolbarButton onClick={() => exec("bold")} active={queryState("bold")} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} active={queryState("italic")} title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} active={queryState("underline")} title="Underline (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Font size */}
        <div className="flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-gray-400" />
          <select
            onMouseDown={e => e.stopPropagation()}
            onChange={e => handleFontSize(e.target.value)}
            defaultValue=""
            className="h-7 px-1 text-xs border border-gray-200 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] cursor-pointer"
          >
            <option value="" disabled>Size</option>
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>

        {/* Font family */}
        <select
          onMouseDown={e => e.stopPropagation()}
          onChange={e => handleFontFamily(e.target.value)}
          defaultValue=""
          className="h-7 px-1 text-xs border border-gray-200 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] cursor-pointer"
        >
          <option value="" disabled>Font</option>
          {FONT_FAMILIES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => exec("justifyLeft")} active={queryState("justifyLeft")} title="Align Left">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("justifyCenter")} active={queryState("justifyCenter")} title="Align Center">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("justifyRight")} active={queryState("justifyRight")} title="Align Right">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => exec("insertUnorderedList")} active={queryState("insertUnorderedList")} title="Bullet List">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} active={queryState("insertOrderedList")} title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editable area */}
      <div className="relative">
        {showPlaceholder && (
          <div className="absolute top-3 left-3.5 text-gray-400 text-sm pointer-events-none select-none leading-relaxed">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyUp={forceUpdate}
          onMouseUp={forceUpdate}
          onSelect={forceUpdate}
          className="w-full px-3.5 py-3 text-sm text-gray-800 leading-relaxed focus:outline-none"
          style={{ minHeight, wordBreak: "break-word" }}
        />
      </div>
    </div>
  );
}
