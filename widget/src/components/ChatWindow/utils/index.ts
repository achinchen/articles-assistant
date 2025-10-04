export function parseCitations(text: string): {
    text: string;
    citations: number[];
  } {
    const citations: number[] = [];
    const regex = /\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        citations.push(parseInt(match[1], 10));
    }

    return {
        text,
        citations: Array.from(new Set(citations)).sort((a, b) => a - b),
    };
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}