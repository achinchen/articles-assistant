export const logger = {
    info: (message: string, ...args: any[]) => {
      console.log(`ℹ️  ${message}`, ...args);
    },
    
    success: (message: string, ...args: any[]) => {
      console.log(`✅ ${message}`, ...args);
    },
    
    warn: (message: string, ...args: any[]) => {
      console.warn(`⚠️  ${message}`, ...args);
    },
    
    error: (message: string, ...args: any[]) => {
      console.error(`❌ ${message}`, ...args);
    },
    
    step: (current: number, total: number, message: string) => {
      console.log(`[${current}/${total}] ${message}`);
    },

    print: (message: string, ...args: any[]) => {
      console.log(message, ...args);
    },

    newline: () => {
      console.log('');
    },
    
    section: (title: string) => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`  ${title}`);
      console.log(`${'='.repeat(50)}\n`);
    },

    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🐛 ${message}`, ...args);
      }
    },
  };
  