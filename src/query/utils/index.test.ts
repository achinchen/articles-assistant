import { detectQueryLanguage } from '.'
import { RetrievedChunk } from '@/query/types';
import { DEFAULT_QUERY_CONFIG } from '@/query/constants';

describe('detectQueryLanguage', () => {
  it('should detect Chinese', () => {
    expect(detectQueryLanguage('這是中文問題')).toBe('zh');
    expect(detectQueryLanguage('什麼是 Staff')).toBe('zh');
  });
  
  it('should detect English', () => {
    expect(detectQueryLanguage('What is Staff Engineer?')).toBe('en');
    expect(detectQueryLanguage('How to become a tech lead?')).toBe('en');
  });
  
  it('should handle edge cases', () => {
    expect(detectQueryLanguage('What is 技術?')).toBe('en');
    expect(detectQueryLanguage('Staff?')).toBe('en');
    expect(detectQueryLanguage('什麼？')).toBe('zh');
  });
});