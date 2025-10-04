export default function TypingIndicator() {
    return (
      <div className="flex justify-start animate-fade-in">
        <div className="bg-white shadow-sm rounded-2xl px-5 py-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-0" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-150" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-300" />
          </div>
        </div>
      </div>
    );
  }