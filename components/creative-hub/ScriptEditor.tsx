"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import { WebsocketProvider } from "y-websocket";
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

// Random colour for this client's cursor
const USER_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16",
];
function pickColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return USER_COLORS[h % USER_COLORS.length];
}

interface ConnectedUser {
  clientId: number;
  name: string;
  color: string;
}

interface ScriptEditorProps {
  initialHtml: string;
  onUpdate: (html: string, text: string) => void;
  onActiveElementChange?: (element: ScreenplayElementType) => void;
  editorRef?: React.MutableRefObject<any>;
  scriptId?: number;
}

function createCollabSetup(scriptId: number) {
  if (typeof window === "undefined") return null;
  const ydoc = new Y.Doc();
  const token = localStorage.getItem("accessToken");
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const wsBase = apiBase.replace(/^http/, "ws");
  const wsUrl = `${wsBase}/ws/script_collab/${scriptId}/`;
  const provider = new WebsocketProvider(wsUrl, `script-${scriptId}`, ydoc, {
    params: token ? { token } : {},
  });
  const username = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").name || "Collaborator"; }
    catch { return "Collaborator"; }
  })();
  provider.awareness.setLocalStateField("user", { name: username, color: pickColor(username) });
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
  const [collab] = useState<{ ydoc: Y.Doc; provider: WebsocketProvider } | null>(
    () => (scriptId ? createCollabSetup(scriptId) : null)
  );
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [collabConnected, setCollabConnected] = useState(false);

  // Attach awareness listeners and handle cleanup
  useEffect(() => {
    if (!collab) return;
    const { provider } = collab;

    const onStatus = ({ status }: { status: string }) => setCollabConnected(status === "connected");
    provider.on("status", onStatus);

    const onAwareness = () => {
      const users: ConnectedUser[] = [];
      provider.awareness.getStates().forEach((state: any, clientId: number) => {
        if (state.user) users.push({ clientId, name: state.user.name, color: state.user.color });
      });
      setConnectedUsers(users);
    };
    provider.awareness.on("change", onAwareness);

    return () => {
      provider.off("status", onStatus);
      provider.awareness.off("change", onAwareness);
      provider.destroy();
      collab.ydoc.destroy();
    };
  }, [collab]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        paragraph: false,
      }),
      ScreenplayExtension,
    ],
    content: initialHtml,
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
      {/* Connected users indicator */}
      {collab && connectedUsers.length > 0 && (
        <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${collabConnected ? "bg-emerald-400" : "bg-gray-500"}`}
            title={collabConnected ? "Live sync active" : "Connecting…"}
          />
          <div className="flex -space-x-1.5">
            {connectedUsers.slice(0, 5).map((u) => (
              <div
                key={u.clientId}
                title={u.name}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0e0e0e] select-none"
                style={{ backgroundColor: u.color }}
              >
                {u.name[0]?.toUpperCase()}
              </div>
            ))}
            {connectedUsers.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center text-[10px] text-gray-400 border-2 border-[#0e0e0e]">
                +{connectedUsers.length - 5}
              </div>
            )}
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
