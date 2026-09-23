export default function TypingIndicator() {
  return (
    <div
      className="flex max-w-[85%] flex-col items-start self-start"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 rounded-[15px] rounded-bl-sm bg-card px-3.5 py-3 shadow-sm">
        <span className="sr-only">Бот печатает сообщение</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
