"use client";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";

export type ScreenplayElementType =
  | "scene_heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "shot"
  | "blank";

const ELEMENT_CYCLE: ScreenplayElementType[] = [
  "scene_heading",
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "transition",
  "shot",
];

export function getLineClasses(type: string): string {
  switch (type) {
    case "scene_heading":
      return "text-[#f0f0f0] font-bold uppercase tracking-wide text-left transition-all duration-500 rounded outline-none";
    case "character":
      return "text-center text-[#e8e8e8] uppercase mt-3 outline-none";
    case "parenthetical":
      return "text-center mx-auto max-w-[240px] text-[#b0b0b0] italic outline-none";
    case "dialogue":
      return "text-center mx-auto max-w-[65%] text-[#d0d0d0] outline-none";
    case "transition":
      return "text-right text-[#e0e0e0] uppercase mt-3 mb-1 outline-none";
    case "shot":
      return "text-left text-[#e0e0e0] uppercase outline-none";
    case "blank":
      return "h-[24px] outline-none";
    default:
      return "text-left text-[#c8c8c8] outline-none min-h-[24px]"; // action
  }
}

export const ScreenplayExtension = Paragraph.extend({
  addAttributes() {
    return {
      type: {
        default: "action",
        parseHTML: (element) => element.getAttribute("data-type") || "action",
        renderHTML: (attributes) => {
          return {
            "data-type": attributes.type,
            class: getLineClasses(attributes.type),
            dir: "auto",
          };
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        const currentNode = $from.node();
        const isAtEnd = $from.parentOffset === currentNode.content.size;

        if (currentNode.type.name !== this.name) return false;

        const type = currentNode.attrs.type || "action";

        let nextType = "action";
        if (type === "scene_heading") nextType = "action";
        else if (type === "action") nextType = "action";
        else if (type === "character") nextType = "dialogue";
        else if (type === "dialogue") nextType = "action"; // usually character or action, standard is action
        else if (type === "parenthetical") nextType = "dialogue";
        else if (type === "transition") nextType = "scene_heading";
        else if (type === "shot") nextType = "action";

        if (isAtEnd) {
          // If the current node is completely empty and we press enter,
          // typically we reset it to action (like breaking out of a list block).
          if (currentNode.content.size === 0 && type !== "action" && type !== "blank") {
            this.editor.commands.updateAttributes(this.name, { type: "action" });
            return true;
          }

          // Insert the new node type below
          this.editor
            .chain()
            .insertContent({
              type: this.name,
              attrs: { type: nextType },
            })
            .focus()
            .run();
          return true;
        }

        // Mid-line split
        this.editor
          .chain()
          .splitBlock()
          .updateAttributes(this.name, { type: nextType })
          .run();
        return true;
      },

      Tab: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;
        const currentNode = $from.node();
        if (currentNode.type.name !== this.name) return false;

        const currentType = currentNode.attrs.type || "action";
        const idx = ELEMENT_CYCLE.indexOf(currentType);
        const nextType = ELEMENT_CYCLE[(idx + 1) % ELEMENT_CYCLE.length] || "action";

        // Celtx allows tabbing anywhere on the line to change its type.
        this.editor.commands.updateAttributes(this.name, { type: nextType });
        return true;
      },

      "Shift-Tab": () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;
        const currentNode = $from.node();
        if (currentNode.type.name !== this.name) return false;

        const currentType = currentNode.attrs.type || "action";
        const idx = ELEMENT_CYCLE.indexOf(currentType);
        const prevType =
          ELEMENT_CYCLE[(idx - 1 + ELEMENT_CYCLE.length) % ELEMENT_CYCLE.length] || "action";

        this.editor.commands.updateAttributes(this.name, { type: prevType });
        return true;
      },

      // Handle element shortcuts (Command+1 to Command+7)
      "Mod-1": () => this.editor.commands.updateAttributes(this.name, { type: "scene_heading" }),
      "Mod-2": () => this.editor.commands.updateAttributes(this.name, { type: "action" }),
      "Mod-3": () => this.editor.commands.updateAttributes(this.name, { type: "character" }),
      "Mod-4": () => this.editor.commands.updateAttributes(this.name, { type: "dialogue" }),
      "Mod-5": () => this.editor.commands.updateAttributes(this.name, { type: "parenthetical" }),
      "Mod-6": () => this.editor.commands.updateAttributes(this.name, { type: "transition" }),
      "Mod-7": () => this.editor.commands.updateAttributes(this.name, { type: "shot" }),
    };
  },
});

interface ScriptEditorProps {
  initialHtml: string;
  onUpdate: (html: string, text: string) => void;
  onActiveElementChange?: (element: ScreenplayElementType) => void;
  editorRef?: React.MutableRefObject<any>;
  scriptId?: number;
}

/**
 * Minimal WebSocket provider that matches ScriptCollabConsumer's raw-bytes relay protocol.
 *
 * Protocol (server-side ScriptCollabConsumer):
 *   - On connect: server sends Y.encode_state_as_update(doc) as raw bytes
 *   - Client → server: raw Y.js update bytes (no framing)
 *   - Server → client: raw Y.js update bytes (broadcast from other clients)
 *
 * This is intentionally simpler than y-websocket's SYNC_STEP1/STEP2 protocol.
 * WebsocketProvider (y-websocket) speaks a different protocol and must NOT be used here.
 */
class ScriptCollabProvider {
  ydoc: Y.Doc;
  ws: WebSocket | null = null;
  connected = false;
  private _destroyed = false;
  private _onUpdate: (update: Uint8Array, origin: unknown) => void;

  constructor(ydoc: Y.Doc, wsUrl: string) {
    this.ydoc = ydoc;

    // Forward local Y.js updates to server (skip updates that came from the server itself)
    this._onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === this || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.ws.send(update);
    };
    ydoc.on("update", this._onUpdate);

    this._connect(wsUrl);
  }

  private _connect(wsUrl: string) {
    if (this._destroyed) return;
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      const update = new Uint8Array(event.data as ArrayBuffer);
      // Apply remote update, marking origin as `this` so our onUpdate handler ignores it
      Y.applyUpdate(this.ydoc, update, this);
    };

    this.ws.onclose = () => {
      this.connected = false;
      // Reconnect after 3 s (unless destroyed)
      if (!this._destroyed) setTimeout(() => this._connect(wsUrl), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  destroy() {
    this._destroyed = true;
    this.ydoc.off("update", this._onUpdate);
    this.ws?.close();
    this.ws = null;
  }
}

function createCollabSetup(scriptId: number) {
  if (typeof window === "undefined") return null;
  const ydoc = new Y.Doc();
  const token = localStorage.getItem("accessToken");
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const wsBase = apiBase.replace(/^http/, "ws");
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
  const wsUrl = `${wsBase}/ws/script_collab/${scriptId}/${tokenParam}`;
  const provider = new ScriptCollabProvider(ydoc, wsUrl);
  return { ydoc, provider };
}

export const ScriptEditor = ({
  initialHtml,
  onUpdate,
  onActiveElementChange,
  editorRef,
  scriptId,
}: ScriptEditorProps) => {
  // Create Y.Doc and provider once on mount (lazy useState, so it's ready before useEditor)
  const [collab] = useState<{ ydoc: Y.Doc; provider: ScriptCollabProvider } | null>(
    () => (scriptId ? createCollabSetup(scriptId) : null)
  );
  const [collabConnected, setCollabConnected] = useState(false);

  // Poll connection status and handle cleanup
  useEffect(() => {
    if (!collab) return;
    const { provider } = collab;

    const interval = setInterval(() => {
      setCollabConnected(provider.connected);
    }, 1000);

    return () => {
      clearInterval(interval);
      provider.destroy();
      collab.ydoc.destroy();
    };
  }, [collab]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable history — Y.js manages undo/redo when Collaboration is active
        history: collab ? false : undefined,
        paragraph: false,
      }),
      ScreenplayExtension,
      // Bind the Y.js doc to Tiptap so all edits go through the CRDT.
      // When no collab session (no scriptId), fall back to initialHtml content.
      ...(collab
        ? [Collaboration.configure({ document: collab.ydoc })]
        : []),
    ],
    // content is only used when Collaboration extension is absent (no scriptId).
    // When Collaboration is active, content comes from the Y.js doc instead.
    content: collab ? undefined : initialHtml,
    editorProps: {
      attributes: {
        class:
          "font-[Courier_Prime,Courier_New,monospace] text-[12.5px] leading-[24px] min-h-[60vh] cursor-text px-16 py-12 focus:outline-none",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML(), editor.getText({ blockSeparator: "\n" }));
    },
    onSelectionUpdate: ({ editor }) => {
      const { selection } = editor.state;
      const node = selection.$anchor.node();
      if (node && node.type.name === "paragraph" && onActiveElementChange) {
        onActiveElementChange(node.attrs.type as ScreenplayElementType);
      }
    },
  });

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  return (
    <div className="relative">
      {/* Live sync status indicator */}
      {collab && (
        <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${collabConnected ? "bg-emerald-400" : "bg-gray-500"}`}
            title={collabConnected ? "Live sync active" : "Connecting…"}
          />
          <span className="text-[10px] text-gray-500">
            {collabConnected ? "Live" : "Syncing…"}
          </span>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
