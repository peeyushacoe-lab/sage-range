"use client";

// Wraps assessed content (lab tasks, quiz questions, knowledge checks) to
// deter copying question text into an external LLM. Blocks selection, copy/cut,
// right-click, and drag. Form controls stay fully usable — the .no-copy CSS
// re-enables selection for them, and the handlers below ignore events
// originating inside an input/textarea so typing and pasting answers still work.
//
// This is a deterrent, not a security control: page source, devtools, and
// screenshots remain available to anyone who wants them.

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
}

export function NoCopy({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const block = (e: React.SyntheticEvent) => {
    if (isFormField(e.target)) return;
    e.preventDefault();
  };

  return (
    <div
      className={`no-copy ${className}`}
      onCopy={block}
      onCut={block}
      onContextMenu={block}
      onDragStart={block}
    >
      {children}
    </div>
  );
}
