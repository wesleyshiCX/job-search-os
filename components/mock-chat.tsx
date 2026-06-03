"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function MockChat({
  jdContext,
  roleTitle,
}: {
  jdContext: string;
  roleTitle: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, jdContext }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages([...allMessages, { role: "assistant", content: assistantContent }]);
      }
    } catch (err) {
      console.error("Stream error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Connection error. Please try again." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  const lastAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant"
      ? messages[messages.length - 1].content
      : "";
  const showCursor = isStreaming && lastAssistant.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mock Interview</h1>
          <p className="text-base text-muted-foreground mt-1.5">
            The interviewer adapts to your answers and pushes deeper.
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {roleTitle}
        </Badge>
      </div>

      <ScrollArea className="h-[55vh] rounded-xl border border-border/60 bg-card p-4">
        <div className="space-y-4">
          {/* Seed message — always shows first */}
          {messages.length === 0 && (
            <Card className="p-4 text-sm bg-muted/30 border-border/40">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Interviewer
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>
                  {`Welcome. Let's run a mock interview for the **${roleTitle}** role.\n\n**Q1:** Tell me about a time you scaled a support org under cost pressure. What did you change, and what was the measurable impact?`}
                </ReactMarkdown>
              </div>
            </Card>
          )}

          {messages.map((m, i) => (
            <Card
              key={i}
              className={`p-4 text-sm ${
                m.role === "assistant"
                  ? "bg-muted/30 border-border/40"
                  : "bg-card border-border/60"
              }`}
            >
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                {m.role === "assistant" ? "Interviewer" : "You"}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </Card>
          ))}

          {isStreaming && lastAssistant.length === 0 && (
            <p className="text-xs text-muted-foreground animate-pulse px-1">
              Interviewer is thinking…
            </p>
          )}

          {showCursor && (
            <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm" />
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form onSubmit={submit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button type="submit" disabled={isStreaming} className="self-end">
          Send
        </Button>
      </form>
    </div>
  );
}
